import { AttendanceSettings, DayRecord } from '../types/attendance'
import { formatDateKey } from './date'

const SETTINGS_KEY = 'vibelex_attendance_settings_v1'
const RECORDS_KEY = 'vibelex_attendance_records_v1'

/** 默认考勤与休假规则（单休 + 弹性打卡，可在设置页自由切换单双休） */
export const DEFAULT_SETTINGS: AttendanceSettings = {
  workMode: 'flexible',
  standardStartTime: '09:00',
  standardEndTime: '18:00',
  standardWorkMinutes: 480, // 8 小时
  lunchBreakMinutes: 60, // 1 小时午休
  restPolicy: 'single', // 默认单休，可随时切换双休
  restMode: 'quota', // 默认灵活每周配额
  fixedRestDays: [0], // 固定休息日模式下默认周日
  initialLeaveDays: 0, // 默认初始存档假 0 天
  autoAccrueLeave: true, // 默认休息日出勤自动攒假
  autoConvertOvertimeToLeave: false, // 平日加班累计满标准工时折算存档假（默认关闭，按需开启）
}

/** 读取本地设置 */
export function loadSettings(): AttendanceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** 保存本地设置 */
export function saveSettings(settings: AttendanceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/** 读取所有每日打卡记录 */
export function loadRecords(): Record<string, DayRecord> {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/** 保存所有每日打卡记录 */
export function saveRecords(records: Record<string, DayRecord>): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

/** 导出全部数据为 JSON 字符串 */
export function exportBackupJson(
  settings: AttendanceSettings,
  records: Record<string, DayRecord>
): string {
  return JSON.stringify(
    {
      app: '轻打卡',
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      records,
    },
    null,
    2
  )
}

/** 解析并校验导入的 JSON 备份 */
export function parseBackupJson(jsonText: string): {
  settings: AttendanceSettings
  records: Record<string, DayRecord>
} {
  const data = JSON.parse(jsonText)
  if (!data || typeof data !== 'object' || !data.records) {
    throw new Error('备份文件格式无效，缺少 records 字段')
  }
  const settings: AttendanceSettings = {
    ...DEFAULT_SETTINGS,
    ...(data.settings || {}),
  }
  const records: Record<string, DayRecord> = {}
  for (const [k, v] of Object.entries(data.records)) {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(k) &&
      v &&
      typeof v === 'object' &&
      'type' in v
    ) {
      records[k] = v as DayRecord
    }
  }
  return { settings, records }
}

/** 生成本月截止昨日的演示数据（便于初次体验月历、工时柱状图与存档假自动推断） */
export function generateDemoRecordsForCurrentMonth(): Record<string, DayRecord> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayDay = now.getDate()
  const demo: Record<string, DayRecord> = {}

  for (let d = 1; d < todayDay; d++) {
    const dt = new Date(year, month, d)
    const key = formatDateKey(dt)
    const weekday = dt.getDay()

    // 模拟 1 天半天假、1 天额外调休，其余周日正常休
    if (weekday === 0 || (d <= 7 && weekday === 3)) {
      demo[key] = {
        date: key,
        type: 'rest',
        clockIn: null,
        clockOut: null,
        note: d <= 7 && weekday === 3 ? '临时调休' : undefined,
        updatedAt: Date.now(),
      }
    } else if (d > 7 && d <= 14 && weekday === 5) {
      demo[key] = {
        date: key,
        type: 'half_leave',
        clockIn: '13:30',
        clockOut: '17:45',
        note: '上午办事半天假',
        updatedAt: Date.now(),
      }
    } else {
      const inMin = 9 * 60 + ((d * 7) % 25)
      const workLen = 8 * 60 + 45 + ((d * 17) % 75) // 7h45m ~ 9h00m 净工时 + 午休
      const outMin = inMin + workLen
      const fmt = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      demo[key] = {
        date: key,
        type: 'work',
        clockIn: fmt(inMin),
        clockOut: fmt(outMin),
        updatedAt: Date.now(),
      }
    }
  }
  return demo
}
