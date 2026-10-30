import { json, fail, requireUser } from './_utils'

// Whisper large-v3-turbo：多语言，中文可用，比 whisper 基础版准
const MODEL = '@cf/openai/whisper-large-v3-turbo'
const MAX_BYTES = 20 * 1024 * 1024

/** Whisper 只接受 base64 字符串，分块编码避免大数组爆栈 */
function toBase64(bytes) {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

export async function onRequestPost(context) {
  const user = await requireUser(context)
  if (!user) return fail('未登录', 401)
  if (!context.env.AI) return fail('服务端未启用 AI 绑定', 500)

  const ct = context.request.headers.get('content-type') || ''
  if (!ct.includes('audio') && !ct.includes('octet-stream')) {
    return fail('需要音频数据', 400)
  }

  let buf
  try {
    buf = await context.request.arrayBuffer()
  } catch {
    return fail('读取音频失败', 400)
  }

  if (!buf.byteLength) return fail('空音频', 400)
  if (buf.byteLength > MAX_BYTES) return fail('音频太大，单次请控制在 60 秒内', 413)

  let res
  try {
    res = await context.env.AI.run(MODEL, {
      audio: toBase64(new Uint8Array(buf)),
      task: 'transcribe',
      language: 'zh',
      vad_filter: true,
    })
  } catch (e) {
    return fail('识别失败：' + (e?.message || 'unknown'), 502)
  }

  const text = String(res?.text || '').trim()

  // Whisper 对静音/噪音会返回这些占位词，当作没听清处理
  const junk = ['', '。', '.', '谢谢', '谢谢观看', 'Thanks for watching', '[BLANK_AUDIO]']
  if (junk.includes(text)) return json({ text: '', empty: true })

  return json({ text })
}
