import React, { useState } from 'react'
import { X, Trash2, Info } from 'lucide-react'
import { ComputedDayInfo, DayRecord, DayRecordType } from '../types/attendance'
import { formatDuration, getChineseWeekday } from '../utils/date'

interface DayEditModalProps {
  dateKey: string
  computed?: ComputedDayInfo
  onSave: (record: DayRecord) => void
  onDelete: (dateKey: string) => void
  onClose: () => void
}

const TYPE_OPTIONS: { value: DayRecordType; label: string; hint: string }[] = [
  { value: 'work', label: '出勤', hint: '正常记录上下班' },
  { value: 'rest', label: '休息', hint: '自动判单双休/存档假' },
  { value: 'half_leave', label: '半天假', hint: '扣 0.5 天存档假' },
  { value: 'holiday', label: '节假日', hint: '不扣假不占配额' },
]

/** 单日记录详情与补卡/修改底部抽屉（Achromatic Ledger 风格） */
export const DayEditModal: React.FC<DayEditModalProps> = ({
  dateKey,
  computed,
  onSave,
  onDelete,
  onClose,
}) => {
  const existing = computed?.record
  const [type, setType] = useState<DayRecordType>(existing?.type ?? 'work')
  const [clockIn, setClockIn] = useState<string>(existing?.clockIn ?? '09:00')
  const [clockOut, setClockOut] = useState<string>(existing?.clockOut ?? '')
  const [note, setNote] = useState<string>(existing?.note ?? '')

  const showTimeInputs = type === 'work' || type === 'half_leave'

  const handleSave = () => {
    onSave({
      date: dateKey,
      type,
      clockIn: showTimeInputs && clockIn ? clockIn : null,
      clockOut: showTimeInputs && clockOut ? clockOut : null,
      note: note.trim() || undefined,
      updatedAt: Date.now(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border-t border-[#e6e6e6] bg-white p-5 pb-8 shadow-lg safe-pb"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#0a0a0a] font-mono-num">
              {dateKey} · {getChineseWeekday(dateKey)}
            </h3>
            {computed && computed.status !== 'none' && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6b6b6b]">
                <Info className="h-3.5 w-3.5 text-[#1d5fbf] shrink-0" />
                <span>{computed.reason}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e6e6] bg-[#f8f8f8] text-[#6b6b6b] active:bg-[#eeeeee]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 四种当日状态切换 */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-[#141414] bg-[#141414] text-white'
                    : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span
                  className={`mt-0.5 text-[11px] ${
                    active ? 'text-white/75' : 'text-[#6b6b6b]'
                  }`}
                >
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>

        {/* 时间选择器 */}
        {showTimeInputs && (
          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <label className="block rounded-lg border border-[#e6e6e6] bg-[#f8f8f8] p-3">
              <span className="block text-xs text-[#6b6b6b]">
                {type === 'half_leave' ? '半天上班时间（可空）' : '上班时间'}
              </span>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="mt-1 w-full bg-transparent text-lg font-medium text-[#0a0a0a] outline-none font-mono-num"
              />
            </label>
            <label className="block rounded-lg border border-[#e6e6e6] bg-[#f8f8f8] p-3">
              <span className="block text-xs text-[#6b6b6b]">
                下班时间（可空）
              </span>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="mt-1 w-full bg-transparent text-lg font-medium text-[#0a0a0a] outline-none font-mono-num"
              />
            </label>
          </div>
        )}

        {/* 已计算工时提示 */}
        {computed &&
          computed.actualWorkMinutes !== null &&
          showTimeInputs && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-[#e6e6e6] bg-[#f8f8f8] px-3.5 py-2.5 text-xs">
              <span className="text-[#6b6b6b]">当前记录净工时</span>
              <span className="font-medium text-[#0a0a0a] font-mono-num">
                {formatDuration(computed.actualWorkMinutes)}
                {computed.overtimeMinutes !== null &&
                  computed.overtimeMinutes !== 0 &&
                  ` (${formatDuration(computed.overtimeMinutes, true)})`}
              </span>
            </div>
          )}

        {/* 备注 */}
        <div className="mb-5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（如：清明放假、上午办事、补卡，可选）"
            className="w-full rounded-lg border border-[#e6e6e6] bg-[#f8f8f8] px-3.5 py-2.5 text-sm text-[#0a0a0a] placeholder-[#6b6b6b] outline-none focus:border-[#141414]"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="flex gap-2.5">
          {existing && (
            <button
              type="button"
              onClick={() => {
                onDelete(dateKey)
                onClose()
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e6e6e6] bg-[#ffedea] text-[#c4242a] active:opacity-80"
              aria-label="删除记录"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="h-11 flex-1 rounded-lg bg-[#141414] text-sm font-medium text-white active:opacity-90"
          >
            保存记录
          </button>
        </div>
      </div>
    </div>
  )
}
