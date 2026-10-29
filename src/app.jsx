import { useState, useEffect } from 'preact/hooks'
import { state } from './store/state'
import { todayKey, weekKey, weekRange, fmtCN } from './lib/date'
import { useRef } from 'preact/hooks'
import { Dialog } from './ui/Dialog'
import { exportJSON, importJSON } from './store/storage'
import { replaceAll } from './store/state'
import { Goals, GoalsActions } from './pages/Goals'
import { Week, WeekActions } from './pages/Week'
import { Execute } from './pages/Execute'
import { Log } from './pages/Log'
import { Review } from './pages/Review'

export const PAGES = [
  { id: 'goals', n: '01', t: '目标', sub: '一年要什么：目标 · 项目 · 里程碑 · 关键决策' },
  { id: 'week', n: '02', t: '周计划', sub: '这周只推三件事' },
  { id: 'execute', n: '03', t: '执行', sub: '今天要落地的动作' },
  { id: 'log', n: '04', t: '记录', sub: '发生了什么，以及今天的身体状态' },
  { id: 'review', n: '05', t: '复盘', sub: '把这一周变成判断：哪条假设被证据推翻了' },
]

const VIEWS = {
  goals: Goals,
  week: Week,
  execute: Execute,
  log: Log,
  review: Review,
}

const ACTIONS = {
  goals: GoalsActions,
  week: WeekActions,
}

function currentPage() {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : ''
  return PAGES.some((p) => p.id === h) ? h : 'goals'
}

export function App() {
  const [page, setPage] = useState(currentPage)
  const fileRef = useRef(null)

  useEffect(() => {
    const onHash = () => setPage(currentPage())
    window.addEventListener('hashchange', onHash)
    if (!location.hash) location.hash = '#goals'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const s = state.value
  const View = VIEWS[page]
  const Actions = ACTIONS[page]
  const meta = PAGES.find((p) => p.id === page)

  const todayTasks = s.tasks.filter((t) => t.date === todayKey())
  const doneToday = todayTasks.filter((t) => t.done).length
  const wk = weekKey()
  const weekData = s.weeks[wk] || { priorities: [] }
  const openDecisions = s.decisions.filter((d) => d.status === 'open').length
  const activeGoals = s.goals.filter((g) => g.status === 'active').length

  return (
    <div class="shell">
      <aside class="rail">
        <div>
          <div class="brand-mark">Life OS</div>
          <div class="brand-sub">
            {wk} · {weekRange()}
          </div>
        </div>

        <nav class="rail-nav">
          {PAGES.map((p) => (
            <a
              key={p.id}
              class="nav-item"
              href={`#${p.id}`}
              aria-current={p.id === page ? 'page' : undefined}
            >
              <span class="idx">{p.n}</span>
              <span>{p.t}</span>
            </a>
          ))}
        </nav>

        <div class="rail-foot">
          <div class="rail-stat">
            目标 <b>{activeGoals}</b> · 待决 <b>{openDecisions}</b>
            <br />
            今日 <b>{doneToday}/{todayTasks.length}</b> · 本周重点{' '}
            <b>{weekData.priorities.filter((p) => p.done).length}/{weekData.priorities.length}</b>
          </div>
          <div class="rail-actions">
            <button type="button" onClick={() => exportJSON(state.value)}>
              导出
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style="display:none"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0]
                if (!file) return
                try {
                  const next = await importJSON(file)
                  if (confirm('导入会覆盖当前全部数据，继续？')) replaceAll(next)
                } catch (err) {
                  alert('导入失败：' + err.message)
                }
                e.currentTarget.value = ''
              }}
            />
          </div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <h1>{meta.t}</h1>
            <p class="page-sub">
              {page === 'execute' ? `${fmtCN()} · ${meta.sub}` : meta.sub}
            </p>
          </div>
          <div class="topbar-actions">{Actions ? <Actions /> : null}</div>
        </header>

        <View page={page} />
      </main>

      <nav class="tabbar">
        {PAGES.map((p) => (
          <a
            key={p.id}
            class="tab"
            href={`#${p.id}`}
            aria-current={p.id === page ? 'page' : undefined}
          >
            {p.t}
          </a>
        ))}
      </nav>

      <Dialog />
    </div>
  )
}
