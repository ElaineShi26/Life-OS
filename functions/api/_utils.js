// Pages Functions 共用工具（下划线开头不会被当成路由）

export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  })

export const fail = (message, status = 400) => json({ error: message }, status)

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || ''
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

export const SESSION_COOKIE = 'los_session'
export const SESSION_DAYS = 90

export function sessionCookie(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

/** 从 cookie 里取当前用户，没有就返回 null */
export async function currentUser(context) {
  const token = readCookie(context.request, SESSION_COOKIE)
  if (!token) return null

  const row = await context.env.DB.prepare(
    `SELECT u.id, u.login, u.name, u.avatar, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`
  )
    .bind(token)
    .first()

  if (!row) return null
  if (row.expires_at < Date.now()) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }
  return row
}

/** 需要登录的接口用这个：未登录返回 null，由调用方返回 401 */
export async function requireUser(context) {
  return await currentUser(context)
}

export async function createSession(context, userId) {
  const token = randomToken(32)
  const now = Date.now()
  await context.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(token, userId, now + SESSION_DAYS * 864e5, now)
    .run()
  return token
}
