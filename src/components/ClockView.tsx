import React, { useEffect, useState } from 'react'
import { LogIn, LogOut, Coffee, Edit3 } from 'lucide-react'
import {
  AttendanceSettings,
  ComputedDayInfo,
  LeaveBalanceSummary,
  MonthlyStats,
} from '../types/attendance'
import {
  formatDuration,
  formatTimeHHmmss,
  getChineseWeekday,
  timeToMinutes,
} from '../utils/date'

interface ClockViewProps {
  todayKey: string
  todayInfo?: ComputedDayInfo
  settings: AttendanceSettings
  leaveBalance: LeaveBalanceSummary
  monthlyStats: MonthlyStats
  onClockIn: () => void
  onClockOut: () => void
  onRest: () => void
  onEditToday: () => void
}

/** 今日单手打卡主界面（Achromatic Ledger 无彩账本风格） */
export const ClockView: React.FC<ClockViewProps> = ({
  todayKey,
  todayInfo,
  settings,
  leaveBalance,
  monthlyStats,
  onClockIn,
  onClockOut,
  onRest,
  onEditToday,
}) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const rec = todayInfo?.record
  const status = todayInfo?.status ?? 'none'
  const hasClockIn = Boolean(rec?.clockIn && (rec.type === 'work' || rec.type === 'half_leave'))
  const hasClockOut = Boolean(rec?.clockOut && (rec.type === 'work' || rec.type === 'half_leave'))

  // 计算实时工作进度（用于签名元素：今日班次时间尺）
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let progressPct = 0
  let overtimePct = 0
  let liveHint = ''

  if (hasClockIn && rec?.clockIn && todayInfo?.expectedClockOut) {
    const startMin = timeToMinutes(rec.clockIn)
    let expectedMin = timeToMinutes(todayInfo.expectedClockOut)
    if (expectedMin <= startMin) expectedMin += 1440

    const endMin = hasClockOut && rec.clockOut ? timeToMinutes(rec.clockOut) : nowMin
    const adjustedEnd = endMin < startMin ? endMin + 1440 : endMin
    const totalTarget = Math.max(1, expectedMin - startMin)
    const elapsed = Math.max(0, adjustedEnd - startMin)

    progressPct = Math.min(100, (elapsed / totalTarget) * 100)
    if (elapsed > totalTarget) {
      overtimePct = Math.min(25, ((elapsed - totalTarget) / totalTarget) * 100)
    }

    if (!hasClockOut) {
      const diff = expectedMin - adjustedEnd
      if (diff > 0) {
        liveHint = `距应下班还有 ${formatDuration(diff)}`
      } else if (diff === 0) {
        liveHint = '已到应下班时间'
      } else {
        liveHint = `已超标准工时 ${formatDuration(Math.abs(diff))}`
      }
    }
  }

  // 状态胶囊配置（严格克制：仅信号胶囊使用浅色底）
  const statusBadge = (() => {
    switch (status) {
      case 'working':
        return {
          text: '工作中',
          cls: 'bg-[#eeeeee] text-[#0a0a0a]',
        }
      case 'completed':
        return {
          text: '已下班',
          cls: 'bg-[#dcfae5] text-[#04250e]',
        }
      case 'normal_rest':
        return {
          text: settings.restPolicy === 'single' ? '正常单休' : '正常双休',
          cls: 'bg-[#eeeeee] text-[#3d3d3d]',
        }
      case 'archive_leave':
        return {
          text: '动用存档假 -1天',
          cls: 'bg-[#ffedea] text-[#831c1e]',
        }
      case 'half_leave':
        return {
          text: '半天假 -0.5天',
          cls: 'bg-[#fffbeb] text-[#92400e]',
        }
      case 'holiday':
        return {
          text: '法定节假日',
          cls: 'bg-[#dcfae5] text-[#04250e]',
        }
      default:
        return {
          text: '今日未打卡',
          cls: 'bg-[#eeeeee] text-[#6b6b6b]',
        }
    }
  })()

  // 主操作动态优先级：未上班时“上班”为近黑主按钮；工作中时“下班”为近黑主按钮
  const isClockInPrimary =
    !hasClockIn &&
    status !== 'normal_rest' &&
    status !== 'archive_leave' &&
    status !== 'holiday'
  const isClockOutPrimary = hasClockIn && !hasClockOut

  return (
    <div className="flex flex-1 flex-col justify-between px-4 pt-2 pb-4">
      {/* 顶部账本抬头 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* 极简账本时钟标识 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 text-[#0a0a0a]"
              aria-hidden="true"
            >
              <rect
                x="2.5"
                y="2.5"
                width="19"
                height="19"
                rx="5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M12 7.5V12L15.2 14"
                stroke="#1d5fbf"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-[#0a0a0a]">
                  轻打卡
                </span>
                <span className="rounded bg-[#eeeeee] px-1.5 py-0.5 text-[11px] font-medium text-[#3d3d3d]">
                  {settings.restPolicy === 'single' ? '单休' : '双休'} ·{' '}
                  {settings.workMode === 'flexible' ? '弹性' : '固定'}
                </span>
              </div>
              <div className="text-xs text-[#6b6b6b] font-mono-num">
                {todayKey} {getChineseWeekday(todayKey)}
              </div>
            </div>
          </div>

          {/* 剩余存档假账本读数 */}
          <div className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-1.5 text-right">
            <div className="text-[11px] text-[#6b6b6b]">剩余存档假</div>
            <div
              className={`text-sm font-semibold font-mono-num ${
                leaveBalance.remainingDays < 0
                  ? 'text-[#c4242a]'
                  : 'text-[#0a0a0a]'
              }`}
            >
              {leaveBalance.remainingDays} 天
            </div>
          </div>
        </div>

        {/* 核心账本卡片（纯白 1px 细边框，无阴影） */}
        <div className="rounded-lg border border-[#e6e6e6] bg-white p-4">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex h-6 items-center rounded px-2 text-xs font-medium ${statusBadge.cls}`}
            >
              {statusBadge.text}
            </span>
            <button
              type="button"
              onClick={onEditToday}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#6b6b6b] active:bg-[#eeeeee]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              微调 / 节假日
            </button>
          </div>

          {/* 沉稳 36px 等宽数字时钟 */}
          <div className="mt-4 mb-3">
            <div className="text-[36px] leading-none font-medium tracking-tight text-[#0a0a0a] font-mono-num">
              {formatTimeHHmmss(now)}
            </div>
            <p className="mt-2 min-h-[18px] text-xs text-[#6b6b6b]">
              {status === 'working' && liveHint
                ? liveHint
                : todayInfo && todayInfo.status !== 'none'
                  ? todayInfo.reason
                  : '点下方按钮完成今日打卡，系统自动算账'}
            </p>
          </div>

          {/* 专属签名元素：今日班次时间尺 */}
          <div className="mb-4 rounded-md border border-[#f0f0f0] bg-[#f8f8f8] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#6b6b6b]">
              <span>今日班次时间尺</span>
              <span className="font-mono-num">
                {hasClockIn && rec?.clockIn
                  ? `${rec.clockIn} → ${todayInfo?.expectedClockOut ?? '--:--'}`
                  : `标准净工时 ${(settings.standardWorkMinutes / 60).toFixed(1)}h`}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e6e6e6]">
              {/* 主进度填充（唯一强调色 #1d5fbf） */}
              <div
                className="h-full bg-[#1d5fbf] transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
              {/* 加班延伸部分 */}
              {overtimePct > 0 && (
                <div
                  className="absolute top-0 right-0 h-full bg-[#2e7d32]"
                  style={{ width: `${overtimePct}%` }}
                />
              )}
            </div>
          </div>

          {/* 三栏对齐账本数据：上班 / 应下班 / 净工时 */}
          <div className="grid grid-cols-3 border-t border-[#f0f0f0] pt-3">
            <div>
              <div className="text-xs text-[#6b6b6b]">上班</div>
              <div className="mt-1 text-lg font-medium text-[#0a0a0a] font-mono-num">
                {hasClockIn && rec?.clockIn ? rec.clockIn : '--:--'}
              </div>
              {todayInfo && todayInfo.lateMinutes > 0 && (
                <div className="text-[11px] text-[#92400e]">
                  迟到 {todayInfo.lateMinutes}分
                </div>
              )}
            </div>

            <div className="border-x border-[#f0f0f0] px-3">
              <div className="text-xs text-[#6b6b6b]">应下班</div>
              <div className="mt-1 text-lg font-medium text-[#1d5fbf] font-mono-num">
                {todayInfo?.expectedClockOut ?? '--:--'}
              </div>
              {hasClockOut && rec?.clockOut && (
                <div className="text-[11px] text-[#6b6b6b] font-mono-num">
                  实际 {rec.clockOut}
                </div>
              )}
            </div>

            <div className="pl-3 text-right">
              <div className="text-xs text-[#6b6b6b]">净工时</div>
              <div className="mt-1 text-lg font-medium text-[#0a0a0a] font-mono-num">
                {todayInfo?.actualWorkMinutes !== null &&
                todayInfo?.actualWorkMinutes !== undefined
                  ? `${(todayInfo.actualWorkMinutes / 60).toFixed(1)}h`
                  : '—'}
              </div>
              {todayInfo?.overtimeMinutes !== null &&
                todayInfo?.overtimeMinutes !== undefined && (
                  <div
                    className={`text-[11px] font-mono-num ${
                      todayInfo.overtimeMinutes > 0
                        ? 'text-[#2e7d32]'
                        : todayInfo.overtimeMinutes < 0
                          ? 'text-[#92400e]'
                          : 'text-[#6b6b6b]'
                    }`}
                  >
                    {formatDuration(todayInfo.overtimeMinutes, true)}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* 本月简报条（1px 边框纯白行） */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[#e6e6e6] bg-white px-3.5 py-2.5 text-xs text-[#6b6b6b]">
          <span>
            本月出勤{' '}
            <strong className="font-medium text-[#0a0a0a] font-mono-num">
              {monthlyStats.workDays}
            </strong>{' '}
            天
          </span>
          <span>
            累计{' '}
            <strong className="font-medium text-[#0a0a0a] font-mono-num">
              {(monthlyStats.totalWorkMinutes / 60).toFixed(1)}h
            </strong>
          </span>
          <span className="font-mono-num">
            休 {monthlyStats.normalRestDays} · 假 {monthlyStats.archiveLeaveDays}
          </span>
        </div>
      </div>

      {/* 拇指热区：三个大圆角打卡按钮（近黑主操作 + 中性灰次操作） */}
      <div className="mt-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClockIn}
            className={`flex min-h-[84px] flex-col items-center justify-center rounded-xl border px-3 py-4 transition active:scale-[0.98] ${
              isClockInPrimary
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#eeeeee] text-[#0a0a0a]'
            }`}
          >
            <LogIn className="mb-1.5 h-5 w-5" />
            <span className="text-base font-semibold">上班</span>
            <span
              className={`mt-0.5 text-[11px] font-mono-num ${
                isClockInPrimary ? 'text-white/75' : 'text-[#6b6b6b]'
              }`}
            >
              {hasClockIn && rec?.clockIn ? `已记 ${rec.clockIn}` : '记录当前时间'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClockOut}
            className={`flex min-h-[84px] flex-col items-center justify-center rounded-xl border px-3 py-4 transition active:scale-[0.98] ${
              isClockOutPrimary
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#eeeeee] text-[#0a0a0a]'
            }`}
          >
            <LogOut className="mb-1.5 h-5 w-5" />
            <span className="text-base font-semibold">下班</span>
            <span
              className={`mt-0.5 text-[11px] font-mono-num ${
                isClockOutPrimary ? 'text-white/75' : 'text-[#6b6b6b]'
              }`}
            >
              {hasClockOut && rec?.clockOut ? `已记 ${rec.clockOut}` : '自动结算工时'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRest}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition active:scale-[0.99] ${
            rec?.type === 'rest'
              ? 'border-[#141414] bg-white text-[#0a0a0a]'
              : 'border-[#d4d4d4] bg-white text-[#0a0a0a]'
          }`}
        >
          <Coffee className="h-4 w-4 text-[#6b6b6b]" />
          <span>休息</span>
          <span className="text-xs font-normal text-[#6b6b6b]">
            {rec?.type === 'rest'
              ? status === 'archive_leave'
                ? '· 已判动用存档假 -1天'
                : '· 已判正常休息'
              : '· 自动判断正常休或扣存档假'}
          </span>
        </button>
      </div>
    </div>
  )
}
