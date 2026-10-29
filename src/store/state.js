import { signal } from '@preact/signals'
import { load, save } from './storage'
import { pushRemote } from './cloud'
import { todayKey } from '../lib/date'
import {
  blankState,
  newGoal,
  newProject,
  newMilestone,
  newDecision,
  newTask,
  newLog,
} from './model'

export const state = signal(load())

/** 同步状态：loading | anon | cloud | local | offline */
export const sync = signal({ mode: 'loading', user: null, lastSync: 0, error: null })

let saveTimer = null
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    // 本地始终写一份，断网也不能丢
    save(state.value)
    if (sync.value.mode !== 'cloud') return
    const r = await pushRemote(state.value)
    sync.value = r.ok
      ? { ...sync.value, lastSync: Date.now(), error: null }
      : { ...sync.value, error: r.reason || 'error' }
  }, 500)
}

/** 唯一的写入口：拿到旧状态，返回新状态，自动落盘 */
export function commit(fn) {
  const prev = state.value
  const next = fn({ ...prev })
  next.meta = { ...(next.meta || {}), updatedAt: todayKey() }
  state.value = next
  scheduleSave()
}

/* ----------------------------- 目标 ----------------------------- */

export function addGoal(patch) {
  commit((s) => ({
    ...s,
    goals: [...s.goals, newGoal({ ...patch, order: s.goals.length })],
  }))
}

export function updateGoal(id, patch) {
  commit((s) => ({
    ...s,
    goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  }))
}

export function removeGoal(id) {
  commit((s) => ({
    ...s,
    goals: s.goals.filter((g) => g.id !== id),
    projects: s.projects.filter((p) => p.goalId !== id),
    decisions: s.decisions.map((d) =>
      s.projects.some((p) => p.id === d.projectId && p.goalId === id)
        ? { ...d, projectId: null }
        : d
    ),
  }))
}

export function reorderGoals(ids) {
  commit((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      const i = ids.indexOf(g.id)
      return i >= 0 ? { ...g, order: i } : g
    }),
  }))
}

/** 数值型目标记录一个点（同一天覆盖） */
export function addSeriesPoint(goalId, d, v) {
  const num = Number(v)
  if (!Number.isFinite(num)) return
  commit((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      if (g.id !== goalId) return g
      const series = [...(g.series || []).filter((p) => p.d !== d), { d, v: num }].sort(
        (a, b) => a.d.localeCompare(b.d)
      )
      return { ...g, series }
    }),
  }))
}

/* ----------------------------- 项目 ----------------------------- */

export function addProject(patch) {
  commit((s) => ({ ...s, projects: [...s.projects, newProject(patch)] }))
}

export function updateProject(id, patch) {
  commit((s) => ({
    ...s,
    projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }))
}

export function removeProject(id) {
  commit((s) => ({
    ...s,
    projects: s.projects.filter((p) => p.id !== id),
    tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    decisions: s.decisions.map((d) => (d.projectId === id ? { ...d, projectId: null } : d)),
  }))
}

export function addMilestone(projectId, title, due = '') {
  commit((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === projectId
        ? { ...p, milestones: [...(p.milestones || []), newMilestone({ title, due })] }
        : p
    ),
  }))
}

export function toggleMilestone(projectId, mid) {
  commit((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === projectId
        ? {
            ...p,
            milestones: (p.milestones || []).map((m) =>
              m.id === mid ? { ...m, done: !m.done } : m
            ),
          }
        : p
    ),
  }))
}

export function removeMilestone(projectId, mid) {
  commit((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === projectId
        ? { ...p, milestones: (p.milestones || []).filter((m) => m.id !== mid) }
        : p
    ),
  }))
}

/* ----------------------------- 决策 ----------------------------- */

export function addDecision(patch) {
  commit((s) => ({ ...s, decisions: [...s.decisions, newDecision(patch)] }))
}

export function updateDecision(id, patch) {
  commit((s) => ({
    ...s,
    decisions: s.decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  }))
}

export function removeDecision(id) {
  commit((s) => ({ ...s, decisions: s.decisions.filter((d) => d.id !== id) }))
}

/* ----------------------------- 任务 ----------------------------- */

export function addTask(patch) {
  commit((s) => ({ ...s, tasks: [...s.tasks, newTask(patch)] }))
}

export function updateTask(id, patch) {
  commit((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }))
}

export function toggleTask(id) {
  commit((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  }))
}

export function removeTask(id) {
  commit((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
}

/** 把某个日期之前没做完的任务挪到今天 */
export function carryOver(fromDate, toDate = todayKey()) {
  commit((s) => ({
    ...s,
    tasks: s.tasks.map((t) =>
      t.date === fromDate && !t.done ? { ...t, date: toDate, src: '顺延' } : t
    ),
  }))
}

/* ----------------------------- 周计划 ----------------------------- */

export function getWeek(s, wk) {
  return s.weeks[wk] || { priorities: [], note: '' }
}

export function addPriority(wk, text, goalId = null) {
  commit((s) => {
    const w = getWeek(s, wk)
    if (w.priorities.length >= 3) return s
    return {
      ...s,
      weeks: {
        ...s.weeks,
        [wk]: {
          ...w,
          priorities: [...w.priorities, { id: Math.random().toString(36).slice(2, 9), text, done: false, goalId }],
        },
      },
    }
  })
}

export function togglePriority(wk, id) {
  commit((s) => {
    const w = getWeek(s, wk)
    return {
      ...s,
      weeks: {
        ...s.weeks,
        [wk]: {
          ...w,
          priorities: w.priorities.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
        },
      },
    }
  })
}

export function removePriority(wk, id) {
  commit((s) => {
    const w = getWeek(s, wk)
    return {
      ...s,
      weeks: { ...s.weeks, [wk]: { ...w, priorities: w.priorities.filter((p) => p.id !== id) } },
    }
  })
}

export function setWeekNote(wk, note) {
  commit((s) => ({ ...s, weeks: { ...s.weeks, [wk]: { ...getWeek(s, wk), note } } }))
}

/* ----------------------------- 记录 ----------------------------- */

export function addLog(patch) {
  commit((s) => ({ ...s, logs: [...s.logs, newLog(patch)] }))
}

export function removeLog(id) {
  commit((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) }))
}

export function setStatus(d, patch) {
  commit((s) => ({
    ...s,
    status: { ...s.status, [d]: { ...(s.status[d] || {}), ...patch } },
  }))
}

/* ----------------------------- 复盘 ----------------------------- */

export function setReview(wk, note) {
  commit((s) => ({
    ...s,
    reviews: { ...s.reviews, [wk]: { note, at: todayKey() } },
  }))
}

/* ----------------------------- 整库 ----------------------------- */

export function replaceAll(next) {
  state.value = next
  save(next)
}

export function resetAll() {
  const b = blankState()
  state.value = b
  save(b)
}
