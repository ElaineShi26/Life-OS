import { json, fail, requireUser } from './_utils'

const KEEP = 12
const MIN_GAP = 20 * 3600 * 1000 // 20 小时内不重复备份

// POST /api/backup —— 打一份当日快照
export async function onRequestPost(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)

  const { DB } = context.env
  const now = Date.now()

  const last = await DB.prepare(
    'SELECT created_at FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  )
    .bind(user.id)
    .first()

  if (last && now - last.created_at < MIN_GAP) {
    return json({ skipped: true, lastAt: last.created_at })
  }

  const cur = await DB.prepare('SELECT payload, rev FROM states WHERE user_id = ?')
    .bind(user.id)
    .first()
  if (!cur) return json({ skipped: true, reason: '还没有数据' })

  const id = crypto.randomUUID()
  await DB.prepare(
    'INSERT INTO backups (id, user_id, payload, rev, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, user.id, cur.payload, cur.rev, now)
    .run()

  // 只留最近 KEEP 份
  await DB.prepare(
    `DELETE FROM backups
      WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
        )`
  )
    .bind(user.id, user.id, KEEP)
    .run()

  const cnt = await DB.prepare('SELECT COUNT(*) AS n FROM backups WHERE user_id = ?')
    .bind(user.id)
    .first()

  return json({ ok: true, at: now, kept: cnt?.n ?? 0 })
}

// GET /api/backup —— 列出已有快照（不含内容，避免响应过大）
export async function onRequestGet(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)

  const rows = await context.env.DB.prepare(
    'SELECT id, rev, created_at, LENGTH(payload) AS bytes FROM backups WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(user.id)
    .all()

  return json({ backups: rows.results || [] })
}
