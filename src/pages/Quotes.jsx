import { useState } from 'preact/hooks'
import { state, addQuote, updateQuote, removeQuote } from '../store/state'
import { fmtShort } from '../lib/date'

export const AREAS = [
  { id: 'relation', name: '关系', note: '人际 · 爱情' },
  { id: 'career', name: '事业', note: '' },
  { id: 'life', name: '人生', note: '' },
]

const areaName = (id) => AREAS.find((a) => a.id === id)?.name || '未分类'

export function Quotes() {
  const s = state.value
  const quotes = s.quotes || []
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState({ text: '', source: '', area: 'life' })
  const [editing, setEditing] = useState(null)

  const list = (filter === 'all' ? quotes : quotes.filter((q) => q.area === filter))
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  const countOf = (id) => quotes.filter((q) => q.area === id).length

  const reset = () => setDraft({ text: '', source: '', area: draft.area })

  return (
    <>
      <div class="quote-tabs">
        <button
          type="button"
          class={filter === 'all' ? 'on' : ''}
          onClick={() => setFilter('all')}
        >
          全部 <span>{quotes.length}</span>
        </button>
        {AREAS.map((a) => (
          <button
            type="button"
            key={a.id}
            class={filter === a.id ? 'on' : ''}
            onClick={() => setFilter(a.id)}
          >
            {a.name} <span>{countOf(a.id)}</span>
          </button>
        ))}
      </div>

      <form
        class="quote-add"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.text.trim()
          if (!text) return
          addQuote({ text, source: draft.source.trim(), area: draft.area })
          reset()
        }}
      >
        <textarea
          value={draft.text}
          onInput={(e) => setDraft({ ...draft, text: e.currentTarget.value })}
          placeholder="记一句值得反复看的话…"
          rows={2}
        />
        <div class="quote-add-foot">
          <input
            value={draft.source}
            onInput={(e) => setDraft({ ...draft, source: e.currentTarget.value })}
            placeholder="出处（可选）"
          />
          <select
            value={draft.area}
            onChange={(e) => setDraft({ ...draft, area: e.currentTarget.value })}
          >
            {AREAS.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button class="btn btn-primary" type="submit">
            收下
          </button>
        </div>
      </form>

      {list.length ? (
        <div class="quote-list">
          {list.map((q) =>
            editing === q.id ? (
              <div class="quote-item editing" key={q.id}>
                <textarea
                  defaultValue={q.text}
                  autoFocus
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  class="q-text-edit"
                />
                <div class="quote-add-foot" style="margin-top:8px">
                  <input defaultValue={q.source || ''} placeholder="出处" class="q-src-edit" />
                  <select defaultValue={q.area} class="q-area-edit">
                    {AREAS.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button class="btn" type="button" onClick={() => setEditing(null)}>
                    取消
                  </button>
                  <button
                    class="btn btn-primary"
                    type="button"
                    onClick={(e) => {
                      const box = e.currentTarget.closest('.quote-item')
                      const text = box.querySelector('.q-text-edit').value.trim()
                      if (text) {
                        updateQuote(q.id, {
                          text,
                          source: box.querySelector('.q-src-edit').value.trim(),
                          area: box.querySelector('.q-area-edit').value,
                        })
                      }
                      setEditing(null)
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <figure class="quote-item" key={q.id}>
                <blockquote onClick={() => setEditing(q.id)} title="点击编辑">
                  {q.text}
                </blockquote>
                <figcaption>
                  {q.source ? <span class="q-src">—— {q.source}</span> : null}
                  <span class={`q-area ${q.area}`}>{areaName(q.area)}</span>
                  <span class="q-date">{fmtShort(q.createdAt)}</span>
                  <button class="btn btn-ghost" type="button" onClick={() => setEditing(q.id)}>
                    改
                  </button>
                  <button
                    class="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      if (confirm('删掉这句？')) removeQuote(q.id)
                    }}
                  >
                    ✕
                  </button>
                </figcaption>
              </figure>
            )
          )}
        </div>
      ) : (
        <div class="empty" style="padding:38px 20px">
          <p>
            {filter === 'all'
              ? '还没有收藏。看到一句话让你停下来的，就记在这里——它会在你以为自己已经想明白的时候，再提醒你一次。'
              : `「${areaName(filter)}」里还没有。`}
          </p>
        </div>
      )}
    </>
  )
}
