import {
  AttendanceSettings,
  ComputedDayInfo,
  DayRecord,
  LeaveBalanceSummary,
  MonthlyStats,
} from '../types/attendance'
import {
  getWeekStartKey,
  minutesToHHmm,
  parseDateKey,
  timeToMinutes,
} from './date'

/** 计算单日应下班时间（支持弹性、固定班制以及半天假） */
export function computeExpectedClockOut(
  record: DayRecord | undefined,
  settings: AttendanceSettings
): string | null {
  if (
    !record ||
    (record.type !== 'work' && record.type !== 'half_leave') ||
    !record.clockIn
  ) {
    return null
  }
  if (settings.workMode === 'fixed' && record.type === 'work') {
    return settings.standardEndTime
  }
  const startMin = timeToMinutes(record.clockIn)
  const targetWorkMin =
    record.type === 'half_leave'
      ? Math.round(settings.standardWorkMinutes / 2)
      : settings.standardWorkMinutes
  // 半天假默认不强制加完整午休，仅全天出勤加午休
  const breakMin = record.type === 'half_leave' ? 0 : settings.lunchBreakMinutes
  return minutesToHHmm(startMin + targetWorkMin + breakMin)
}

/** 计算单日净工时（自动兼容跨夜下班，智能扣除午休） */
export function computeActualWorkMinutes(
  clockIn: string,
  clockOut: string,
  lunchBreakMinutes: number,
  isHalfDay = false
): number {
  const inMin = timeToMinutes(clockIn)
  let outMin = timeToMinutes(clockOut)
  if (outMin < inMin) {
    outMin += 1440
  }
  const gross = outMin - inMin
  // 半天假若实际跨度大于标准工时的一半+午休才扣午休，否则不扣
  const effectiveBreak = isHalfDay ? 0 : lunchBreakMinutes
  const deduct = gross > effectiveBreak ? effectiveBreak : 0
  return Math.max(0, gross - deduct)
}

/**
 * 核心规则引擎：对所有历史记录按自然周进行扫描，
 * 自动推断每日属于「正常单/双休」「动用存档假」「半天假」「法定节假日」或「加班攒假」。
 */
export function computeAllDays(
  recordsMap: Record<string, DayRecord>,
  settings: AttendanceSettings
): {
  dayMap: Record<string, ComputedDayInfo>
  leaveBalance: LeaveBalanceSummary
} {
  const quotaPerWeek = settings.restPolicy === 'single' ? 1 : 2
  const policyLabel = settings.restPolicy === 'single' ? '单休' : '双休'

  const weekGroups: Record<string, DayRecord[]> = {}
  const sortedDates = Object.keys(recordsMap).sort()

  for (const dateKey of sortedDates) {
    const rec = recordsMap[dateKey]
    const weekKey = getWeekStartKey(dateKey)
    if (!weekGroups[weekKey]) weekGroups[weekKey] = []
    weekGroups[weekKey].push(rec)
  }

  const dayMap: Record<string, ComputedDayInfo> = {}
  let accruedDays = 0
  let usedDays = 0
  let totalNetOvertimeMinutes = 0

  for (const weekKey of Object.keys(weekGroups).sort()) {
    const weekRecords = weekGroups[weekKey].sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    let usedNormalQuota = 0
    const workCountInWeek = weekRecords.filter((r) => r.type === 'work').length

    for (const rec of weekRecords) {
      const weekday = parseDateKey(rec.date).getDay()
      const isFixedRestDay = settings.fixedRestDays.includes(weekday)

      if (rec.type === 'holiday') {
        dayMap[rec.date] = {
          date: rec.date,
          record: rec,
          status: 'holiday',
          expectedClockOut: null,
          actualWorkMinutes: null,
          overtimeMinutes: null,
          lateMinutes: 0,
          accruedLeave: false,
          usedLeaveDays: 0,
          reason: '法定节假日，不扣存档假且不占本周休息配额',
        }
        continue
      }

      if (rec.type === 'rest') {
        let isNormalRest = false
        let reason = ''

        if (settings.restMode === 'fixed_days') {
          if (isFixedRestDay) {
            isNormalRest = true
            reason = `符合固定${policyLabel}日，正常休息不扣假`
          } else {
            isNormalRest = false
            reason = `非固定休息日休息，自动扣减 1 天存档假`
          }
        } else {
          if (usedNormalQuota < quotaPerWeek) {
            isNormalRest = true
            usedNormalQuota += 1
            reason = `本周第 ${usedNormalQuota}/${quotaPerWeek} 天正常${policyLabel}，不扣假`
          } else {
            isNormalRest = false
            reason = `已超出本周 ${quotaPerWeek} 天${policyLabel}配额，自动扣减 1 天存档假`
          }
        }

        const dayUsed = isNormalRest ? 0 : 1
        usedDays += dayUsed

        dayMap[rec.date] = {
          date: rec.date,
          record: rec,
          status: isNormalRest ? 'normal_rest' : 'archive_leave',
          expectedClockOut: null,
          actualWorkMinutes: null,
          overtimeMinutes: null,
          lateMinutes: 0,
          accruedLeave: false,
          usedLeaveDays: dayUsed,
          reason,
        }
        continue
      }

      if (rec.type === 'half_leave') {
        const expectedClockOut = computeExpectedClockOut(rec, settings)
        let actualWorkMinutes: number | null = null
        let overtimeMinutes: number | null = null
        const halfStandard = Math.round(settings.standardWorkMinutes / 2)

        if (rec.clockIn && rec.clockOut) {
          actualWorkMinutes = computeActualWorkMinutes(
            rec.clockIn,
            rec.clockOut,
            settings.lunchBreakMinutes,
            true
          )
          overtimeMinutes = actualWorkMinutes - halfStandard
          totalNetOvertimeMinutes += overtimeMinutes
        }

        usedDays += 0.5
        dayMap[rec.date] = {
          date: rec.date,
          record: rec,
          status: 'half_leave',
          expectedClockOut,
          actualWorkMinutes,
          overtimeMinutes,
          lateMinutes: 0,
          accruedLeave: false,
          usedLeaveDays: 0.5,
          reason: '半天假：扣减 0.5 天存档假，另半天可正常记录工时',
        }
        continue
      }

      // 正常出勤日 (work)
      const expectedClockOut = computeExpectedClockOut(rec, settings)
      let actualWorkMinutes: number | null = null
      let overtimeMinutes: number | null = null
      let lateMinutes = 0

      if (rec.clockIn && settings.workMode === 'fixed') {
        const diff =
          timeToMinutes(rec.clockIn) - timeToMinutes(settings.standardStartTime)
        if (diff > 0) lateMinutes = diff
      }

      if (rec.clockIn && rec.clockOut) {
        actualWorkMinutes = computeActualWorkMinutes(
          rec.clockIn,
          rec.clockOut,
          settings.lunchBreakMinutes
        )
        overtimeMinutes = actualWorkMinutes - settings.standardWorkMinutes
        totalNetOvertimeMinutes += overtimeMinutes
      }

      let accruedLeave = false
      let reason = rec.clockOut ? '已完成当日出勤' : '正在工作中'

      if (settings.autoAccrueLeave && rec.clockIn) {
        if (settings.restMode === 'fixed_days' && isFixedRestDay) {
          accruedLeave = true
          accruedDays += 1
          reason = '固定休息日出勤，自动攒入 +1 天存档假'
        } else if (
          settings.restMode === 'quota' &&
          workCountInWeek === 7 &&
          rec.date === weekRecords[weekRecords.length - 1].date
        ) {
          accruedLeave = true
          accruedDays += 1
          reason = '本周满勤 7 天未休，自动攒入 +1 天存档假'
        }
      }

      dayMap[rec.date] = {
        date: rec.date,
        record: rec,
        status: rec.clockOut ? 'completed' : 'working',
        expectedClockOut,
        actualWorkMinutes,
        overtimeMinutes,
        lateMinutes,
        accruedLeave,
        usedLeaveDays: 0,
        reason,
      }
    }
  }

  // 若开启「平日累计加班折算存档假」，满 1 个标准工作日折算 +1 天
  const convertedOvertimeDays =
    settings.autoConvertOvertimeToLeave && totalNetOvertimeMinutes > 0
      ? Math.floor(totalNetOvertimeMinutes / settings.standardWorkMinutes)
      : 0

  return {
    dayMap,
    leaveBalance: {
      initialDays: settings.initialLeaveDays,
      accruedDays,
      convertedOvertimeDays,
      usedDays,
      remainingDays:
        settings.initialLeaveDays +
        accruedDays +
        convertedOvertimeDays -
        usedDays,
    },
  }
}

/** 计算指定年月的月度统计 */
export function computeMonthlyStats(
  year: number,
  month: number,
  dayMap: Record<string, ComputedDayInfo>
): MonthlyStats {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  let workDays = 0
  let normalRestDays = 0
  let archiveLeaveDays = 0
  let holidayDays = 0
  let accruedLeaveDays = 0
  let missingClockOutDays = 0
  let totalWorkMinutes = 0
  let netOvertimeMinutes = 0
  let completedWorkDays = 0

  for (const dateKey of Object.keys(dayMap)) {
    if (!dateKey.startsWith(prefix)) continue
    const info = dayMap[dateKey]

    if (info.status === 'completed' || info.status === 'working') {
      workDays += 1
      if (info.status === 'working') {
        missingClockOutDays += 1
      }
      if (info.actualWorkMinutes !== null) {
        totalWorkMinutes += info.actualWorkMinutes
        completedWorkDays += 1
      }
      if (info.overtimeMinutes !== null) {
        netOvertimeMinutes += info.overtimeMinutes
      }
    } else if (info.status === 'normal_rest') {
      normalRestDays += 1
    } else if (info.status === 'archive_leave') {
      archiveLeaveDays += 1
    } else if (info.status === 'half_leave') {
      workDays += 0.5
      archiveLeaveDays += 0.5
      if (info.actualWorkMinutes !== null) {
        totalWorkMinutes += info.actualWorkMinutes
      }
      if (info.overtimeMinutes !== null) {
        netOvertimeMinutes += info.overtimeMinutes
      }
    } else if (info.status === 'holiday') {
      holidayDays += 1
    }

    if (info.accruedLeave) {
      accruedLeaveDays += 1
    }
  }

  return {
    year,
    month,
    workDays,
    normalRestDays,
    archiveLeaveDays,
    holidayDays,
    accruedLeaveDays,
    missingClockOutDays,
    totalWorkMinutes,
    avgWorkMinutes:
      completedWorkDays > 0 ? Math.round(totalWorkMinutes / completedWorkDays) : 0,
    netOvertimeMinutes,
  }
}
