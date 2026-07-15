import { useState, type FormEvent } from 'react'

interface NextThreadFormProps {
  onCreated: () => Promise<void>
  onError: (message: string) => void
}

export function NextThreadForm({ onCreated, onError }: NextThreadFormProps) {
  const [topic, setTopic] = useState('')
  const [creatingThread, setCreatingThread] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTopic = topic.trim().replace(/\s+/g, ' ')
    if (!normalizedTopic) return

    setCreatingThread(true)
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: normalizedTopic }),
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? '次のスレッドを開始できませんでした')
      }

      setTopic('')
      await onCreated()
    } catch (err) {
      onError(err instanceof Error ? err.message : '次のスレッドを開始できませんでした')
    } finally {
      setCreatingThread(false)
    }
  }

  const canSubmit = topic.trim().length > 0

  return (
    <form className="next-thread-form" onSubmit={(event) => void handleSubmit(event)}>
      <input
        type="text"
        value={topic}
        maxLength={100}
        required
        aria-label="次スレのお題"
        placeholder="次スレのお題"
        onChange={(event) => setTopic(event.target.value)}
      />
      <button type="submit" disabled={creatingThread || !canSubmit}>
        {creatingThread ? '送信中...' : '送信'}
      </button>
    </form>
  )
}
