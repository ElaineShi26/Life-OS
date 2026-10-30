import { json, fail, requireUser } from './_utils'

// Workers AI 模型。中文任务拆解用 Qwen 比 Llama 稳。
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'

const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function keyOf(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 模型偶尔会用 ```json 包一层，或者前后带解释，这里只截 JSON 本体 */
function extractJSON(s) {
  if (!s) return null
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try {
    return JSON.parse(s.slice(a, b + 1))
  } catch {
    return null
  }
}

export async function onRequestPost(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)

  if (!context.env.AI) return fail('服务端未启用 AI 绑定', 500)

  let body
  try {
    body = await context.request.json()
  } catch {
    return fail('请求体不是合法 JSON', 400)
  }

  const text = String(body?.text || '').trim()
  if (!text) return fail('说点什么', 400)
  if (text.length > 500) return fail('一句话别超过 500 字', 400)

  // 日期由前端传上来，避免 Worker 的 UTC 与用户本地日期错位
  const todayKey = /^\d{4}-\d{2}-\d{2}$/.test(body?.today || '')
    ? body.today
    : keyOf(new Date())

  const [y, m, d] = todayKey.split('-').map(Number)
  const today = new Date(y, m - 1, d)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const after = new Date(today)
  after.setDate(today.getDate() + 2)

  const sys = [
    '你是一个任务解析器，把用户的一句话拆成若干条待办。',
    `今天的日期是 ${todayKey}（${WD[today.getDay()]}）。`,
    '规则：',
    '1. 每件事单独一条，动词开头，贴近原话，不要补充用户没说过的细节。',
    '2. 有时间线索时给出 date，格式 YYYY-MM-DD；完全没有时间线索就给 null。',
    `   「明天」= ${keyOf(tomorrow)}，「后天」= ${keyOf(after)}，「今天」= ${todayKey}。`,
    '   「周五」这类说法，取今天之后最近的这一天。',
    '   「上午/下午/晚上/中午/睡前」这类只表示时段、没说是哪天，一律算今天。',
    '   用户在一句话里连续说几件事、只开头提了一次时间（如"明天上午A，下午B"），后面的沿用前面的日期。',
    '3. text 保持简短，不超过 30 个字。',
    '4. 如果这句话里没有任何可执行的动作，返回 {"tasks":[]}。',
    '5. 只输出 JSON，不要解释，不要 markdown 代码块。',
    '',
    '输出格式：',
    '{"tasks":[{"text":"给张三打电话","date":"2026-10-30"}]}',
  ].join('\n')

  let raw = ''
  try {
    const res = await context.env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: text },
      ],
      max_tokens: 700,
      temperature: 0.1,
    })
    raw = res?.response || ''
  } catch (e) {
    return fail('模型调用失败：' + (e?.message || 'unknown'), 502)
  }

  const parsed = extractJSON(raw)
  if (!parsed || !Array.isArray(parsed.tasks)) {
    return json({ tasks: [], raw, error: '没能解析出任务' }, 200)
  }

  const tasks = parsed.tasks
    .map((t) => {
      const label = String(t?.text || '').trim()
      if (!label) return null
      const date = /^\d{4}-\d{2}-\d{2}$/.test(t?.date || '') ? t.date : null
      return { text: label.slice(0, 60), date }
    })
    .filter(Boolean)
    .slice(0, 12)

  return json({ tasks, today: todayKey })
}
