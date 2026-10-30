import { useState, useEffect, useRef } from 'preact/hooks'
import { state, sync, replaceAll } from './store/state'
import { todayKey, weekKey, weekRange, fmtCN } from './lib/date'
import { Dialog, openDialog, closeDialog, DialogShell } from './ui/Dialog'
import { THEMES, currentTheme, applyTheme } from './store/theme'
import { exportJSON, importJSON } from './store/storage'
import { bootstrap, signOut } from './store/sync'
import { loginWithGitHub } from './store/cloud'
import { Goals, GoalsActions } from './pages/Goals'
import { Week, WeekActions } from './pages/Week'
import { Execute } from './pages/Execute'
import { Log } from './pages/Log'
import { Review } from './pages/Review'
import { Quotes } from './pages/Quotes'

export const PAGES = [
  { id: 'goals', n: '01', t: '目标', sub: '一年要什么：目标 · 项目 · 里程碑 · 关键决策' },
  { id: 'week', n: '02', t: '周计划', sub: '这周只推三件事' },
  { id: 'execute', n: '03', t: '执行', sub: '今天要落地的动作' },
  { id: 'log', n: '04', t: '记录', sub: '发生了什么，以及今天的身体状态' },
  { id: 'review', n: '05', t: '复盘', sub: '把这一周变成判断：哪条假设被证据推翻了' },
  { id: 'quotes', n: '06', t: '箴言', sub: '记下值得反复看的句子，按关系、事业、人生分开' },
]

const VIEWS = { goals: Goals, week: Week, execute: Execute, log: Log, review: Review, quotes: Quotes }
const ACTIONS = { goals: GoalsActions, week: WeekActions }

function openThemePicker() {
  const cur = currentTheme()
  openDialog(
    <DialogShell title="主题配色" submitLabel="关闭" onSubmit={closeDialog} hideCancel hideClose>
      <div class="theme-grid">
        {THEMES.map((t) => (
          <button
            type="button"
            key={t.id}
            class="theme-swatch"
            onClick={() => {
              applyTheme(t.id)
              closeDialog()
            }}
          >
            <span class="sw" style={`background:${t.color}`} />
            <span class="nm">{t.name}</span>
            {cur === t.id ? (
              <span style="margin-left:auto;font-size:11px;color:var(--accent)">当前</span>
            ) : null}
          </button>
        ))}
      </div>
    </DialogShell>
  )
}

function currentPage() {
  const h = typeof location !== 'undefined' ? location.hash.replace(/^#/, '') : ''
  return PAGES.some((p) => p.id === h) ? h : 'goals'
}

function Loading() {
  return (
    <div class="gate">
      <div class="gate-mark">Life OS</div>
      <p class="gate-hint">正在同步…</p>
    </div>
  )
}

function LoginGate() {
  return (
    <div class="gate">
      <div class="gate-mark">Life OS</div>
      <p class="gate-lead">
        你的目标、任务和记录存在自己的云端数据库里。
        <br />
        换任何设备打开这个地址，看到的都是同一份。
      </p>
      <button class="btn btn-primary gate-btn" type="button" onClick={loginWithGitHub}>
        用 GitHub 登录
      </button>
      <p class="gate-hint">只有你能进。别人打开这个地址，只会看到这扇门。</p>
    </div>
  )
}

export function App() {
  const [page, setPage] = useState(currentPage)
  const fileRef = useRef(null)

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    const onHash = () => setPage(currentPage())
    window.addEventListener('hashchange', onHash)
    if (!location.hash) location.hash = '#goals'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const sy = sync.value
  if (sy.mode === 'loading') return <Loading />
  if (sy.mode === 'anon') return <LoginGate />

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

  const syncLabel =
    sy.mode === 'cloud'
      ? `已同步 ${new Date(sy.lastSync || Date.now()).toTimeString().slice(0, 5)}`
      : sy.mode === 'offline'
        ? '离线 · 只在本地'
        : '本地模式'

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

          <div class="sync-line">
            <span class={`dot ${sy.mode}`} />
            <span>{syncLabel}</span>
            {sy.mode === 'cloud' ? (
              <button class="link-btn" type="button" onClick={() => signOut()}>
                退出
              </button>
            ) : null}
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
            <p class="page-sub">{page === 'execute' ? `${fmtCN()} · ${meta.sub}` : meta.sub}</p>
          </div>
          <div class="topbar-actions">
            {Actions ? <Actions /> : null}
            <button
              class="theme-dot"
              type="button"
              title="主题配色"
              aria-label="主题配色"
              onClick={openThemePicker}
            />
          </div>
        </header>

        <View page={page} />
      </main>

      <nav class="tabbar">
        {PAGES.map((p) => (
          <a key={p.id} class="tab" href={`#${p.id}`} aria-current={p.id === page ? 'page' : undefined}>
            {p.t}
          </a>
        ))}
      </nav>

      <Dialog />
    </div>
  )
}
