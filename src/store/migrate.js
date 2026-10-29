import { blankState, newGoal, newDecision, newTask, newLog, uid } from './model'
import { todayKey } from '../lib/date'

/**
 * v1（单文件时代）→ v2。
 *
 * 对应关系：
 *   metrics   → 数值型目标（entries 变成 series，首值作为起点）
 *   decisions → 顶层决策，不带项目；用户在界面里可以归到某个项目下
 *   weeks.days → 拍平成 tasks（带 date）
 *   weeks.priorities → 原样搬到 weeks[wk].priorities
 *   logs / reviews → 原样
 */
export function migrateV1(v1) {
  const out = blankState()
  const now = todayKey()

  ;(v1.metrics || []).forEach((m, i) => {
    const entries = [...(m.entries || [])].sort((a, b) => String(a.d).localeCompare(String(b.d)))
    out.goals.push(
      newGoal({
        title: m.name || '未命名指标',
        type: 'metric',
        unit: m.unit || '',
        startValue: entries.length ? Number(entries[0].v) : null,
        targetValue: m.target === '' || m.target == null ? null : Number(m.target),
        series: entries.map((e) => ({ d: e.d, v: Number(e.v) })),
        why: m.dir === 'down' ? '（原为越低越好的指标）' : '',
        order: i,
      })
    )
  })

  ;(v1.decisions || []).forEach((d) => {
    out.decisions.push(
      newDecision({
        question: d.title || '',
        options: d.options || [],
        choice: d.choice || '',
        rationale: [d.context, d.rationale, d.outcome].filter(Boolean).join('\n\n'),
        date: d.decidedAt || d.createdAt || now,
        status: d.status === 'open' ? 'open' : 'decided',
      })
    )
  })

  Object.entries(v1.weeks || {}).forEach(([wk, w]) => {
    out.weeks[wk] = {
      priorities: (w.priorities || []).map((p) => ({
        id: p.id || uid(),
        text: p.text || '',
        done: !!p.done,
        goalId: null,
      })),
      note: '',
    }
    Object.entries(w.days || {}).forEach(([dk, list]) => {
      ;(list || []).forEach((t) => {
        out.tasks.push(
          newTask({
            date: dk,
            text: t.text || '',
            done: !!t.done,
            projectId: null,
            src: t.src || '',
          })
        )
      })
    })
  })

  ;(v1.logs || []).forEach((l) => {
    out.logs.push(newLog({ d: l.d || now, text: l.text || '', tag: l.tag || '' }))
  })

  out.reviews = v1.reviews && typeof v1.reviews === 'object' ? v1.reviews : {}
  out.meta = { ...out.meta, migratedFrom: 1, migratedAt: now }
  return out
}
