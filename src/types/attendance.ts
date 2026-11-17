/**
 * 工作制模式：
 * - flexible: 弹性打卡（上班时间自由，按标准工时 + 午休推导应下班时间）
 * - fixed: 固定班制（按设定的上下班时间判断迟到/早退）
 */
export type WorkMode = 'flexible' | 'fixed'

/**
 * 休假制度：
 * - single: 单休制（每周 1 天正常休息）
 * - double: 双休制（每周 2 天正常休息）
 */
export type RestPolicy = 'single' | 'double'

/**
 * 休息日判定方式：
 * - quota: 灵活配额（每周任意 N 天休息均算正常休，超出扣存档假）
 * - fixed_days: 固定休息日（指定周几为正常休，其他工作日休息扣存档假）
 */
export type RestMode = 'quota' | 'fixed_days'

/** 每日记录类型 */
export type DayRecordType = 'work' | 'rest' | 'half_leave' | 'holiday'

/** 用户考勤与休假规则设置 */
export interface AttendanceSettings {
  /** 工作制模式 */
  workMode: WorkMode
  /** 标准上班时间 (HH:mm) */
  standardStartTime: string
  /** 固定班制标准下班时间 (HH:mm) */
  standardEndTime: string
  /** 每日标准净工作时长（分钟，默认 480 = 8 小时） */
  standardWorkMinutes: number
  /** 每日午休扣除时长（分钟，默认 60 = 1 小时） */
  lunchBreakMinutes: number
  /** 单休或双休 */
  restPolicy: RestPolicy
  /** 灵活配额或固定休息日 */
  restMode: RestMode
  /** 固定休息日（0=周日, 1=周一 ... 6=周六） */
  fixedRestDays: number[]
  /** 初始存档假余额（天） */
  initialLeaveDays: number
  /** 休息日出勤是否自动攒入 1 天存档假 */
  autoAccrueLeave: boolean
  /** 平日累计净加班每满 1 个标准工作日是否自动折算 +1 天存档假 */
  autoConvertOvertimeToLeave: boolean
}

/** 每日原始打卡记录 */
export interface DayRecord {
  /** 日期主键 YYYY-MM-DD */
  date: string
  /** 当日状态：出勤 / 休息 / 半天假 / 法定节假日 */
  type: DayRecordType
  /** 上班打卡时间 HH:mm（或 null） */
  clockIn: string | null
  /** 下班打卡时间 HH:mm（或 null） */
  clockOut: string | null
  /** 可选备注 */
  note?: string
  /** 最后更新时间戳 */
  updatedAt: number
}

/** 经规则引擎推导后的单日详情 */
export interface ComputedDayInfo {
  date: string
  record?: DayRecord
  /**
   * 推导结果类型：
   * - none: 无记录
   * - working: 工作中（已打上班卡，未打下班卡）
   * - completed: 已完成当日出勤
   * - normal_rest: 正常休息（不扣存档假）
   * - archive_leave: 动用存档假（-1 天）
   * - half_leave: 半天假（-0.5 天存档假）
   * - holiday: 法定节假日（不扣假、不占单双休配额）
   */
  status:
    | 'none'
    | 'working'
    | 'completed'
    | 'normal_rest'
    | 'archive_leave'
    | 'half_leave'
    | 'holiday'
  /** 应下班时间 HH:mm（出勤或半天假且有上班卡时有值） */
  expectedClockOut: string | null
  /** 实际净工时（分钟） */
  actualWorkMinutes: number | null
  /** 与当日应工作时长的差值（分钟，正数为加班，负数为欠班） */
  overtimeMinutes: number | null
  /** 固定班制下是否迟到（分钟） */
  lateMinutes: number
  /** 是否在休息日出勤并攒入了存档假 */
  accruedLeave: boolean
  /** 当日动用的存档假天数（0 / 0.5 / 1） */
  usedLeaveDays: number
  /** 规则判断说明（向用户解释为什么这样判） */
  reason: string
}

/** 全局存档假余额汇总 */
export interface LeaveBalanceSummary {
  initialDays: number
  accruedDays: number
  convertedOvertimeDays: number
  usedDays: number
  remainingDays: number
}

/** 月度统计汇总 */
export interface MonthlyStats {
  year: number
  month: number
  workDays: number
  normalRestDays: number
  archiveLeaveDays: number
  holidayDays: number
  accruedLeaveDays: number
  missingClockOutDays: number
  totalWorkMinutes: number
  avgWorkMinutes: number
  netOvertimeMinutes: number
}
