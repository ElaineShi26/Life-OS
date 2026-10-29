import { fail, readCookie, createSession, sessionCookie } from '../_utils'

// GET /api/auth/callback —— GitHub 回跳
export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const saved = readCookie(request, 'los_oauth_state')

  if (!code || !state || !saved || state !== saved) {
    return fail('state 校验失败，请重新登录', 400)
  }

  // 1. code 换 token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  })
  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenData.access_token) return fail('GitHub 授权失败，请重试', 400)

  // 2. 读用户
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'life-os',
      Accept: 'application/vnd.github+json',
    },
  })
  const gh = await userRes.json().catch(() => ({}))
  if (!gh.id) return fail('读不到 GitHub 账号信息', 400)

  const userId = String(gh.id)
  const now = Date.now()

  await env.DB.prepare(
    `INSERT INTO users (id, github_id, login, name, avatar, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       login = excluded.login,
       name  = excluded.name,
       avatar = excluded.avatar`
  )
    .bind(userId, String(gh.id), gh.login, gh.name || gh.login, gh.avatar_url || '', now)
    .run()

  const token = await createSession(context, userId)

  const headers = new Headers()
  headers.set('Location', '/')
  headers.append('Set-Cookie', sessionCookie(token))
  headers.append('Set-Cookie', 'los_oauth_state=; Path=/; Max-Age=0')
  return new Response(null, { status: 302, headers })
}
