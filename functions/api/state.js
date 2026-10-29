import { json, fail, requireUser } from './_utils'

const MAX_BYTES = 2_000_000

// GET /api/state —— 拉整库
export async function onRequestGet(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)

  const row = await context.env.DB.prepare(
    'SELECT payload, rev, updated_at FROM states WHERE user_id = ?'
  )
    .bind(user.id)
    .first()

  if (!row) return json({ rev: 0, updatedAt: 0, state: null })

  let state = null
  try {
    state = JSON.parse(row.payload)
  } catch {
    return fail('云端数据损坏', 500)
  }
  return json({ rev: row.rev, updatedAt: row.updated_at, state })
}

// PUT /api/state —— 写整库（后写覆盖）
export async function onRequestPut(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)

  let body
  try {
    body = await context.request.json()
  } catch {
    return fail('请求体不是合法 JSON', 400)
  }
  if (!body || typeof body.state !== 'object' || body.state === null) {
    return fail('缺少 state', 400)
  }

  const payload = JSON.stringify(body.state)
  if (payload.length > MAX_BYTES) return fail('数据超过 2MB 上限', 413)

  const now = Date.now()
  const existing = await context.env.DB.prepare('SELECT rev FROM states WHERE user_id = ?')
    .bind(user.id)
    .first()
  const rev = (existing?.rev || 0) + 1

  await context.env.DB.prepare(
    `INSERT INTO states (user_id, payload, rev, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       payload = excluded.payload,
       rev = excluded.rev,
       updated_at = excluded.updated_at`
  )
    .bind(user.id, payload, rev, now)
    .run()

  return json({ rev, updatedAt: now })
}
