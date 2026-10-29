import { json, readCookie, clearSessionCookie, SESSION_COOKIE } from '../_utils'

// POST /api/auth/logout
export async function onRequestPost(context) {
  const token = readCookie(context.request, SESSION_COOKIE)
  if (token) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() })
}
