import { useState } from 'preact/hooks'
import { state, addTask, toggleTask, removeTask, carryOver, addLog } from '../store/state'
import { todayKey, weekKey, fmtCN, parseKey, pad } from '../lib/date'
import { openDialog, closeDialog, DialogShell, Field } from '../ui/Dialog'

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function projectOptions() {
  return [
    { id: '', label: '不挂项目' },
    ...state.value.projects.map((p) => ({ id: p.id, label: p.title })),
  ]
}

export function Execute() {
  const s = state.value
  const dk = todayKey()
  const wk = weekKey()
  const [oneLine, setOneLine] = useState('')

  const tasks = s.tasks.filter((t) => t.date === dk)
  const done = tasks.filter((t) => t.done).length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  const yk = yesterdayKey()
  const carry = s.tasks.filter((t) => t.date === yk && !t.done)

  const prios = (s.weeks[wk]?.priorities) || []
  const goalName = (id) => s.goals.find((g) => g.id === id)?.title || ''
  const projName = (id) => s.projects.find((p) => p.id === id)?.title || ''

  return (
    <>
      <div class="exec-head">
        <div class="exec-num">
          <span class="a">{done}</span>
          <span class="b">/ {tasks.length}</span>
        </div>
        <div class="exec-bar">
          <div class="bar">
            <i style={`width:${pct}%`} />
          </div>
        </div>
        <div class="exec-pct">{pct}%</div>
      </div>

      {carry.length ? (
        <div class="carry">
          <span class="lbl">昨日</span>
          <span>
            <b>{carry.length}</b> 项没做完　{carry.map((c) => c.text).join(' · ')}
          </span>
          <button class="btn" type="button" onClick={() => carryOver(yk, dk)}>
            挪到今天
          </button>
        </div>
      ) : null}

      <div class="focus-strip">
        <span class="fs-label">本周重点</span>
        <div class="fs-items">
          {prios.length ? (
            prios.map((p) => (
              <span class={`fs-item ${p.done ? 'done' : ''}`} key={p.id}>
                {p.text}
                {p.goalId && goalName(p.goalId) ? (
                  <span style="color:var(--ink-3);font-size:10.5px"> · {goalName(p.goalId)}</span>
                ) : null}
              </span>
            ))
          ) : (
            <span class="fs-item" style="color:var(--ink-3)">
              还没定这周的重点
            </span>
          )}
        </div>
        <a class="fs-link" href="#week">
          周计划 →
        </a>
      </div>

      {tasks.length ? (
        <div class="task-list">
          {tasks.map((t) => (
            <div class={`task ${t.done ? 'done' : ''}`} key={t.id}>
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span class="t">{t.text}</span>
              {t.projectId && projName(t.projectId) ? (
                <span class="goaltag">{projName(t.projectId)}</span>
              ) : null}
              {t.src ? <span class="src">{t.src}</span> : null}
              <button
                class="btn btn-ghost"
                type="button"
                onClick={() => {
                  if (confirm('删除这条任务？')) removeTask(t.id)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div class="empty" style="padding:32px 20px">
          <p>今天还没有动作。别规划了，先写下一个具体到能立刻开始的动作。</p>
        </div>
      )}

      <form
        class="inline-add"
        onSubmit={(e) => {
          e.preventDefault()
          const input = e.currentTarget.elements.text
          const v = input.value.trim()
          if (!v) return
          addTask({ text: v, date: dk })
          input.value = ''
        }}
      >
        <input name="text" placeholder="今天要做的一件事…" autocomplete="off" />
        <button class="btn btn-primary" type="submit">
          添加
        </button>
      </form>

      <div class="section-head" style="margin-top:30px">
        <h2>今日一句</h2>
        <span class="count">写完直接进「记录」</span>
      </div>
      <form
        class="inline-add"
        style="margin-top:0"
        onSubmit={(e) => {
          e.preventDefault()
          const v = oneLine.trim()
          if (!v) return
          addLog({ d: dk, text: v, tag: '' })
          setOneLine('')
        }}
      >
        <input
          name="line"
          value={oneLine}
          onInput={(e) => setOneLine(e.currentTarget.value)}
          placeholder="今天发生了什么，一句话…"
          autocomplete="off"
        />
        <button class="btn" type="submit">
          记下
        </button>
      </form>
    </>
  )
}
