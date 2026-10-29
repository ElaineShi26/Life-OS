// 云端同步：登录态、整库读写。所有请求都在同域 /api 下。

const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    ...options,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data }
}

/**
 * 返回 { available, user }
 * available=false 表示这套部署没有接后端（本地 dev / 纯静态托管），此时降级为纯本地模式。
 */
export async function fetchMe() {
  try {
    const res = await fetch(BASE + '/auth/me', { credentials: 'include' })
    if (res.status === 404) return { available: false, user: null }
    if (!res.ok) return { available: true, user: null }
    const data = await res.json().catch(() => null)
    return { available: true, user: data?.user || null }
  } catch {
    return { available: false, user: null }
  }
}

export async function fetchRemote() {
  const { ok, status, data } = await req('/state')
  if (status === 401) return { ok: false, reason: 'unauthorized' }
  if (!ok) return { ok: false, reason: 'error' }
  return { ok: true, rev: data.rev || 0, updatedAt: data.updatedAt || 0, state: data.state }
}

export async function pushRemote(state) {
  const { ok, status, data } = await req('/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
  if (status === 401) return { ok: false, reason: 'unauthorized' }
  if (!ok) return { ok: false, reason: 'error' }
  return { ok: true, rev: data.rev, updatedAt: data.updatedAt }
}

export async function logout() {
  try {
    await req('/auth/logout', { method: 'POST' })
  } catch {
    /* 忽略 */
  }
}

export function loginWithGitHub() {
  location.href = `${BASE}/auth/github`
}
