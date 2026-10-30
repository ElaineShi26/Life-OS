import { useState, useRef } from 'preact/hooks'
import { state, setStatus, addLog, updateLog, removeLog } from '../store/state'
import { todayKey, parseKey, fmtShort, WEEKDAY_CN, pad } from '../lib/date'
import { Spark } from '../ui/Spark'
import { useVoiceInput } from '../ui/useVoiceInput'

const FIELDS = [
  { k: 'sleep', label: '睡眠', unit: '小时', ph: '7.5' },
  { k: 'exercise', label: '运动', unit: '次', ph: '1' },
  { k: 'focus', label: '专注', unit: '小时', ph: '3' },
]

function lastDays(n = 14) {
  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    out.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`)
  }
  return out
}

export function Log() {
  const s = state.value
  const [editing, setEditing] = useState(null)
  const textRef = useRef(null)
  const voice = useVoiceInput({
    onText: (t) => {
      const el = textRef.current
      if (!el) return
      const cur = el.value.trim()
      el.value = cur ? cur + ' ' + t : t
      el.focus()
    },
  })
  const dk = todayKey()
  const today = s.status[dk] || {}
  const days = lastDays(14)

  const byDate = {}
  ;[...s.logs].sort((a, b) => String(b.d).localeCompare(String(a.d))).forEach((l) => {
    ;(byDate[l.d] = byDate[l.d] || []).push(l)
  })

  const groupedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <div class="section-head">
        <h2>今天的状态</h2>
        <span class="count">顺手一填，不看也行</span>
      </div>

      <div class="status-strip">
        {FIELDS.map((f) => {
          const series = days
            .map((d) => s.status[d]?.[f.k])
            .map((v) => (v == null ? null : Number(v)))
            .filter((v) => v != null)
          return (
            <div class="status-cell" key={f.k}>
              <div>
                <div class="k">{f.label}</div>
                <div class="v">
                  <input
                    type="number"
                    step="any"
                    inputmode="decimal"
                    defaultValue={today[f.k] ?? ''}
                    placeholder={f.ph}
                    onBlur={(e) => {
                      const raw = e.currentTarget.value
                      setStatus(dk, { [f.k]: raw === '' ? null : Number(raw) })
                    }}
                  />
                  <span class="u">{f.unit}</span>
                </div>
              </div>
              <div class="status-spark">
                <Spark points={series} height={18} />
              </div>
            </div>
          )
        })}
      </div>

      <form
        class="log-form"
        onSubmit={(e) => {
          e.preventDefault()
          const el = e.currentTarget
          const text = el.elements.text.value.trim()
          if (!text) return
          addLog({ d: dk, text, tag: el.elements.tag.value.trim().replace(/^#/, '') })
          el.reset()
        }}
      >
        <textarea
          name="text"
          ref={textRef}
          placeholder="今天发生了什么…"
          autocomplete="off"
        />
        {voice.error ? <div class="mic-err">{voice.error}</div> : null}
        <div class="log-form-foot">
          <button
            class={`mic-btn ${voice.recording ? 'rec' : ''}`}
            type="button"
            disabled={voice.transcribing}
            onClick={voice.toggle}
            title="语音转文字"
          >
            {voice.transcribing ? '识别中…' : voice.recording ? '● 停止' : '口述'}
          </button>
          <input name="tag" placeholder="标签（可选，如 健康 / 工作）" autocomplete="off" />
          <button class="btn btn-primary" type="submit">
            记下
          </button>
        </div>
      </form>

      {groupedDates.length ? (
        <div class="timeline">
          {groupedDates.map((d) => (
            <div class="log-day" key={d}>
              <div class="log-date">
                {fmtShort(d)}
                <span class="wd">{WEEKDAY_CN[parseKey(d).getDay()]}</span>
              </div>
              <div class="log-items">
                {byDate[d].map((l) =>
                  editing === l.id ? (
                    <div class="log-editor" key={l.id}>
                      <textarea
                        defaultValue={l.text}
                        autoFocus
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditing(null)
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            const v = e.currentTarget.value.trim()
                            if (v) updateLog(l.id, { text: v })
                            setEditing(null)
                          }
                        }}
                      />
                      <div class="log-editor-foot">
                        <input
                          defaultValue={l.tag || ''}
                          placeholder="标签"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                        <button class="btn" type="button" onClick={() => setEditing(null)}>
                          取消
                        </button>
                        <button
                          class="btn btn-primary"
                          type="button"
                          onClick={(e) => {
                            const box = e.currentTarget.closest('.log-editor')
                            const text = box.querySelector('textarea').value.trim()
                            const tag = box.querySelector('input').value.trim().replace(/^#/, '')
                            if (text) updateLog(l.id, { text, tag })
                            setEditing(null)
                          }}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div class="log-item" key={l.id}>
                      <span class="dot" />
                      <span class="body" onClick={() => setEditing(l.id)} title="点击编辑">
                        {l.text}
                      </span>
                      {l.tag ? <span class="tag">#{l.tag}</span> : null}
                      <button
                        class="btn btn-ghost"
                        type="button"
                        onClick={() => setEditing(l.id)}
                        title="编辑"
                      >
                        改
                      </button>
                      <button
                        class="btn btn-ghost"
                        type="button"
                        onClick={() => {
                          if (confirm('删除这条记录？')) removeLog(l.id)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div class="empty" style="padding:34px 20px">
          <p>
            还没有记录。一行字就够——写「今天发生了什么」比写「我怎么想」有价值得多，
            前者以后能当证据，后者过两周自己都不信。
          </p>
        </div>
      )}
    </>
  )
}
