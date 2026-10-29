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
import { goalProgress } from '../store/progress'

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
          <h2>目标进展</h2>
        </div>
        {s.goals.length ? (
          s.goals.map((g) => {
            const p = goalProgress(g, s.projects, s.tasks)
            return (
              <div class="rev-line" key={g.id}>
                <span class="d">{pct(p)}%</span>
                <span class="t">
                  {g.title}
                  <span style="color:var(--ink-3)">　{g.status === 'active' ? '进行中' : '已结束'}</span>
                </span>
              </div>
            )
          })
        ) : (
          <p style="font-size:13px;color:var(--ink-3)">还没有目标。</p>
        )}
      </div>

      <div class="rev-block">
        <div class="section-head">
          <h2>这周做了什么</h2>
          <span class="count">{logs.length} 条</span>
        </div>
        {logs.length ? (
          logs.map((l) => (
            <div class="rev-line" key={l.id}>
              <span class="d">{fmtShort(l.d)}</span>
              <span class="t">
                {l.text}
                {l.tag ? <span style="color:var(--ink-3)">　#{l.tag}</span> : null}
              </span>
            </div>
          ))
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
