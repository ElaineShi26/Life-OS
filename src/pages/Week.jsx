import {
  state,
  addPriority,
  togglePriority,
  removePriority,
  addTask,
  toggleTask,
  removeTask,
  updateTask,
} from '../store/state'
import { useState, useEffect } from 'preact/hooks'
import { weekKey, weekDays, todayKey, pad, weekRange } from '../lib/date'
import { openDialog, closeDialog, DialogShell, Field } from '../ui/Dialog'
import { weekOffset } from '../store/ui'

const WD = ['一', '二', '三', '四', '五', '六', '日']

/** 相对今天偏移 n 周的日期 */
function weekBase(n) {
  const d = new Date()
  d.setDate(d.getDate() + n * 7)
  return d
}
const weekKeyAt = (n) => weekKey(weekBase(n))
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function goalOptions() {
  return [
    { id: '', label: '不挂目标' },
    ...state.value.goals.map((g) => ({ id: g.id, label: g.title })),
  ]
}

function projectOptions() {
  return [
    { id: '', label: '不挂项目' },
    ...state.value.projects.map((p) => ({ id: p.id, label: p.title })),
  ]
}

export function openAddPriority(wk) {
  const w = state.value.weeks[wk] || { priorities: [] }
  if (w.priorities.length >= 3) {
    alert('本周已经有三个重点了。真正的约束不是时间，是注意力——先删一个。')
    return
  }
  openDialog(
    <DialogShell title="加本周重点" submitLabel="加入" onSubmit={(d) => {
      if (!d.text?.trim()) return
      addPriority(wk, d.text.trim(), d.goalId || null)
      closeDialog()
    }}>
      <Field label="重点" name="text" placeholder="这周必须推进的一件事" />
      <div class="field">
        <label>挂到哪个目标</label>
        <select name="goalId">
          {goalOptions().map((o) => (
            <option value={o.id} key={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    </DialogShell>
  )
}

function openAddTask(dateKey, label) {
  openDialog(
    <DialogShell title={`添加到 ${label}`} submitLabel="添加" onSubmit={(d) => {
      if (!d.text?.trim()) return
      addTask({ text: d.text.trim(), date: dateKey, projectId: d.projectId || null })
      closeDialog()
    }}>
      <Field label="动作" name="text" placeholder="具体到能立刻开始" hint="动词开头，别写「推进项目」" />
      <div class="field">
        <label>挂到哪个项目</label>
        <select name="projectId">
          {projectOptions().map((o) => (
            <option value={o.id} key={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    </DialogShell>
  )
}

export function WeekActions() {
  const at = weekOffset.value
  return (
    <button
      class="btn btn-primary"
      type="button"
      onClick={() => openAddPriority(weekKeyAt(at))}
    >
      加个重点
    </button>
  )
}

export function Week() {
  const s = state.value
  const offset = weekOffset.value
  const base = weekBase(offset)
  const wk = weekKey(base)
  const w = s.weeks[wk] || { priorities: [], note: '' }
  const days = weekDays(base)
  const today = todayKey()

  // 离开这一页再回来，默认回到本周
  useEffect(() => {
    return () => {
      weekOffset.value = 0
    }
  }, [])

  const goalName = (id) => s.goals.find((g) => g.id === id)?.title || ''

  return (
    <>
      <div class="rev-nav">
        <button class="step" type="button" onClick={() => (weekOffset.value = offset - 1)}>
          ‹
        </button>
        <span class="wk">{wk}</span>
        <span class="rng">{weekRange(base)}</span>
        <button class="step" type="button" onClick={() => (weekOffset.value = offset + 1)}>
          ›
        </button>
        {offset !== 0 ? (
          <button class="btn btn-ghost" type="button" onClick={() => (weekOffset.value = 0)}>
            回本周
          </button>
        ) : null}
        <span class="now">{offset === 0 ? '本周' : offset < 0 ? '过去' : '未来'}</span>
      </div>

      {offset < 0 ? (
        <p class="past-note">
          这是过去的一周。补记没问题，但别改当初的重点——那一版已经进复盘了。
        </p>
      ) : null}

      <div class="section-head">
        <h2>{offset === 0 ? '本周重点' : '这一周的重点'}</h2>
        <span class="count">
          {w.priorities.filter((p) => p.done).length}/{w.priorities.length} 完成
        </span>
      </div>

      <div class="prio-list">
        {w.priorities.length ? (
          w.priorities.map((p, i) => (
            <div class={`prio ${p.done ? 'done' : ''}`} key={p.id}>
              <span class="num">{i + 1}</span>
              <input
                type="checkbox"
                checked={p.done}
                onChange={() => togglePriority(wk, p.id)}
                style="accent-color:var(--accent);width:15px;height:15px;flex-shrink:0"
              />
              <span class="txt">{p.text}</span>
              {p.goalId && goalName(p.goalId) ? (
                <span class="goal-tag">{goalName(p.goalId)}</span>
              ) : null}
              <button class="btn btn-ghost" type="button" onClick={() => removePriority(wk, p.id)}>
                ✕
              </button>
            </div>
          ))
        ) : (
          <div class="prio">
            <span class="num">—</span>
            <span class="txt" style="color:var(--ink-3)">
              这周还没有重点。三件事，多了就等于没有。
            </span>
          </div>
        )}
      </div>

      <div class="section-head">
        <h2>七天</h2>
      </div>

      <div class="week-grid">
        {days.map((d, i) => {
          const dk = keyOf(d)
          const tasks = s.tasks.filter((t) => t.date === dk)
          return (
            <div class={`day ${dk === today ? 'is-today' : ''}`} key={dk}>
              <div class="day-h">
                <span class="wd">周{WD[i]}</span>
                <span class="dd">
                  {pad(d.getMonth() + 1)}/{pad(d.getDate())}
                </span>
              </div>
              <div class="day-tasks">
                {tasks.map((t) => (
                  <label class={`tiny-task ${t.done ? 'done' : ''}`} key={t.id}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                    />
                    <span>{t.text}</span>
                  </label>
                ))}
              </div>
              <button
                class="day-add"
                type="button"
                onClick={() => openAddTask(dk, `${d.getMonth() + 1}/${d.getDate()}`)}
              >
                + 添加
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
