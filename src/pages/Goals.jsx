import { useState } from 'preact/hooks'
import {
  state,
  addGoal,
  updateGoal,
  removeGoal,
  addProject,
  updateProject,
  removeProject,
  addMilestone,
  toggleMilestone,
  removeMilestone,
  addDecision,
  updateDecision,
  removeDecision,
  addSeriesPoint,
} from '../store/state'
import {
  goalPace,
  projectsOf,
  projectProgress,
  projectTaskStats,
  paceLabel,
  latestValue,
  sortedSeries,
  metricRatio,
} from '../store/progress'
import { yearProgress, daysLeftInYear, fmtShort, todayKey } from '../lib/date'
import { openDialog, closeDialog, DialogShell, Field, Select } from '../ui/Dialog'
import { Spark } from '../ui/Spark'

const pct = (n) => Math.round(n * 100)

/* ------------------------------ 弹窗 ------------------------------ */

function openNewGoal() {
  openDialog(
    <DialogShell title="新建年度目标" submitLabel="创建" onSubmit={(d) => {
      if (!d.title?.trim()) return
      addGoal({
        title: d.title.trim(),
        why: d.why?.trim() || '',
        type: d.type,
        unit: d.unit?.trim() || '',
        startValue: d.startValue === '' ? null : Number(d.startValue),
        targetValue: d.targetValue === '' ? null : Number(d.targetValue),
        year: Number(d.year) || new Date().getFullYear(),
      })
      closeDialog()
    }}>
      <Field label="目标" name="title" placeholder="例：写完那本书" hint="一句话，动词开头" />
      <Field label="为什么重要" name="why" rows={2} placeholder="半年后你靠这句话说服自己继续" />
      <div class="field">
        <label>类型</label>
        <select name="type">
          <option value="outcome">成果型（有终点，用项目和里程碑推进）</option>
          <option value="metric">数值型（要拉一条曲线，如体重、存款）</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>起始值（数值型才填）</label>
          <input name="startValue" type="number" step="any" placeholder="72" />
        </div>
        <div class="field">
          <label>目标值</label>
          <input name="targetValue" type="number" step="any" placeholder="66" />
        </div>
      </div>
      <Field label="单位" name="unit" placeholder="kg / 万 / 小时" hint="可留空" />
    </DialogShell>
  )
}

function FieldRow({ children }) {
  return <div class="field-row">{children}</div>
}

function openEditGoal(goal) {
  openDialog(
    <DialogShell title="编辑目标" submitLabel="保存"
      onDelete={() => {
        if (confirm(`删除「${goal.title}」？下属项目和里程碑会一起消失。`)) {
          removeGoal(goal.id)
          closeDialog()
        }
      }}
      onSubmit={(d) => {
        updateGoal(goal.id, {
          title: d.title.trim(),
          why: d.why.trim(),
          type: d.type,
          unit: d.unit.trim(),
          startValue: d.startValue === '' ? null : Number(d.startValue),
          targetValue: d.targetValue === '' ? null : Number(d.targetValue),
        })
        closeDialog()
      }}>
      <Field label="目标" name="title" value={goal.title} />
      <Field label="为什么重要" name="why" rows={2} value={goal.why} />
      <div class="field">
        <label>类型</label>
        <select name="type" value={goal.type}>
          <option value="outcome">成果型</option>
          <option value="metric">数值型</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>起始值</label>
          <input name="startValue" type="number" step="any" value={goal.startValue ?? ''} />
        </div>
        <div class="field">
          <label>目标值</label>
          <input name="targetValue" type="number" step="any" value={goal.targetValue ?? ''} />
        </div>
      </div>
      <Field label="单位" name="unit" value={goal.unit} />
    </DialogShell>
  )
}

function openNewProject(goalId) {
  openDialog(
    <DialogShell title="新建项目" submitLabel="创建" onSubmit={(d) => {
      if (!d.title?.trim()) return
      addProject({
        goalId,
        title: d.title.trim(),
        start: d.start || '',
        end: d.end || '',
        weight: Number(d.weight) || 1,
      })
      closeDialog()
    }}>
      <Field label="项目" name="title" placeholder="例：完成初稿" hint="一个能被完成的最小闭环" />
      <div class="field-row">
        <div class="field">
          <label>开始</label>
          <input name="start" type="date" />
        </div>
        <div class="field">
          <label>截止</label>
          <input name="end" type="date" />
        </div>
      </div>
      <Field label="权重" name="weight" type="number" value="1" hint="影响它在总进度里的占比，默认 1" />
    </DialogShell>
  )
}

function openAddMilestone(project) {
  openDialog(
    <DialogShell title={`里程碑 · ${project.title}`} submitLabel="添加" onSubmit={(d) => {
      if (!d.title?.trim()) return
      addMilestone(project.id, d.title.trim(), d.due || '')
      closeDialog()
    }}>
      <Field label="里程碑" name="title" placeholder="例：交第一版给编辑" />
      <Field label="截止" name="due" type="date" />
    </DialogShell>
  )
}

function openAddDecision(project) {
  openDialog(
    <DialogShell title={`关键决策 · ${project.title}`} submitLabel="记下" onSubmit={(d) => {
      if (!d.question?.trim()) return
      addDecision({
        projectId: project.id,
        question: d.question.trim(),
        options: d.options.split('\n').map((x) => x.trim()).filter(Boolean),
        choice: d.choice?.trim() || '',
        rationale: d.rationale?.trim() || '',
        status: d.choice?.trim() ? 'decided' : 'open',
      })
      closeDialog()
    }}>
      <Field label="要决定什么" name="question" placeholder="例：初稿找谁写序" />
      <Field label="选项" name="options" rows={3} placeholder="一行一个" hint="写下来才能比较" />
      <Field label="选了哪个" name="choice" placeholder="还没定就留空" />
      <Field label="为什么" name="rationale" rows={3} hint="这条比结论重要" />
    </DialogShell>
  )
}

function openSeriesPoint(goal) {
  const cur = latestValue(goal)
  openDialog(
    <DialogShell title={`记录 · ${goal.title}`} submitLabel="保存" onSubmit={(d) => {
      addSeriesPoint(goal.id, d.date || todayKey(), d.value)
      closeDialog()
    }}>
      <Field label="今天的值" name="value" type="number" value={cur ?? ''} placeholder="0" />
      <Field label="日期" name="date" type="date" value={todayKey()} />
      {goal.unit ? <p class="hint" style="font-size:11px;color:var(--ink-3)">单位：{goal.unit}</p> : null}
    </DialogShell>
  )
}

/* ------------------------------ 操作按钮 ------------------------------ */

export function GoalsActions() {
  return (
    <button class="btn btn-primary" type="button" onClick={openNewGoal}>
      新建目标
    </button>
  )
}

/* ------------------------------ 页面 ------------------------------ */

export function Goals() {
  const s = state.value
  const [openProjectId, setOpenProjectId] = useState(null)

  const year = new Date().getFullYear()
  const goals = [...s.goals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const looseDecisions = s.decisions.filter((d) => !d.projectId)

  const tp = yearProgress(year)
  const left = daysLeftInYear(year)
  const dropped = s.projects.filter((p) => p.status === 'dropped')

  if (!goals.length) {
    return (
      <>
        {looseDecisions.length ? <LooseDecisions items={looseDecisions} /> : null}
        <div class="empty">
          <p class="empty-strong">还没有年度目标</p>
          <p>
            目标不是清单，是取舍。一年 3 到 5 个就够——写下来之后再问自己：如果只能完成一个，是哪个？
          </p>
          <button class="btn btn-primary" type="button" onClick={openNewGoal}>
            新建第一个目标
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div class="goal-year-head">
        <span class="y">
          {year} · 已过 {pct(tp)}% · 剩 {left} 天
        </span>
        <span class="meta">
          <span>{goals.filter((g) => g.status === 'active').length} 个进行中</span>
        </span>
      </div>

      {looseDecisions.length ? <LooseDecisions items={looseDecisions} /> : null}

      {goals.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          year={year}
          openProjectId={openProjectId}
          setOpenProjectId={setOpenProjectId}
        />
      ))}

      {dropped.length ? (
        <details class="abandoned">
          <summary>已放弃 {dropped.length} 项 · 为什么放弃比完成了什么更能说明问题</summary>
          <div class="abandoned-list">
            {dropped.map((p) => (
              <div class="abandoned-item" key={p.id}>
                <div class="ai-title">{p.title}</div>
                <div class="ai-reason">{p.droppedReason || '当时没记原因'}</div>
                {p.droppedAt ? <div class="ai-meta">{fmtShort(p.droppedAt)}</div> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  )
}

function LooseDecisions({ items }) {
  return (
    <div class="rev-block">
      <div class="section-head">
        <h2>待决 · 不属于任何项目</h2>
        <span class="count">{items.filter((d) => d.status === 'open').length} 待定</span>
      </div>
      <div class="prio-list">
        {items.map((d) => (
          <div class="prio" key={d.id}>
            <span class="num">{d.status === 'open' ? '?' : '·'}</span>
            <span class="txt">{d.question}</span>
            {d.choice ? <span class="goal-tag">{d.choice}</span> : null}
            <button
              class="btn btn-ghost"
              type="button"
              onClick={() => {
                const choice = prompt(`选了哪个？（当前：${d.choice || '未定'}）`, d.choice || '')
                if (choice === null) return
                const why = prompt('为什么？', d.rationale || '')
                updateDecision(d.id, {
                  choice,
                  rationale: why || d.rationale,
                  status: choice.trim() ? 'decided' : 'open',
                })
              }}
            >
              记结果
            </button>
            <button
              class="btn btn-ghost"
              type="button"
              onClick={() => {
                if (confirm('删除这条决策？')) removeDecision(d.id)
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoalCard({ goal, year, openProjectId, setOpenProjectId }) {
  const s = state.value
  const ps = projectsOf(goal, s.projects)
  const { progress, time, delta } = goalPace(goal, s.projects, s.tasks, year)
  const pace = paceLabel(delta)
  const isMetric = goal.type === 'metric'
  const cur = isMetric ? latestValue(goal) : null
  // 成果型目标没有可计算的进度来源时，0% 不是「落后」，是「还没开始」
  // 两种情况：① 一个项目都没有 ② 有项目但里面没里程碑也没任务
  const measurable = ps.some(
    (p) => (p.milestones || []).length > 0 || s.tasks.some((t) => t.projectId === p.id)
  )
  const needsBreakdown = !isMetric && !measurable
  const pendingLabel = ps.length ? '未开始' : '待拆解'

  return (
    <article class="goal-card">
      <div class="goal-head">
        <div style="min-width:0;flex:1">
          <div class="goal-title">{goal.title}</div>
          {goal.why ? <p class="goal-why">{goal.why}</p> : null}
          {goal.status !== 'active' ? (
            <span class="chip" style="margin-top:6px">
              {goal.status === 'done' ? '已完成' : '已放弃'}
            </span>
          ) : null}
        </div>
        <div class="goal-right">
          {needsBreakdown ? (
            <div class="goal-pending">{pendingLabel}</div>
          ) : (
            <>
              <div class="goal-pct">
                {pct(progress)}
                <small>%</small>
              </div>
              <div class={`pace ${pace.tone}`}>{pace.text}</div>
            </>
          )}
        </div>
      </div>

      {isMetric ? (
        <div class="dual">
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
            <span style="font-family:var(--mono);font-size:22px;font-weight:600">
              {cur == null ? '—' : cur}
            </span>
            <span style="font-size:12px;color:var(--ink-3)">
              {goal.unit} → 目标 {goal.targetValue ?? '—'}
              {goal.unit}
            </span>
            <button
              class="btn btn-ghost"
              type="button"
              style="margin-left:auto"
              onClick={() => openSeriesPoint(goal)}
            >
              + 记录
            </button>
          </div>
          <Spark points={sortedSeries(goal).map((p) => p.v)} height={38} />
        </div>
      ) : needsBreakdown ? (
        <div class="dual">
          <p class="dual-hint">
            {ps.length
              ? '项目里还没有里程碑或任务，进度无从算起。给项目加个里程碑，或者把任务挂到它下面。'
              : '拆出第一个项目之后，这里才开始计算进度。目标拆不成项目，说明它还不够具体。'}
          </p>
        </div>
      ) : (
        <div class="dual">
          <div class="track">
            <i style={`width:${pct(progress)}%`} />
          </div>
          <div class="track t">
            <i style={`width:${pct(time)}%`} />
          </div>
          <div class="legend">
            <span>
              进度 <b>{pct(progress)}%</b>
            </span>
            <span>
              时间 <b>{pct(time)}%</b>
            </span>
          </div>
        </div>
      )}

      <div class="projects">
        {ps.length ? (
          ps.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              tasks={s.tasks}
              open={openProjectId === p.id}
              onToggle={() => setOpenProjectId(openProjectId === p.id ? null : p.id)}
            />
          ))
        ) : isMetric ? null : (
          <div class="project-row" style="cursor:pointer" onClick={() => openNewProject(goal.id)}>
            <div class="pj-main">
              <div class="pj-sub" style="color:var(--accent)">
                + 拆出第一个项目（例：完成初稿）
              </div>
            </div>
          </div>
        )}
      </div>

      <div class="goal-foot">
        <button class="btn" type="button" onClick={() => openNewProject(goal.id)}>
          + 项目
        </button>
        {isMetric ? (
          <button class="btn" type="button" onClick={() => openSeriesPoint(goal)}>
            记数值
          </button>
        ) : null}
        <button class="btn" type="button" onClick={() => openEditGoal(goal)}>
          编辑
        </button>
      </div>
    </article>
  )
}

function ProjectRow({ project, tasks, open, onToggle }) {
  const prog = projectProgress(project, tasks)
  const stats = projectTaskStats(project, tasks)
  const ms = project.milestones || []
  const ds = taskDecisions(project)

  return (
    <>
      <div class={`project-row ${project.status === 'done' ? 'pj-done' : ''}`}>
        <div class="pj-main" style="cursor:pointer" onClick={onToggle}>
          <div class="pj-title">{project.title}</div>
          <div class="pj-sub">
            {ms.length ? (
              <span>
                里程碑 {ms.filter((m) => m.done).length}/{ms.length}
              </span>
            ) : null}
            {stats.total ? (
              <span>
                任务 {stats.done}/{stats.total}
              </span>
            ) : null}
            {!ms.length && !stats.total ? (
              <span style="color:var(--warn)">还没内容 · 点开加里程碑</span>
            ) : null}
          </div>
        </div>
        <div class="pj-bar">
          <div class="bar">
            <i style={`width:${pct(prog)}%`} />
          </div>
        </div>
        <div class="pj-pct">{pct(prog)}%</div>
        <button class="btn btn-ghost" type="button" onClick={onToggle}>
          {open ? '−' : '›'}
        </button>
      </div>

      {open ? (
        <div style="padding:12px 16px 14px;background:var(--surface-2);border-bottom:1px solid var(--line)">
          <div class="section-head">
            <h2>里程碑</h2>
            <button class="btn btn-ghost" type="button" onClick={() => openAddMilestone(project)}>
              + 添加
            </button>
          </div>
          {ms.length ? (
            <div class="ms-list">
              {ms.map((m) => (
                <label class={`ms ${m.done ? 'done' : ''}`} key={m.id}>
                  <input
                    type="checkbox"
                    checked={m.done}
                    onChange={() => toggleMilestone(project.id, m.id)}
                  />
                  <span>{m.title}</span>
                  {m.due ? <span class="due">{fmtShort(m.due)}</span> : null}
                  <button
                    class="btn btn-ghost"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      removeMilestone(project.id, m.id)
                    }}
                  >
                    ✕
                  </button>
                </label>
              ))}
            </div>
          ) : (
            <p style="font-size:12px;color:var(--ink-3);padding:4px 0 8px">
              没有里程碑时，进度按挂在这个项目下的任务算。
            </p>
          )}

          <div class="section-head" style="margin-top:16px">
            <h2>关键决策</h2>
            <button class="btn btn-ghost" type="button" onClick={() => openAddDecision(project)}>
              + 记录
            </button>
          </div>
          {ds.length ? (
            ds.map((d) => (
              <div class="rev-line" key={d.id}>
                <span class="d">{fmtShort(d.date)}</span>
                <span class="t">
                  {d.question}
                  {d.choice ? (
                    <b style="font-weight:500;color:var(--accent)"> → {d.choice}</b>
                  ) : null}
                  {d.rationale ? (
                    <span style="color:var(--ink-3)">　{d.rationale}</span>
                  ) : null}
                </span>
                <button
                  class="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    if (confirm('删除这条决策？')) removeDecision(d.id)
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p style="font-size:12px;color:var(--ink-3);padding:4px 0">
              项目里的每个「要不要」都记在这里，半年后回看才知道判断错在哪。
            </p>
          )}

          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn" type="button" onClick={() => openEditProject(project)}>
              编辑项目
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function taskDecisions(project) {
  return state.value.decisions
    .filter((d) => d.projectId === project.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

function openEditProject(project) {
  openDialog(
    <DialogShell title="编辑项目" submitLabel="保存"
      onDelete={() => {
        if (confirm(`删除项目「${project.title}」？任务会解绑但不会删除。`)) {
          removeProject(project.id)
          closeDialog()
        }
      }}
      onSubmit={(d) => {
        const reason = (d.droppedReason || '').trim()
        if (d.status === 'dropped' && !reason) {
          alert('放弃要留下原因。「做不到」和「不想做」是两回事，三个月后你分不清。')
          return
        }
        updateProject(project.id, {
          title: d.title.trim(),
          start: d.start || '',
          end: d.end || '',
          weight: Number(d.weight) || 1,
          status: d.status,
          droppedReason: d.status === 'dropped' ? reason : project.droppedReason || '',
          droppedAt: d.status === 'dropped' ? todayKey() : project.droppedAt || '',
        })
        closeDialog()
      }}>
      <Field label="项目" name="title" value={project.title} />
      <div class="field-row">
        <div class="field">
          <label>开始</label>
          <input name="start" type="date" value={project.start || ''} />
        </div>
        <div class="field">
          <label>截止</label>
          <input name="end" type="date" value={project.end || ''} />
        </div>
      </div>
      <Field label="权重" name="weight" type="number" value={project.weight ?? 1} />
      <div class="field">
        <label>状态</label>
        <select name="status" value={project.status}>
          <option value="active">进行中</option>
          <option value="paused">暂停</option>
          <option value="done">已完成</option>
          <option value="dropped">已放弃</option>
        </select>
      </div>
      <Field
        label="放弃原因（改状态为「已放弃」时必填）"
        name="droppedReason"
        rows={2}
        value={project.droppedReason || ''}
        placeholder="例：这个月优先做别的，等 Q2 再看"
        hint="这条会留在「已放弃」清单里，季度回顾时用得上"
      />
    </DialogShell>
  )
}
