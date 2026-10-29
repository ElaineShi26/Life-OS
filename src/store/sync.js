import { state, sync } from './state'
import { normalize } from './model'
import { fetchMe, fetchRemote, pushRemote, logout as apiLogout } from './cloud'

export async function bootstrap() {
  sync.value = { mode: 'loading', user: null, lastSync: 0, error: null }

  const me = await fetchMe()

  // 没有后端：纯本地模式（本地 dev 或静态托管）
  if (!me.available) {
    sync.value = { mode: 'local', user: null, lastSync: 0, error: null }
    return
  }

  if (!me.user) {
    sync.value = { mode: 'anon', user: null, lastSync: 0, error: null }
    return
  }

  const remote = await fetchRemote()

  if (!remote.ok) {
    sync.value = { mode: 'offline', user: me.user, lastSync: 0, error: remote.reason }
    return
  }

  if (remote.state && typeof remote.state === 'object') {
    // 云端有数据：以云端为准
    state.value = normalize(remote.state)
  } else {
    // 云端是空的：把本地已有的搬上去（首次登录 / 从旧版迁移）
    const local = state.value
    const hasLocal =
      (local.goals?.length || 0) +
        (local.projects?.length || 0) +
        (local.tasks?.length || 0) +
        (local.logs?.length || 0) >
      0
    if (hasLocal) {
      await pushRemote(local)
    }
  }

  sync.value = { mode: 'cloud', user: me.user, lastSync: Date.now(), error: null }
}

export async function pushNow() {
  if (sync.value.mode !== 'cloud') return
  const r = await pushRemote(state.value)
  sync.value = r.ok
    ? { ...sync.value, lastSync: Date.now(), error: null }
    : { ...sync.value, error: r.reason }
}

export async function signOut() {
  await apiLogout()
  sync.value = { mode: 'anon', user: null, lastSync: 0, error: null }
}
