import { yearProgress } from '../lib/date'

const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))

/** 目标的数值序列，按日期升序 */
export function sortedSeries(goal) {
  return [...(goal?.series || [])].sort((a, b) => String(a.d).localeCompare(String(b.d)))
}

export function latestValue(goal) {
  const s = sortedSeries(goal)
  return s.length ? Number(s[s.length - 1].v) : null
}

/** 数值型目标的达成比例：从起始值走到目标值的百分比 */
export function metricRatio(goal, cur = latestValue(goal)) {
  if (cur == null) return 0
  const a = Number(goal.startValue)
  const b = Number(goal.targetValue)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === a) return 0
  return clamp01((cur - a) / (b - a))
}

/** 项目进度：有里程碑按里程碑，否则按挂在本项目下的任务 */
export function projectProgress(project, tasks = []) {
  const ms = project.milestones || []
  if (ms.length) return ms.filter((m) => m.done).length / ms.length
  const ts = tasks.filter((t) => t.projectId === project.id)
  if (!ts.length) return 0
  return ts.filter((t) => t.done).length / ts.length
}

export function projectTaskStats(project, tasks = []) {
  const ts = tasks.filter((t) => t.projectId === project.id)
  return { total: ts.length, done: ts.filter((t) => t.done).length }
}

/** 目标进度：数值型看曲线，成果型按项目权重加权 */
export function goalProgress(goal, projects = [], tasks = []) {
  if (goal.type === 'metric') return metricRatio(goal)
  const ps = projects.filter((p) => p.goalId === goal.id && p.status !== 'dropped')
  if (!ps.length) return 0
  const totalW = ps.reduce((s, p) => s + (Number(p.weight) || 1), 0)
  if (!totalW) return 0
  return ps.reduce((s, p) => s + (Number(p.weight) || 1) * projectProgress(p, tasks), 0) / totalW
}

/**
 * 双轨对比：实际进度 vs 时间进度。
 * delta 为负表示落后（年内时间已经走过这么多，成果没跟上）。
 */
export function goalPace(goal, projects = [], tasks = [], year = new Date().getFullYear()) {
  const progress = goalProgress(goal, projects, tasks)
  const time = yearProgress(year)
  return { progress, time, delta: progress - time }
}

export function projectsOf(goal, projects = []) {
  return projects.filter((p) => p.goalId === goal.id)
}

/** 某目标下全部任务的完成情况 */
export function goalTaskStats(goal, projects = [], tasks = []) {
  const ids = new Set(projectsOf(goal, projects).map((p) => p.id))
  const ts = tasks.filter((t) => ids.has(t.projectId))
  return { total: ts.length, done: ts.filter((t) => t.done).length }
}

/** 一个项目的整体健康度描述 */
export function paceLabel(delta) {
  const pct = Math.round(Math.abs(delta) * 100)
  if (pct <= 3) return { text: '基本同步', tone: 'ok' }
  if (delta > 0) return { text: `领先 ${pct}`, tone: 'up' }
  return { text: `落后 ${pct}`, tone: 'down' }
}
