import { todayKey } from '../lib/date'

export const SCHEMA_VERSION = 2

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// 目标两种形态：有终点的成果，和要拉曲线的数值。
export const GOAL_TYPES = {
  outcome: '成果型',
  metric: '数值型',
}

export const GOAL_STATUS = {
  active: '进行中',
  done: '已完成',
  dropped: '已放弃',
}

export const PROJECT_STATUS = {
  active: '进行中',
  done: '已完成',
  paused: '暂停',
  dropped: '已放弃',
}

export function blankState() {
  const now = todayKey()
  return {
    v: SCHEMA_VERSION,
    goals: [],
    projects: [],
    tasks: [],
    decisions: [], // { id, projectId|null, question, options[], choice, rationale, date, status }
    weeks: {}, // { '2026-W44': { priorities: [{id,text,done,goalId}], note } }
    logs: [],
    status: {}, // { '2026-10-29': { sleep, exercise, focus } }
    reviews: {}, // { '2026-W44': { note, at } }
    quotes: [], // { id, text, source, area: 'relation'|'career'|'life', createdAt }
    meta: { createdAt: now, updatedAt: now },
  }
}

export function newGoal(patch = {}) {
  return {
    id: uid(),
    year: new Date().getFullYear(),
    title: '',
    why: '',
    type: 'outcome',
    target: '',
    unit: '',
    startValue: null,
    targetValue: null,
    series: [], // [{ d: 'YYYY-MM-DD', v: number }]
    status: 'active',
    order: 0,
    createdAt: todayKey(),
    ...patch,
  }
}

export function newProject(patch = {}) {
  return {
    id: uid(),
    goalId: null,
    title: '',
    start: '',
    end: '',
    weight: 1,
    status: 'active',
    milestones: [],
    decisions: [],
    createdAt: todayKey(),
    ...patch,
  }
}

export function newMilestone(patch = {}) {
  return { id: uid(), title: '', done: false, due: '', ...patch }
}

export function newDecision(patch = {}) {
  return {
    id: uid(),
    question: '',
    options: [],
    choice: '',
    rationale: '',
    date: todayKey(),
    ...patch,
  }
}

export function newTask(patch = {}) {
  return {
    id: uid(),
    projectId: null,
    date: todayKey(),
    text: '',
    done: false,
    src: '',
    createdAt: todayKey(),
    ...patch,
  }
}

export function newLog(patch = {}) {
  return { id: uid(), d: todayKey(), text: '', tag: '', ...patch }
}

/** 保证从磁盘读出的旧结构不会让页面崩 */
export function normalize(s) {
  const b = blankState()
  const out = { ...b, ...(s || {}) }
  if (!Array.isArray(out.goals)) out.goals = []
  if (!Array.isArray(out.projects)) out.projects = []
  if (!Array.isArray(out.tasks)) out.tasks = []
  if (!Array.isArray(out.decisions)) out.decisions = []
  if (!Array.isArray(out.quotes)) out.quotes = []
  if (!Array.isArray(out.logs)) out.logs = []
  if (typeof out.weeks !== 'object' || !out.weeks) out.weeks = {}
  if (typeof out.status !== 'object' || !out.status) out.status = {}
  if (typeof out.reviews !== 'object' || !out.reviews) out.reviews = {}
  out.v = SCHEMA_VERSION
  return out
}
