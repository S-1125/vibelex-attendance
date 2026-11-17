import { useEffect, useMemo, useState } from 'react'
import { Clock, CalendarDays, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { AttendanceSettings, DayRecord } from './types/attendance'
import { formatDateKey, formatTimeHHmm } from './utils/date'
import { computeAllDays, computeMonthlyStats } from './utils/calculator'
import {
  exportBackupJson,
  generateDemoRecordsForCurrentMonth,
  loadRecords,
  loadSettings,
  parseBackupJson,
  saveRecords,
  saveSettings,
} from './utils/storage'
import { ClockView } from './components/ClockView'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { DayEditModal } from './components/DayEditModal'

type TabKey = 'clock' | 'calendar' | 'settings'

interface ToastState {
  message: string
  undoSnapshot?: Record<string, DayRecord>
}

/** 轻打卡主应用容器（Achromatic Ledger 无彩账本风） */
export function App() {
  const [tab, setTab] = useState<TabKey>('clock')
  const [settings, setSettings] = useState<AttendanceSettings>(() =>
    loadSettings()
  )
  const [records, setRecords] = useState<Record<string, DayRecord>>(() =>
    loadRecords()
  )

  const now = new Date()
  const todayKey = formatDateKey(now)
  const [viewYear, setViewYear] = useState<number>(now.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth() + 1)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveRecords(records)
  }, [records])

  const showToast = (
    message: string,
    undoSnapshot?: Record<string, DayRecord>
  ) => {
    setToast({ message, undoSnapshot })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(
      () => setToast(null),
      toast.undoSnapshot ? 5000 : 2600
    )
    return () => clearTimeout(timer)
  }, [toast])

  const { dayMap, leaveBalance } = useMemo(
    () => computeAllDays(records, settings),
    [records, settings]
  )

  const calendarMonthlyStats = useMemo(
    () => computeMonthlyStats(viewYear, viewMonth, dayMap),
    [viewYear, viewMonth, dayMap]
  )

  const currentMonthlyStats = useMemo(
    () =>
      computeMonthlyStats(now.getFullYear(), now.getMonth() + 1, dayMap),
    [dayMap, now]
  )

  /** 一键上班打卡（附带 5 秒撤销快照） */
  const handleClockIn = () => {
    const snapshot = { ...records }
    const timeStr = formatTimeHHmm(new Date())
    const existing = records[todayKey]
    const nextRecord: DayRecord = {
      date: todayKey,
      type: existing?.type === 'half_leave' ? 'half_leave' : 'work',
      clockIn: timeStr,
      clockOut:
        existing?.type === 'work' || existing?.type === 'half_leave'
          ? existing.clockOut
          : null,
      note: existing?.note,
      updatedAt: Date.now(),
    }
    const nextRecords = { ...records, [todayKey]: nextRecord }
    setRecords(nextRecords)

    const preview = computeAllDays(nextRecords, settings).dayMap[todayKey]
    showToast(
      preview?.expectedClockOut
        ? `已记上班 ${timeStr} · 应下班 ${preview.expectedClockOut}`
        : `已记上班 ${timeStr}`,
      snapshot
    )
  }

  /** 一键下班打卡（附带 5 秒撤销快照） */
  const handleClockOut = () => {
    const snapshot = { ...records }
    const timeStr = formatTimeHHmm(new Date())
    const existing = records[todayKey]
    const nextRecord: DayRecord = {
      date: todayKey,
      type: existing?.type === 'half_leave' ? 'half_leave' : 'work',
      clockIn:
        existing?.type === 'work' || existing?.type === 'half_leave'
          ? existing.clockIn
          : null,
      clockOut: timeStr,
      note: existing?.note,
      updatedAt: Date.now(),
    }
    const nextRecords = { ...records, [todayKey]: nextRecord }
    setRecords(nextRecords)

    if (!nextRecord.clockIn) {
      showToast(`已记下班 ${timeStr}（可点微调补上班时间）`, snapshot)
    } else {
      const preview = computeAllDays(nextRecords, settings).dayMap[todayKey]
      const hours =
        preview?.actualWorkMinutes !== null &&
        preview?.actualWorkMinutes !== undefined
          ? `${(preview.actualWorkMinutes / 60).toFixed(1)}h`
          : ''
      showToast(
        `已记下班 ${timeStr}${hours ? ` · 今日净工时 ${hours}` : ''}`,
        snapshot
      )
    }
  }

  /** 一键休息（附带 5 秒撤销快照） */
  const handleRest = () => {
    const snapshot = { ...records }
    const existing = records[todayKey]
    const nextRecord: DayRecord = {
      date: todayKey,
      type: 'rest',
      clockIn: null,
      clockOut: null,
      note: existing?.note,
      updatedAt: Date.now(),
    }
    const nextRecords = { ...records, [todayKey]: nextRecord }
    setRecords(nextRecords)

    const preview = computeAllDays(nextRecords, settings).dayMap[todayKey]
    showToast(preview?.reason || '已记录今日休息', snapshot)
  }

  const handleExport = () => {
    const json = exportBackupJson(settings, records)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `轻打卡备份_${todayKey}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已导出 JSON 备份文件')
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseBackupJson(text)
      setSettings(parsed.settings)
      setRecords(parsed.records)
      showToast(`导入成功，恢复 ${Object.keys(parsed.records).length} 天记录`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入失败，请检查文件')
    }
  }

  const handleLoadDemo = () => {
    const demo = generateDemoRecordsForCurrentMonth()
    setRecords((prev) => ({ ...demo, ...prev }))
    showToast('已填充本月示例数据（保留今日记录）')
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-[#f2f4f7] sm:border-x sm:border-[#e6e6e6]">
      <div className="safe-pt shrink-0" />

      {/* 顶部 Toast 提示（支持 5 秒内一键撤销打卡） */}
      {toast && (
        <div className="fixed top-5 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-lg border border-[#141414] bg-[#141414] px-3.5 py-2 text-xs text-white shadow-md">
          <span className="truncate">{toast.message}</span>
          {toast.undoSnapshot && (
            <button
              type="button"
              onClick={() => {
                setRecords(toast.undoSnapshot!)
                setToast({ message: '已撤销刚才的操作' })
              }}
              className="flex shrink-0 items-center gap-1 rounded bg-white/15 px-2 py-1 font-medium text-white active:bg-white/25"
            >
              <RotateCcw className="h-3 w-3" />
              撤销
            </button>
          )}
        </div>
      )}

      {/* 主内容区 */}
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === 'clock' && (
          <ClockView
            todayKey={todayKey}
            todayInfo={dayMap[todayKey]}
            settings={settings}
            leaveBalance={leaveBalance}
            monthlyStats={currentMonthlyStats}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onRest={handleRest}
            onEditToday={() => setEditingDate(todayKey)}
          />
        )}

        {tab === 'calendar' && (
          <CalendarView
            year={viewYear}
            month={viewMonth}
            todayKey={todayKey}
            settings={settings}
            dayMap={dayMap}
            stats={calendarMonthlyStats}
            leaveBalance={leaveBalance}
            onPrevMonth={() => {
              if (viewMonth === 1) {
                setViewYear((y) => y - 1)
                setViewMonth(12)
              } else {
                setViewMonth((m) => m - 1)
              }
            }}
            onNextMonth={() => {
              if (viewMonth === 12) {
                setViewYear((y) => y + 1)
                setViewMonth(1)
              } else {
                setViewMonth((m) => m + 1)
              }
            }}
            onGoTodayMonth={() => {
              setViewYear(now.getFullYear())
              setViewMonth(now.getMonth() + 1)
            }}
            onSelectDate={(dateKey) => setEditingDate(dateKey)}
          />
        )}

        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            leaveBalance={leaveBalance}
            onChangeSettings={setSettings}
            onExport={handleExport}
            onImport={handleImport}
            onLoadDemo={handleLoadDemo}
            onClearAll={() => {
              setRecords({})
              showToast('已清空全部本地打卡记录')
            }}
            onShowToast={(msg) => showToast(msg)}
          />
        )}
      </main>

      {/* 底部极简账本风导航栏（无彩色背景块，1px 顶线） */}
      <nav className="safe-pb shrink-0 border-t border-[#e6e6e6] bg-white px-6 pt-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTab('clock')}
            className={`flex h-11 flex-col items-center justify-center text-xs transition ${
              tab === 'clock'
                ? 'font-semibold text-[#0a0a0a]'
                : 'font-normal text-[#6b6b6b]'
            }`}
          >
            <Clock className="mb-0.5 h-4 w-4" strokeWidth={tab === 'clock' ? 2 : 1.5} />
            打卡
          </button>

          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`flex h-11 flex-col items-center justify-center text-xs transition ${
              tab === 'calendar'
                ? 'font-semibold text-[#0a0a0a]'
                : 'font-normal text-[#6b6b6b]'
            }`}
          >
            <CalendarDays className="mb-0.5 h-4 w-4" strokeWidth={tab === 'calendar' ? 2 : 1.5} />
            月历
          </button>

          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`flex h-11 flex-col items-center justify-center text-xs transition ${
              tab === 'settings'
                ? 'font-semibold text-[#0a0a0a]'
                : 'font-normal text-[#6b6b6b]'
            }`}
          >
            <SlidersHorizontal
              className="mb-0.5 h-4 w-4"
              strokeWidth={tab === 'settings' ? 2 : 1.5}
            />
            设置
          </button>
        </div>
      </nav>

      {/* 单日补卡 / 微调抽屉 */}
      {editingDate && (
        <DayEditModal
          dateKey={editingDate}
          computed={dayMap[editingDate]}
          onSave={(rec) => {
            const snapshot = { ...records }
            setRecords((prev) => ({ ...prev, [rec.date]: rec }))
            showToast(`已保存 ${rec.date} 记录`, snapshot)
          }}
          onDelete={(dateKey) => {
            const snapshot = { ...records }
            setRecords((prev) => {
              const next = { ...prev }
              delete next[dateKey]
              return next
            })
            showToast(`已删除 ${dateKey} 记录`, snapshot)
          }}
          onClose={() => setEditingDate(null)}
        />
      )}
    </div>
  )
}

export default App
