import { useState, useRef, useEffect } from 'preact/hooks'

/**
 * 录音 → 上传 → Whisper 转文字。
 * onText 拿到识别结果后自己决定怎么用（填输入框 / 直接触发下一步）。
 */
export function useVoiceInput({ onText, maxMs = 60000 } = {}) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      const mr = recRef.current
      if (mr && mr.state === 'recording') {
        try {
          mr.stop()
        } catch {
          /* 卸载时忽略 */
        }
      }
    }
  }, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (!blob.size) return

        setTranscribing(true)
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': blob.type.split(';')[0] || 'audio/webm' },
            body: blob,
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) throw new Error(data?.error || '识别失败')
          const text = (data?.text || '').trim()
          if (!text) setError('没听清，再说一次？')
          else onText?.(text)
        } catch (err) {
          setError(err.message || '识别失败')
        } finally {
          setTranscribing(false)
        }
      }

      mr.start()
      recRef.current = mr
      setRecording(true)

      timerRef.current = setTimeout(() => {
        if (mr.state === 'recording') mr.stop()
      }, maxMs)
    } catch (err) {
      setError('麦克风用不了：' + (err?.message || '权限被拒绝'))
    }
  }

  function stop() {
    clearTimeout(timerRef.current)
    const mr = recRef.current
    if (mr && mr.state === 'recording') mr.stop()
  }

  return {
    recording,
    transcribing,
    error,
    setError,
    start,
    stop,
    toggle: () => (recording ? stop() : start()),
  }
}
