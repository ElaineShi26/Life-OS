import { randomToken, fail } from '../_utils'

// GET /api/auth/github —— 跳去 GitHub 授权
export async function onRequestGet(context) {
  const { request, env } = context
  if (!env.GITHUB_CLIENT_ID) return fail('服务端未配置 GITHUB_CLIENT_ID', 500)

  const url = new URL(request.url)
  const state = randomToken(16)

  const auth = new URL('https://github.com/login/oauth/authorize')
  auth.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  auth.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`)
  auth.searchParams.set('scope', 'read:user')
  auth.searchParams.set('state', state)

  const headers = new Headers()
  headers.set('Location', auth.toString())
  headers.append(
    'Set-Cookie',
    `los_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  )
  return new Response(null, { status: 302, headers })
}
