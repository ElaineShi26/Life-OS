import { useState } from 'preact/hooks'
import { state, setReview } from '../store/state'
import {
  weekKey,
  weekRange,
  mondayOf,
  todayKey,
  fmtShort,
  WEEKDAY_CN,
  parseKey,
  pad,
} from '../lib/date'
import { goalProgress, projectsOf } from '../store/progress'

function keyOf(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekBounds(offset = 0) {
  const mon = mondayOf()
  mon.setDate(mon.getDate() + offset * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: keyOf(mon), end: keyOf(sun), wk: weekKey(mon), mon, sun }
}

export function Review() {
  const s = state.value
  const [offset, setOffset] = useState(0)
  const { start, end, wk, mon, sun } = weekBounds(offset)

  const inRange = (d) => d >= start && d <= end

  const tasks = s.tasks.filter((t) => inRange(t.date))
  const doneTasks = tasks.filter((t) => t.done)
  const logs = s.logs.filter((l) => inRange(l.d)).sort((a, b) => String(b.d).localeCompare(String(a.d)))
  const decisions = s.decisions.filter((d) => inRange(d.date))
  const prios = s.weeks[wk]?.priorities || []
  const review = s.reviews[wk]

  const lastWeek = weekBounds(offset - 1)
  const lastPrios = s.weeks[lastWeek.wk]?.priorities || []

  // 记录按标签汇总，折叠标题里显示
  const tagCounts = logs.reduce((acc, l) => {
    if (l.tag) acc[l.tag] = (acc[l.tag] || 0) + 1
    return acc
  }, {})
  const tagSummary = Object.entries(tagCounts)
    .map(([k, v]) => `${k} ${v}`)
    .join(' / ')

  // 本周有完成任务的「项目」，反推哪些目标这周完全没动
  const touchedProjects = new Set(doneTasks.map((t) => t.projectId).filter(Boolean))
  const staleGoals = s.goals.filter((g) => {
    if (g.status !== 'active') return false
    const ps = projectsOf(g, s.projects)
    if (!ps.length) return false // 没拆项目的目标单独在目标页提示，这里不重复骂
    return !ps.some((p) => touchedProjects.has(p.id))
  })

  const pct = (n) => Math.round(n * 100)

  return (
    <>
      <div class="rev-nav">
        <button class="step" type="button" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <span class="wk">{wk}</span>
        <span class="rng">
          {mon.getMonth() + 1}/{mon.getDate()} – {sun.getMonth() + 1}/{sun.getDate()}
        </span>
        <button class="step" type="button" onClick={() => setOffset(offset + 1)}>
          ›
        </button>
        {offset !== 0 ? (
          <button class="btn btn-ghost" type="button" onClick={() => setOffset(0)}>
            回本周
          </button>
        ) : null}
        <span class="now">{offset === 0 ? '本周' : offset < 0 ? '过去' : '未来'}</span>
      </div>

      <div class="rev-stats">
        <div class="rev-stat">
          <div class="n">
            {doneTasks.length}
            <small>/{tasks.length}</small>
          </div>
          <div class="k">任务</div>
        </div>
        <div class="rev-stat">
          <div class="n">
            {prios.filter((p) => p.done).length}
            <small>/{prios.length}</small>
          </div>
          <div class="k">本周重点</div>
        </div>
        <div class="rev-stat">
          <div class="n">{logs.length}</div>
          <div class="k">记录</div>
        </div>
        <div class="rev-stat">
          <div class="n">{decisions.length}</div>
          <div class="k">决策</div>
        </div>
      </div>

      <div class="rev-block">
        <div class="section-head">
          <h2>本周事实</h2>
          <span class="count">先核对，再判断</span>
        </div>

        <div class="fact-row">
          <span class={`fact-mark ${doneTasks.length ? 'ok' : 'miss'}`}>
            {doneTasks.length ? '✓' : '—'}
          </span>
          <span class="fact-text">
            完成 <b>{doneTasks.length}</b> 项任务
            {tasks.length ? `（共排出 ${tasks.length} 项）` : ''}
          </span>
        </div>
        {doneTasks.length ? (
          <ul class="fact-sub">
            {doneTasks.slice(0, 3).map((t) => (
              <li key={t.id}>{t.text}</li>
            ))}
            {doneTasks.length > 3 ? (
              <li class="more">…还有 {doneTasks.length - 3} 项</li>
            ) : null}
          </ul>
        ) : null}

        {tasks.length - doneTasks.length > 0 ? (
          <>
            <div class="fact-row">
              <span class="fact-mark warn">{tasks.length - doneTasks.length}</span>
              <span class="fact-text">排了但没做完的</span>
            </div>
            <ul class="fact-sub">
              {tasks.filter((t) => !t.done).slice(0, 3).map((t) => (
                <li key={t.id}>{t.text}</li>
              ))}
              {tasks.length - doneTasks.length > 3 ? (
                <li class="more">…还有 {tasks.length - doneTasks.length - 3} 项</li>
              ) : null}
            </ul>
          </>
        ) : null}

        {lastPrios.length ? (
          <>
            <div class="fact-row">
              <span class="fact-mark">{lastPrios.filter((p) => p.done).length}/{lastPrios.length}</span>
              <span class="fact-text">上礼拜的三个重点，兑现了多少</span>
            </div>
            <ul class="fact-sub">
              {lastPrios.map((p) => (
                <li key={p.id} class={p.done ? 'ok' : 'miss'}>
                  {p.done ? '✓' : '✗'} {p.text}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {staleGoals.length ? (
          <div class="fact-row">
            <span class="fact-mark warn">!</span>
            <span class="fact-text">
              这周完全没动过：{staleGoals.map((g) => g.title).join('、')}
            </span>
          </div>
        ) : null}

        {!tasks.length && !logs.length ? (
          <p class="fact-empty">
            这一周什么记录都没有。没有事实的复盘，写出来只是情绪。
          </p>
        ) : null}
      </div>

      <div class="rev-block">
        <div class="section-head">
          <h2>目标进展</h2>
        </div>
        {(() => {
          const moved = s.goals.filter((g) =>
            projectsOf(g, s.projects).some((p) => touchedProjects.has(p.id))
          )
          if (!s.goals.length) {
            return <p style="font-size:13px;color:var(--ink-3)">还没有目标。</p>
          }
          if (!moved.length) {
            return (
              <p class="fact-empty">
                这周没有任何目标被推进。没动过的目标已经在上面标出来了。
              </p>
            )
          }
          return moved.map((g) => {
            const p = goalProgress(g, s.projects, s.tasks)
            return (
              <div class="rev-line" key={g.id}>
                <span class="d">{pct(p)}%</span>
                <span class="t">{g.title}</span>
              </div>
            )
          })
        })()}
      </div>

      <div class="rev-block">
        {logs.length ? (
          <details class="rev-logs">
            <summary>
              这周的记录（{logs.length} 条{tagSummary ? ` · ${tagSummary}` : ''}）
            </summary>
            <div class="rev-log-list">
              {logs.map((l) => (
                <div class="rev-line" key={l.id}>
                  <span class="d">{fmtShort(l.d)}</span>
                  <span class="t">
                    {l.text}
                    {l.tag ? <span style="color:var(--ink-3)">　#{l.tag}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : (
          <div class="rev-line muted">
            <span class="d">—</span>
            <span class="t">这一周没有留下记录。没有证据的复盘会变成自我安慰。</span>
          </div>
        )}
      </div>

      {decisions.length ? (
        <div class="rev-block">
          <div class="section-head">
            <h2>这周做的决定</h2>
          </div>
          {decisions.map((d) => (
            <div class="rev-line" key={d.id}>
              <span class="d">{fmtShort(d.date)}</span>
              <span class="t">
                {d.question}
                {d.choice ? (
                  <b style="font-weight:500;color:var(--accent)"> → {d.choice}</b>
                ) : (
                  <span style="color:var(--warn)"> 待定</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div class="rev-block">
        <div class="section-head">
          <h2>复盘</h2>
          <span class="count">哪条假设被证据推翻了</span>
        </div>
        <textarea
          class="rev-textarea"
          defaultValue={review?.note || ''}
          placeholder={
            '三个问题，各写一两句就够：\n\n1. 这周哪件事推进了，因为什么？\n2. 哪件卡住了，卡的是能力还是意愿？\n3. 下周要停止做什么？'
          }
          onBlur={(e) => setReview(wk, e.currentTarget.value)}
        />
        {review?.at ? (
          <p style="font-size:11px;color:var(--ink-3);margin-top:6px;font-family:var(--mono)">
            上次保存 {review.at}
          </p>
        ) : null}
      </div>
    </>
  )
}
