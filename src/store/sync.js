import { state, sync } from './state'
import { normalize } from './model'
import { save } from './storage'
import { fetchBootstrap, pushRemote, logout as apiLogout } from './cloud'

/**
 * 启动流程：
 * 1. 先用 localStorage 里的数据渲染（几乎零延迟），标记 mode='cached'
 * 2. 一个请求同时拿登录态和云端数据
 * 3. 拿到后替换数据，mode 转 'cloud'
 * 备份已经挪到服务端 waitUntil 里，不再占用户的时间
 */
export async function bootstrap() {
  const cached = state.value
  const hasCached =
    (cached.goals?.length || 0) +
      (cached.projects?.length || 0) +
      (cached.tasks?.length || 0) +
      (cached.logs?.length || 0) >
    0

  sync.value = {
    mode: hasCached ? 'cached' : 'loading',
    user: null,
    lastSync: 0,
    error: null,
  }

  const before = state.value // 记住引用：请求期间用户改过数据就不覆盖
  const res = await fetchBootstrap()

  // 没有后端：纯本地模式
  if (!res.available) {
    sync.value = { mode: 'local', user: null, lastSync: 0, error: null }
    return
  }

  if (!res.user) {
    sync.value = { mode: 'anon', user: null, lastSync: 0, error: null }
    return
  }

  if (res.state && typeof res.state === 'object') {
    if (state.value === before) {
      state.value = normalize(res.state)
      // 落一份到本地：下次打开就能先渲染，不用等网络
      save(state.value)
    }
  } else {
    // 云端是空的：把本地已有的搬上去
    const local = state.value
    const hasLocal =
      (local.goals?.length || 0) +
        (local.projects?.length || 0) +
        (local.tasks?.length || 0) +
        (local.logs?.length || 0) >
      0
    if (hasLocal) await pushRemote(local)
  }

  sync.value = { mode: 'cloud', user: res.user, lastSync: Date.now(), error: null }
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
