import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  AttendanceSettings,
  ComputedDayInfo,
  LeaveBalanceSummary,
  MonthlyStats,
} from '../types/attendance'
import { buildMonthGrid, formatDuration } from '../utils/date'

interface CalendarViewProps {
  year: number
  month: number
  todayKey: string
  settings: AttendanceSettings
  dayMap: Record<string, ComputedDayInfo>
  stats: MonthlyStats
  leaveBalance: LeaveBalanceSummary
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoTodayMonth: () => void
  onSelectDate: (dateKey: string) => void
}

const WEEK_HEADERS = ['一', '二', '三', '四', '五', '六', '日']

/** 月历与月度统计界面（Achromatic Ledger 无彩账本风格） */
export const CalendarView: React.FC<CalendarViewProps> = ({
  year,
  month,
  todayKey,
  settings,
  dayMap,
  stats,
  leaveBalance,
  onPrevMonth,
  onNextMonth,
  onGoTodayMonth,
  onSelectDate,
}) => {
  const cells = buildMonthGrid(year, month)
  const daysInMonth = new Date(year, month, 0).getDate()
  const prefix = `${year}-${String(month).padStart(2, '0')}-`

  // 提取本月每日工时用于单色柱状图
  const dailyBars = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const key = `${prefix}${String(day).padStart(2, '0')}`
    const info = dayMap[key]
    const hours =
      info?.actualWorkMinutes !== null && info?.actualWorkMinutes !== undefined
        ? info.actualWorkMinutes / 60
        : 0
    return { day, key, hours }
  })

  const standardHours = settings.standardWorkMinutes / 60
  const maxBarHours = Math.max(
    standardHours * 1.35,
    ...dailyBars.map((b) => b.hours),
    10
  )

  // 提取本月所有休息/节假日/半天假/攒假事件
  const leaveEvents = Object.keys(dayMap)
    .filter((k) => k.startsWith(prefix))
    .sort()
    .map((k) => dayMap[k])
    .filter(
      (d) =>
        d.status === 'normal_rest' ||
        d.status === 'archive_leave' ||
        d.status === 'half_leave' ||
        d.status === 'holiday' ||
        d.accruedLeave
    )

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-6">
      {/* 月份切换栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e6e6] bg-white text-[#0a0a0a] active:bg-[#eeeeee]"
            aria-label="上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[104px] text-center text-lg font-semibold text-[#0a0a0a] font-mono-num">
            {year}-{String(month).padStart(2, '0')}
          </h2>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e6e6] bg-white text-[#0a0a0a] active:bg-[#eeeeee]"
            aria-label="下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onGoTodayMonth}
          className="h-9 rounded-lg border border-[#e6e6e6] bg-white px-3 text-xs font-medium text-[#0a0a0a] active:bg-[#eeeeee]"
        >
          回到本月
        </button>
      </div>

      {/* 1px 细线分隔的 2x2 月度 KPI 账本卡 */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e6e6e6] bg-white">
        <div className="border-r border-b border-[#f0f0f0] p-3.5">
          <div className="text-xs text-[#6b6b6b]">本月出勤</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-medium text-[#0a0a0a] font-mono-num">
              {stats.workDays}
              <span className="ml-1 text-xs font-normal text-[#6b6b6b]">天</span>
            </span>
            {stats.missingClockOutDays > 0 && (
              <span className="rounded bg-[#fffbeb] px-1.5 py-0.5 text-[11px] font-medium text-[#92400e]">
                {stats.missingClockOutDays}天缺卡
              </span>
            )}
          </div>
        </div>

        <div className="border-b border-[#f0f0f0] p-3.5">
          <div className="text-xs text-[#6b6b6b]">累计净工时</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-medium text-[#1d5fbf] font-mono-num">
              {(stats.totalWorkMinutes / 60).toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[#6b6b6b]">h</span>
            </span>
            <span className="text-[11px] text-[#6b6b6b] font-mono-num">
              {stats.avgWorkMinutes > 0
                ? `均 ${(stats.avgWorkMinutes / 60).toFixed(1)}h`
                : '—'}
            </span>
          </div>
        </div>

        <div className="border-r border-[#f0f0f0] p-3.5">
          <div className="text-xs text-[#6b6b6b]">休假判定</div>
          <div className="mt-1.5 flex items-baseline gap-2.5 text-xs text-[#6b6b6b] font-mono-num">
            <span>
              休 <strong className="text-base font-medium text-[#0a0a0a]">{stats.normalRestDays}</strong>
            </span>
            <span>
              假{' '}
              <strong
                className={`text-base font-medium ${
                  stats.archiveLeaveDays > 0 ? 'text-[#c4242a]' : 'text-[#0a0a0a]'
                }`}
              >
                {stats.archiveLeaveDays}
              </strong>
            </span>
            {stats.holidayDays > 0 && (
              <span>
                节 <strong className="text-base font-medium text-[#2e7d32]">{stats.holidayDays}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5">
          <div className="text-xs text-[#6b6b6b]">剩余存档假</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-2xl font-medium font-mono-num ${
                leaveBalance.remainingDays < 0
                  ? 'text-[#c4242a]'
                  : 'text-[#0a0a0a]'
              }`}
            >
              {leaveBalance.remainingDays}
              <span className="ml-1 text-xs font-normal text-[#6b6b6b]">天</span>
            </span>
            <span className="text-[11px] text-[#6b6b6b] font-mono-num">
              {stats.netOvertimeMinutes !== 0
                ? `净${formatDuration(stats.netOvertimeMinutes, true)}`
                : '持平'}
            </span>
          </div>
        </div>
      </div>

      {/* 单色 #1d5fbf 每日净工时柱状图（含标准工时虚线基准线） */}
      <div className="rounded-lg border border-[#e6e6e6] bg-white p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#0a0a0a]">
            每日净工时分布
          </span>
          <span className="text-[11px] text-[#6b6b6b] font-mono-num">
            基准线 {standardHours.toFixed(1)}h
          </span>
        </div>

        <div className="relative h-24 w-full">
          <svg
            viewBox={`0 0 ${daysInMonth * 10} 80`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* 标准工时虚线基准 */}
            {(() => {
              const baseY = 76 - (standardHours / maxBarHours) * 70
              return (
                <line
                  x1="0"
                  y1={baseY}
                  x2={daysInMonth * 10}
                  y2={baseY}
                  stroke="#d4d4d4"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )
            })()}
            {/* 每日细柱 */}
            {dailyBars.map((b, i) => {
              if (b.hours <= 0) return null
              const h = Math.max(2, (b.hours / maxBarHours) * 70)
              return (
                <rect
                  key={b.key}
                  x={i * 10 + 2}
                  y={76 - h}
                  width="6"
                  height={h}
                  rx="1.5"
                  fill="#1d5fbf"
                />
              )
            })}
          </svg>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[#6b6b6b] font-mono-num">
          <span>1日</span>
          <span>{Math.ceil(daysInMonth / 2)}日</span>
          <span>{daysInMonth}日</span>
        </div>
      </div>

      {/* 极简账本月历网格 */}
      <div className="rounded-lg border border-[#e6e6e6] bg-white p-3">
        <div className="mb-1.5 grid grid-cols-7 text-center text-xs text-[#6b6b6b]">
          {WEEK_HEADERS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateKey, idx) => {
            if (!dateKey) {
              return <div key={`empty-${idx}`} className="h-12" />
            }
            const dayNum = Number(dateKey.slice(-2))
            const info = dayMap[dateKey]
            const isToday = dateKey === todayKey

            let cellCls = 'bg-[#f8f8f8] text-[#0a0a0a]'
            let subText = ''
            let subCls = 'text-[#6b6b6b]'

            if (info?.status === 'completed') {
              cellCls = 'bg-white border border-[#e6e6e6] text-[#0a0a0a]'
              subText =
                info.actualWorkMinutes !== null
                  ? `${(info.actualWorkMinutes / 60).toFixed(1)}h`
                  : '已打'
              subCls = 'text-[#1d5fbf] font-medium'
            } else if (info?.status === 'working') {
              cellCls = 'bg-[#fffbeb] text-[#92400e]'
              subText = '缺下班'
              subCls = 'text-[#92400e]'
            } else if (info?.status === 'normal_rest') {
              cellCls = 'bg-[#eeeeee] text-[#3d3d3d]'
              subText = '休'
              subCls = 'text-[#6b6b6b]'
            } else if (info?.status === 'archive_leave') {
              cellCls = 'bg-[#ffedea] text-[#831c1e]'
              subText = '-1天'
              subCls = 'text-[#c4242a] font-medium'
            } else if (info?.status === 'half_leave') {
              cellCls = 'bg-[#fffbeb] text-[#92400e]'
              subText = '-0.5天'
              subCls = 'text-[#92400e] font-medium'
            } else if (info?.status === 'holiday') {
              cellCls = 'bg-[#dcfae5] text-[#04250e]'
              subText = '节'
              subCls = 'text-[#2e7d32] font-medium'
            }

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(dateKey)}
                className={`relative flex h-12 flex-col items-center justify-between rounded-md py-1 transition active:opacity-75 ${cellCls} ${
                  isToday ? 'ring-1 ring-[#141414]' : ''
                }`}
              >
                <span className="text-xs font-medium font-mono-num">
                  {dayNum}
                </span>
                {info?.accruedLeave && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#2e7d32]" />
                )}
                <span className={`text-[11px] leading-none font-mono-num ${subCls}`}>
                  {subText}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 本月自动推断明细 */}
      <div className="rounded-lg border border-[#e6e6e6] bg-white p-3.5">
        <h3 className="mb-2 text-xs font-medium text-[#0a0a0a]">
          本月休息与存档假明细（点日期可补卡或设为节假日）
        </h3>
        {leaveEvents.length === 0 ? (
          <p className="py-1.5 text-xs text-[#6b6b6b]">
            本月暂无休息、节假日或存档假变动
          </p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {leaveEvents.map((item) => (
              <button
                key={item.date}
                type="button"
                onClick={() => onSelectDate(item.date)}
                className="flex w-full items-center justify-between py-2.5 text-left text-xs active:bg-[#f8f8f8]"
              >
                <div className="pr-3">
                  <span className="font-medium text-[#0a0a0a] font-mono-num">
                    {item.date.slice(5)}
                  </span>
                  <span className="ml-2 text-[#6b6b6b]">{item.reason}</span>
                </div>
                {item.usedLeaveDays > 0 && (
                  <span className="shrink-0 font-medium text-[#c4242a] font-mono-num">
                    -{item.usedLeaveDays}天
                  </span>
                )}
                {item.accruedLeave && (
                  <span className="shrink-0 font-medium text-[#2e7d32] font-mono-num">
                    +1天
                  </span>
                )}
                {item.usedLeaveDays === 0 && !item.accruedLeave && (
                  <span className="shrink-0 text-[#6b6b6b]">不扣假</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
