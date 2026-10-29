// 日期与周相关工具。所有日期以本地时区的 YYYY-MM-DD 字符串存储，避免 UTC 偏移。

export const pad = (n) => String(n).padStart(2, '0')

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function keyOf(d) {
  return todayKey(d)
}

export function parseKey(s) {
  if (!s) return new Date()
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 本周一 00:00 */
export function mondayOf(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** ISO 周：2026-W44 */
export function weekKey(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + 3)
  const f = new Date(t.getFullYear(), 0, 4)
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7) + 3)
  const wk = 1 + Math.round((t - f) / (7 * 864e5))
  return `${t.getFullYear()}-W${pad(wk)}`
}

export function weekRange(d = new Date()) {
  const m = mondayOf(d)
  const s = new Date(m)
  s.setDate(m.getDate() + 6)
  return `${m.getMonth() + 1}/${m.getDate()} – ${s.getMonth() + 1}/${s.getDate()}`
}

/** 该周的七天，元素为 Date */
export function weekDays(d = new Date()) {
  const mon = mondayOf(d)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon)
    x.setDate(mon.getDate() + i)
    return x
  })
}

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日']

export function fmtShort(s) {
  if (!s) return ''
  const [, m, d] = s.split('-')
  return `${m}-${d}`
}

export function fmtCN(d = new Date()) {
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_CN[d.getDay()]}`
}

/** 某个 YYYY-MM-DD 相对今天的天数差（正数=未来） */
export function daysFromToday(key) {
  const a = parseKey(todayKey())
  const b = parseKey(key)
  return Math.round((b - a) / 864e5)
}

/** 年内的进度 0..1（按天） */
export function yearProgress(year = new Date().getFullYear()) {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const now = new Date()
  const p = (now - start) / (end - start)
  return Math.max(0, Math.min(1, p))
}

/** 剩余天数 */
export function daysLeftInYear(year = new Date().getFullYear()) {
  const end = new Date(year + 1, 0, 1)
  const now = new Date()
  return Math.max(0, Math.ceil((end - now) / 864e5))
}
