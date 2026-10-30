// 心情：每天一个。颜色是语义色，不跟随主题（心情不该因为换配色而变意思）

export const MOODS = [
  { key: 'happy', label: '开心', color: '#D9A227' },
  { key: 'calm', label: '平静', color: '#4A7C9E' },
  { key: 'full', label: '充实', color: '#2E7D5B' },
  { key: 'tangled', label: '纠结', color: '#7B5EA7' },
  { key: 'anxious', label: '焦虑', color: '#C2723A' },
  { key: 'tired', label: '疲惫', color: '#8a8071' },
  { key: 'sad', label: '难过', color: '#5B7A9D' },
]

export const moodOf = (key) => MOODS.find((m) => m.key === key) || null
