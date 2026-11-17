import React, { useRef } from 'react'
import { Download, Upload, Trash2, Wand2, Share2, Smartphone } from 'lucide-react'
import {
  AttendanceSettings,
  LeaveBalanceSummary,
} from '../types/attendance'

interface SettingsViewProps {
  settings: AttendanceSettings
  leaveBalance: LeaveBalanceSummary
  onChangeSettings: (next: AttendanceSettings) => void
  onExport: () => void
  onImport: (file: File) => void
  onLoadDemo: () => void
  onClearAll: () => void
  onShowToast: (msg: string) => void
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

/** 考勤规则与数据设置界面（Achromatic Ledger 无彩账本风格） */
export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  leaveBalance,
  onChangeSettings,
  onExport,
  onImport,
  onLoadDemo,
  onClearAll,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleFixedDay = (day: number) => {
    const exists = settings.fixedRestDays.includes(day)
    const nextDays = exists
      ? settings.fixedRestDays.filter((d) => d !== day)
      : [...settings.fixedRestDays, day]
    onChangeSettings({ ...settings, fixedRestDays: nextDays })
  }

  const handlePolicyChange = (restPolicy: 'single' | 'double') => {
    const nextFixedDays = restPolicy === 'single' ? [0] : [6, 0]
    onChangeSettings({
      ...settings,
      restPolicy,
      fixedRestDays:
        settings.restMode === 'fixed_days'
          ? nextFixedDays
          : settings.fixedRestDays,
    })
  }

  const handleShareLink = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: '轻打卡 · 个人出勤账本',
          text: '单手点一下打卡，支持单双休与弹性工时自动算账，数据仅存在本地手机！',
          url,
        })
        return
      } catch {
        // 用户取消分享
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      onShowToast('已复制应用链接，可发送给朋友使用')
    } catch {
      onShowToast('请复制浏览器地址栏链接分享')
    }
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0a0a0a]">规则与设置</h2>
        <button
          type="button"
          onClick={handleShareLink}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-white px-3 text-xs font-medium text-[#0a0a0a] active:bg-[#eeeeee]"
        >
          <Share2 className="h-3.5 w-3.5" />
          分享给朋友
        </button>
      </div>

      {/* 1. 休假制度 */}
      <section className="rounded-lg border border-[#e6e6e6] bg-white p-4">
        <h3 className="mb-2.5 text-sm font-semibold text-[#0a0a0a]">休假制度</h3>

        <div className="mb-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handlePolicyChange('single')}
            className={`h-10 rounded-md border text-xs font-medium transition ${
              settings.restPolicy === 'single'
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
            }`}
          >
            单休制（每周1天）
          </button>
          <button
            type="button"
            onClick={() => handlePolicyChange('double')}
            className={`h-10 rounded-md border text-xs font-medium transition ${
              settings.restPolicy === 'double'
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
            }`}
          >
            双休制（每周2天）
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeSettings({ ...settings, restMode: 'quota' })}
            className={`h-9 rounded-md border text-xs transition ${
              settings.restMode === 'quota'
                ? 'border-[#141414] bg-[#eeeeee] font-medium text-[#0a0a0a]'
                : 'border-[#e6e6e6] bg-white text-[#6b6b6b]'
            }`}
          >
            灵活配额（每周任意休）
          </button>
          <button
            type="button"
            onClick={() =>
              onChangeSettings({ ...settings, restMode: 'fixed_days' })
            }
            className={`h-9 rounded-md border text-xs transition ${
              settings.restMode === 'fixed_days'
                ? 'border-[#141414] bg-[#eeeeee] font-medium text-[#0a0a0a]'
                : 'border-[#e6e6e6] bg-white text-[#6b6b6b]'
            }`}
          >
            固定休息日（指定周几）
          </button>
        </div>

        {settings.restMode === 'fixed_days' ? (
          <div>
            <div className="mb-2 text-xs text-[#6b6b6b]">
              点选固定正常休息日（其余工作日休息自动扣存档假）：
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_OPTIONS.map((opt) => {
                const active = settings.fixedRestDays.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleFixedDay(opt.value)}
                    className={`h-9 rounded-md border text-xs font-medium transition ${
                      active
                        ? 'border-[#141414] bg-[#141414] text-white'
                        : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-[#6b6b6b]">
            灵活配额：自然周内前{' '}
            <strong className="font-medium text-[#0a0a0a] font-mono-num">
              {settings.restPolicy === 'single' ? 1 : 2} 天
            </strong>{' '}
            休息不扣假，超出部分自动动用存档假。
          </p>
        )}
      </section>

      {/* 2. 上下班与工时规则 */}
      <section className="rounded-lg border border-[#e6e6e6] bg-white p-4">
        <h3 className="mb-2.5 text-sm font-semibold text-[#0a0a0a]">
          上下班与工时
        </h3>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onChangeSettings({ ...settings, workMode: 'flexible' })
            }
            className={`h-10 rounded-md border text-xs font-medium transition ${
              settings.workMode === 'flexible'
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
            }`}
          >
            弹性打卡（推算应下班）
          </button>
          <button
            type="button"
            onClick={() => onChangeSettings({ ...settings, workMode: 'fixed' })}
            className={`h-10 rounded-md border text-xs font-medium transition ${
              settings.workMode === 'fixed'
                ? 'border-[#141414] bg-[#141414] text-white'
                : 'border-[#e6e6e6] bg-[#f8f8f8] text-[#0a0a0a]'
            }`}
          >
            固定班制（判定迟到）
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block rounded-md border border-[#e6e6e6] bg-[#f8f8f8] p-2.5">
            <span className="block text-xs text-[#6b6b6b]">标准上班时间</span>
            <input
              type="time"
              value={settings.standardStartTime}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  standardStartTime: e.target.value,
                })
              }
              className="mt-1 w-full bg-transparent text-base font-medium text-[#0a0a0a] outline-none font-mono-num"
            />
          </label>

          {settings.workMode === 'fixed' ? (
            <label className="block rounded-md border border-[#e6e6e6] bg-[#f8f8f8] p-2.5">
              <span className="block text-xs text-[#6b6b6b]">标准下班时间</span>
              <input
                type="time"
                value={settings.standardEndTime}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    standardEndTime: e.target.value,
                  })
                }
                className="mt-1 w-full bg-transparent text-base font-medium text-[#0a0a0a] outline-none font-mono-num"
              />
            </label>
          ) : (
            <label className="block rounded-md border border-[#e6e6e6] bg-[#f8f8f8] p-2.5">
              <span className="block text-xs text-[#6b6b6b]">
                标准净工时（小时）
              </span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={settings.standardWorkMinutes / 60}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    standardWorkMinutes: Math.max(
                      60,
                      Math.round(Number(e.target.value || 8) * 60)
                    ),
                  })
                }
                className="mt-1 w-full bg-transparent text-base font-medium text-[#0a0a0a] outline-none font-mono-num"
              />
            </label>
          )}

          {settings.workMode === 'fixed' && (
            <label className="block rounded-md border border-[#e6e6e6] bg-[#f8f8f8] p-2.5">
              <span className="block text-xs text-[#6b6b6b]">
                标准净工时（小时）
              </span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={settings.standardWorkMinutes / 60}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    standardWorkMinutes: Math.max(
                      60,
                      Math.round(Number(e.target.value || 8) * 60)
                    ),
                  })
                }
                className="mt-1 w-full bg-transparent text-base font-medium text-[#0a0a0a] outline-none font-mono-num"
              />
            </label>
          )}

          <label className="block rounded-md border border-[#e6e6e6] bg-[#f8f8f8] p-2.5">
            <span className="block text-xs text-[#6b6b6b]">
              午休扣除（分钟）
            </span>
            <input
              type="number"
              step="15"
              min="0"
              max="180"
              value={settings.lunchBreakMinutes}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  lunchBreakMinutes: Math.max(0, Number(e.target.value || 0)),
                })
              }
              className="mt-1 w-full bg-transparent text-base font-medium text-[#0a0a0a] outline-none font-mono-num"
            />
          </label>
        </div>
      </section>

      {/* 3. 存档假账本 */}
      <section className="rounded-lg border border-[#e6e6e6] bg-white p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0a0a0a]">存档假账本</h3>
          <span className="text-xs font-medium text-[#1d5fbf] font-mono-num">
            剩余 {leaveBalance.remainingDays} 天
          </span>
        </div>

        <div className="mb-3 grid grid-cols-4 divide-x divide-[#f0f0f0] rounded-md border border-[#e6e6e6] bg-[#f8f8f8] py-2.5 text-center text-xs">
          <div>
            <div className="text-[#6b6b6b]">初始</div>
            <div className="mt-0.5 font-medium text-[#0a0a0a] font-mono-num">
              {leaveBalance.initialDays}
            </div>
          </div>
          <div>
            <div className="text-[#6b6b6b]">休日攒</div>
            <div className="mt-0.5 font-medium text-[#2e7d32] font-mono-num">
              +{leaveBalance.accruedDays}
            </div>
          </div>
          <div>
            <div className="text-[#6b6b6b]">加班折</div>
            <div className="mt-0.5 font-medium text-[#2e7d32] font-mono-num">
              +{leaveBalance.convertedOvertimeDays}
            </div>
          </div>
          <div>
            <div className="text-[#6b6b6b]">已用</div>
            <div className="mt-0.5 font-medium text-[#c4242a] font-mono-num">
              -{leaveBalance.usedDays}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between rounded-md border border-[#e6e6e6] bg-[#f8f8f8] px-3 py-2.5">
            <span className="text-xs font-medium text-[#0a0a0a]">
              初始存档假余额（天）
            </span>
            <input
              type="number"
              step="0.5"
              value={settings.initialLeaveDays}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  initialLeaveDays: Number(e.target.value || 0),
                })
              }
              className="w-20 rounded border border-[#d4d4d4] bg-white px-2 py-1 text-right text-sm font-medium text-[#0a0a0a] outline-none font-mono-num"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#e6e6e6] bg-[#f8f8f8] px-3 py-2.5">
            <div className="pr-3">
              <div className="text-xs font-medium text-[#0a0a0a]">
                休息日出勤自动攒入 +1 天
              </div>
              <div className="text-[11px] text-[#6b6b6b]">
                固定休息日上班或满勤 7 天自动入账
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAccrueLeave}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  autoAccrueLeave: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#141414]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#e6e6e6] bg-[#f8f8f8] px-3 py-2.5">
            <div className="pr-3">
              <div className="text-xs font-medium text-[#0a0a0a]">
                平日累计加班自动折算存档假
              </div>
              <div className="text-[11px] text-[#6b6b6b]">
                累计净加班每满 1 个标准工作日自动 +1 天
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoConvertOvertimeToLeave}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  autoConvertOvertimeToLeave: e.target.checked,
                })
              }
              className="h-4 w-4 accent-[#141414]"
            />
          </label>
        </div>
      </section>

      {/* 4. 本地数据与桌面安装指引 */}
      <section className="rounded-lg border border-[#e6e6e6] bg-white p-4">
        <h3 className="mb-1 text-sm font-semibold text-[#0a0a0a]">
          本地数据备份
        </h3>
        <p className="mb-3 text-xs text-[#6b6b6b]">
          数据仅保存在本机浏览器，支持离线打开与随时导出备份。
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#e6e6e6] bg-[#f8f8f8] text-xs font-medium text-[#0a0a0a] active:bg-[#eeeeee]"
          >
            <Download className="h-3.5 w-3.5" />
            导出 JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#e6e6e6] bg-[#f8f8f8] text-xs font-medium text-[#0a0a0a] active:bg-[#eeeeee]"
          >
            <Upload className="h-3.5 w-3.5" />
            导入恢复
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={onLoadDemo}
            className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#e6e6e6] bg-white text-xs font-medium text-[#1d5fbf] active:bg-[#f8f8f8]"
          >
            <Wand2 className="h-3.5 w-3.5" />
            填充示例数据
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('确定要清空全部本地打卡记录吗？此操作不可恢复。')) {
                onClearAll()
              }
            }}
            className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#e6e6e6] bg-white text-xs font-medium text-[#c4242a] active:bg-[#ffedea]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空全部记录
          </button>
        </div>

        {/* 添加到手机主屏幕指引 */}
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[#f0f0f0] bg-[#f8f8f8] p-3 text-xs text-[#6b6b6b]">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#0a0a0a]" />
          <div className="leading-relaxed">
            <strong className="font-medium text-[#0a0a0a]">添加到手机桌面：</strong>
            iPhone 用 Safari 点底部分享图标选「添加到主屏幕」；安卓用 Chrome
            点右上角菜单选「安装应用」或「添加到主屏幕」，即可离线全屏使用。
          </div>
        </div>
      </section>
    </div>
  )
}
