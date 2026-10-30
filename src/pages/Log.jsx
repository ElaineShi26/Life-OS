import { useState, useRef } from 'preact/hooks'
import { state, setStatus, addLog, updateLog, removeLog } from '../store/state'
import { todayKey, parseKey, fmtShort, WEEKDAY_CN, pad } from '../lib/date'
import { Spark } from '../ui/Spark'

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
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [micErr, setMicErr] = useState('')
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const textRef = useRef(null)
  const dk = todayKey()
  const today = s.status[dk] || {}
  const days = lastDays(14)

  const byDate = {}
  ;[...s.logs].sort((a, b) => String(b.d).localeCompare(String(a.d))).forEach((l) => {
    ;(byDate[l.d] = byDate[l.d] || []).push(l)
  })

  const groupedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  async function startRecording() {
    setMicErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (!blob.size) return
        setTranscribing(true)
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': blob.type.split(';')[0] || 'audio/webm' },
            body: blob,
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) throw new Error(data?.error || '识别失败')
          const text = (data?.text || '').trim()
          if (!text) {
            setMicErr('没听清，再说一次？')
          } else if (textRef.current) {
            const cur = textRef.current.value.trim()
            textRef.current.value = cur ? cur + ' ' + text : text
            textRef.current.focus()
          }
        } catch (err) {
          setMicErr(err.message || '识别失败')
        } finally {
          setTranscribing(false)
        }
      }
      mr.start()
      recorderRef.current = mr
      setRecording(true)
      // 60 秒自动停，避免超长音频
      timerRef.current = setTimeout(() => {
        if (mr.state === 'recording') mr.stop()
      }, 60000)
    } catch (err) {
      setMicErr('麦克风用不了：' + (err?.message || '权限被拒绝'))
    }
  }

  function stopRecording() {
    clearTimeout(timerRef.current)
    const mr = recorderRef.current
    if (mr && mr.state === 'recording') mr.stop()
  }

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
        {micErr ? <div class="mic-err">{micErr}</div> : null}
        <div class="log-form-foot">
          <button
            class={`mic-btn ${recording ? 'rec' : ''}`}
            type="button"
            disabled={transcribing}
            onClick={() => (recording ? stopRecording() : startRecording())}
            title="语音转文字"
          >
            {transcribing ? '识别中…' : recording ? '● 停止' : '口述'}
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
