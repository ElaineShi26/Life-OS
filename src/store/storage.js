import { blankState, normalize } from './model'
import { migrateV1 } from './migrate'

const KEY = 'lifeos.v2'
const V1_KEY = 'lifeos.v1'

/**
 * 本地持久化。
 * 云端同步接上之后，这里会被替换成 StorageAdapter 的另一个实现，
 * 但上层（state.js）不需要改动。
 */
export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch (e) {
    console.warn('[life-os] 读取本地数据失败', e)
  }

  // 首次运行：如果旧版本还留着数据，直接迁移过来
  try {
    const old = localStorage.getItem(V1_KEY)
    if (old) {
      const migrated = migrateV1(JSON.parse(old))
      save(migrated)
      console.info('[life-os] 已从 v1 迁移')
      return migrated
    }
  } catch (e) {
    console.warn('[life-os] v1 迁移失败', e)
  }

  return blankState()
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch (e) {
    console.warn('[life-os] 保存失败（可能超出配额）', e)
    return false
  }
}

export function clearAll() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(V1_KEY)
}

export function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `life-os-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (parsed && parsed.v === 1) return resolve(migrateV1(parsed))
        if (!parsed || typeof parsed !== 'object') throw new Error('文件格式不对')
        resolve(normalize(parsed))
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
