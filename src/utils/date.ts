/** 将 Date 格式化为 YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 将 Date 格式化为 HH:mm */
export function formatTimeHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 将 Date 格式化为 HH:mm:ss */
export function formatTimeHHmmss(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** 解析 YYYY-MM-DD 为本地 Date 对象 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 获取自然周（以周一为每周第一天）的周一日期 Key */
export function getWeekStartKey(dateKey: string): string {
  const d = parseDateKey(dateKey)
  const day = d.getDay() // 0=周日, 1=周一 ... 6=周六
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return formatDateKey(d)
}

/** HH:mm 转为当天总分钟数 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 总分钟数转为 HH:mm（支持超过 24 小时取模，用于展示次日时间） */
export function minutesToHHmm(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 将分钟时长格式化为易读中文，例如 "8h 30m" 或 "8.5h" */
export function formatDuration(minutes: number, showSign = false): string {
  const sign = minutes < 0 ? '-' : showSign && minutes > 0 ? '+' : ''
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}分钟`
  if (m === 0) return `${sign}${h}小时`
  return `${sign}${h}小时${m}分`
}

/** 获取中文星期名称 */
export function getChineseWeekday(dateKey: string): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[parseDateKey(dateKey).getDay()]
}

/** 生成指定年月的月历网格（以周一为第一列，补齐前后空白格为 null） */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // 周一=0, 周二=1, ..., 周日=6
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: (string | null)[] = []

  for (let i = 0; i < startOffset; i++) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    )
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}
