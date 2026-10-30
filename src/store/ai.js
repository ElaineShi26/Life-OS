import { todayKey } from '../lib/date'

/** 把一句话拆成 [{ text, date }] */
export async function parseTasks(text) {
  const res = await fetch('/api/parse', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, today: todayKey() }),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new Error(data?.error || '解析失败，稍后再试')
  }
  return {
    tasks: data?.tasks || [],
    note: data?.error || null,
  }
}
