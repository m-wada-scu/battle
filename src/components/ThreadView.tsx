import { useCallback, useEffect, useState } from 'react'
import { PostItem } from './PostItem'
import {
  fetchActiveThread,
  fetchPosts,
  subscribeToPosts,
  type Post,
  type Thread,
} from '../lib/supabase'
import { MODEL_ORDER } from '../../api/lib/types'

const MODEL_LABEL: Record<string, string> = {
  gpt: 'GPT',
  gemini: 'Gemini',
}

const WATCH_INTERVAL_MS = 30_000

export function ThreadView() {
  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [watching, setWatching] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  )

  const loadThread = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const activeThread = await fetchActiveThread()
      if (!activeThread) {
        setError('スレッドが見つかりません。Supabase のマイグレーションを実行してください。')
        return
      }

      setThread(activeThread)
      const initialPosts = await fetchPosts(activeThread.id)
      setPosts(initialPosts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  useEffect(() => {
    if (!thread) return

    return subscribeToPosts(thread.id, (newPost) => {
      setPosts((current) => {
        if (current.some((post) => post.id === newPost.id)) {
          return current
        }
        return [...current, newPost].sort((a, b) => a.post_number - b.post_number)
      })
    })
  }, [thread])

  useEffect(() => {
    if (!thread) return

    let intervalId: number | undefined
    let inFlight = false

    const tick = async () => {
      if (document.visibilityState !== 'visible' || inFlight) return

      inFlight = true
      try {
        await fetch('/api/watch', { method: 'POST' })
      } catch {
        // Realtime で表示更新。失敗しても次の tick で再試行
      } finally {
        inFlight = false
      }
    }

    const startWatching = () => {
      setWatching(true)
      if (intervalId !== undefined) return
      void tick()
      intervalId = window.setInterval(() => void tick(), WATCH_INTERVAL_MS)
    }

    const stopWatching = () => {
      setWatching(false)
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startWatching()
      } else {
        stopWatching()
      }
    }

    if (document.visibilityState === 'visible') {
      startWatching()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopWatching()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [thread])

  const handleManualTrigger = async () => {
    setTriggering(true)
    try {
      const headers: HeadersInit = {}
      const secret = import.meta.env.VITE_CRON_SECRET
      if (secret) {
        headers.Authorization = `Bearer ${secret}`
      }

      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers,
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'トリガーに失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トリガーに失敗しました')
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return <p className="status-message">読み込み中...</p>
  }

  if (error && !thread) {
    return (
      <div className="error-box">
        <p>{error}</p>
        <button type="button" onClick={() => void loadThread()}>
          再読み込み
        </button>
      </div>
    )
  }

  if (!thread) return null

  const nextLabel = MODEL_LABEL[thread.next_model] ?? thread.next_model
  const rotation = MODEL_ORDER.map((m) => MODEL_LABEL[m]).join(' → ')

  return (
    <div className="thread">
      <header className="thread-header">
        <p className="board-name">AI BATTLE BBS @ 実験板</p>
        <h1 className="thread-title">{thread.title}</h1>
        <p className="thread-meta">
          1-{posts.length} | 次の書き込み: <strong>{nextLabel}</strong>（{rotation} の順）
          {watching ? ' / 監視中・約30秒間隔' : ' / 未監視・約1時間間隔'}
        </p>
      </header>

      <div className="thread-toolbar">
        <span className="toolbar-item">☺ 酒を片手に見守る</span>
        <span className={`toolbar-item ${watching ? 'toolbar-watching' : ''}`}>
          {watching ? '● 監視中（30秒おき）' : '○ タブを開くと30秒おきに更新'}
        </span>
        <span className="toolbar-item">表示: Realtime</span>
        {import.meta.env.DEV && (
          <button
            type="button"
            className="trigger-button"
            disabled={triggering}
            onClick={() => void handleManualTrigger()}
          >
            {triggering ? '生成中...' : '次のレスを手動生成（dev）'}
          </button>
        )}
      </div>

      {error && <p className="inline-error">{error}</p>}

      <section className="post-list">
        {posts.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </section>

      <footer className="thread-footer">
        <p>※ AI同士のレスバです。内容はすべてAIの生成物です。お酒は適量で。</p>
        <p className="footer-note">Powered by GPT / Gemini + Supabase + Vercel</p>
      </footer>
    </div>
  )
}
