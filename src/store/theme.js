// 主题是设备偏好，不进云端数据（手机和电脑可以各自不同）

const KEY = 'lifeos.theme'

export const THEMES = [
  { id: 'moss', name: '苔绿', color: '#2E5E52', bg: '#F7F6F3' },
  { id: 'ocean', name: '蓝白', color: '#2F5D8A', bg: '#F5F8FC' },
  { id: 'lilac', name: '淡紫', color: '#7C6BA8', bg: '#FAF8FD' },
  { id: 'rose', name: '淡粉', color: '#A45C74', bg: '#FCF7F8' },
  { id: 'shacha', name: '沙茶', color: '#B26B36', bg: '#FBF3E9' },
  { id: 'dust', name: '沙尘', color: '#8C7B5E', bg: '#F4F2EC' },
]

export function currentTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.some((t) => t.id === v) ? v : 'moss'
  } catch {
    return 'moss'
  }
}

export function applyTheme(id) {
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* 无痕模式下忽略 */
  }
  // 让 iOS 状态栏背景跟着走
  const meta = document.querySelector('meta[name="theme-color"]')
  const t = THEMES.find((x) => x.id === id)
  if (meta && t) meta.setAttribute('content', t.bg)
}
