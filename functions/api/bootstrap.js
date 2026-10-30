import { json, readCookie, SESSION_COOKIE } from './_utils'

// GET /api/bootstrap —— 一次拿到「登录态 + 整库数据」，替代原来的串行两次请求
export async function onRequestGet(context) {
  const { env } = context
  const token = readCookie(context.request, SESSION_COOKIE)

  if (!token) return json({ user: null, rev: 0, state: null })

  // 一条 SQL 同时取用户、会话和数据，少一次往返
  const row = await env.DB.prepare(
    `SELECT u.id, u.login, u.name, u.avatar, s.expires_at,
            st.payload, st.rev, st.updated_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN states st ON st.user_id = u.id
      WHERE s.token = ?`
  )
    .bind(token)
    .first()

  if (!row) return json({ user: null, rev: 0, state: null })

  if (row.expires_at < Date.now()) {
    context.waitUntil(env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run())
    return json({ user: null, rev: 0, state: null })
  }

  let state = null
  if (row.payload) {
    try {
      state = JSON.parse(row.payload)
    } catch {
      state = null
    }
  }

  // 备份放在响应之后跑，不占用户等待时间
  context.waitUntil(snapshot(context, row.id, row.payload, row.rev))

  return json({
    user: { id: row.id, login: row.login, name: row.name, avatar: row.avatar },
    rev: row.rev || 0,
    updatedAt: row.updated_at || 0,
    state,
  })
}

async function snapshot(context, userId, payload, rev) {
  if (!payload) return
  const { DB } = context.env
  const now = Date.now()
  try {
    const last = await DB.prepare(
      'SELECT created_at FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    )
      .bind(userId)
      .first()
    if (last && now - last.created_at < 20 * 3600 * 1000) return

    await DB.prepare(
      'INSERT INTO backups (id, user_id, payload, rev, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), userId, payload, rev || 0, now)
      .run()

    await DB.prepare(
      `DELETE FROM backups
        WHERE user_id = ?
          AND id NOT IN (
            SELECT id FROM backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 12
          )`
    )
      .bind(userId, userId)
      .run()
  } catch {
    /* 备份失败不影响主流程 */
  }
}
