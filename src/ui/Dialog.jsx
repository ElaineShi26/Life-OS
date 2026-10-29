import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

/** 全局只开一个弹窗；值可以是 JSX 节点 */
export const dialogNode = signal(null)

export function openDialog(node) {
  dialogNode.value = node
}

export function closeDialog() {
  dialogNode.value = null
}

export function Dialog() {
  const ref = useRef(null)
  const node = dialogNode.value

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (node && !el.open) {
      el.showModal()
      const first = el.querySelector('input,textarea,select')
      if (first) setTimeout(() => first.focus(), 30)
    }
    if (!node && el.open) el.close()
  }, [node])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e) => {
      e.preventDefault()
      closeDialog()
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <dialog ref={ref}>
      {node ? <div class="dlg-inner">{node}</div> : null}
    </dialog>
  )
}

/** 弹窗外壳：标题 + 内容 + 按钮 */
export function DialogShell({ title, children, onSubmit, submitLabel = '保存', onDelete }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const data = Object.fromEntries(new FormData(e.currentTarget).entries())
        onSubmit?.(data, e.currentTarget)
      }}
    >
      <div class="dlg-h">
        <h3>{title}</h3>
        <button type="button" class="btn btn-ghost" onClick={closeDialog}>
          ✕
        </button>
      </div>
      {children}
      <div class="dlg-foot">
        {onDelete ? (
          <button type="button" class="btn btn-danger" onClick={onDelete} style="margin-right:auto">
            删除
          </button>
        ) : null}
        <button type="button" class="btn" onClick={closeDialog}>
          取消
        </button>
        <button type="submit" class="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export function Field({ label, name, type = 'text', value = '', placeholder = '', hint, rows }) {
  return (
    <div class="field">
      <label>{label}</label>
      {rows ? (
        <textarea name={name} placeholder={placeholder} rows={rows} value={value} />
      ) : (
        <input
          name={name}
          type={type}
          step={type === 'number' ? 'any' : undefined}
          inputmode={type === 'number' ? 'decimal' : undefined}
          value={value ?? ''}
          placeholder={placeholder}
        />
      )}
      {hint ? <span class="hint">{hint}</span> : null}
    </div>
  )
}

export function Select({ label, name, options, value }) {
  return (
    <div class="field">
      <label>{label}</label>
      <select name={name} value={value}>
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
