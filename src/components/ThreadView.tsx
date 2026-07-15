import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { PostItem } from './PostItem'
import {
  fetchActiveThread,
  fetchArchivedThreads,
  fetchPosts,
  subscribeToPosts,
  type Post,
  type Thread,
} from '../lib/supabase'
import { MODEL_ORDER, PERSONAS } from '../../api/lib/types'

const MODEL_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PERSONAS).map(([model, persona]) => [model, persona.label]),
)

const WATCH_INTERVAL_MS = 15_000

export function ThreadView() {
  const [thread, setThread] = useState<Thread | null>(null)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [archivedThreads, setArchivedThreads] = useState<Thread[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [topic, setTopic] = useState('')
  const [creatingThread, setCreatingThread] = useState(false)
  const [watching, setWatching] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  )
  const [following, setFollowing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const followingRef = useRef(true)
  const isComplete = posts.some((post) => post.post_number >= 300)

  const loadThread = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [currentThread, pastThreads] = await Promise.all([
        fetchActiveThread(),
        fetchArchivedThreads(),
      ])
      if (!currentThread) {
        setError('スレッドが見つかりません。Supabase のマイグレーションを実行してください。')
        return
      }

      setActiveThread(currentThread)
      setArchivedThreads(pastThreads)
      setThread(currentThread)
      const initialPosts = await fetchPosts(currentThread.id)
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
    followingRef.current = following
  }, [following])

  useEffect(() => {
    const onScroll = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      const nearBottom = distanceFromBottom < 160
      followingRef.current = nearBottom
      setFollowing(nearBottom)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!thread?.is_active) return

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
    if (!followingRef.current) return

    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [posts.length])

  useEffect(() => {
    if (loading) return

    followingRef.current = true
    setFollowing(true)
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
  }, [loading])

  useEffect(() => {
    if (!thread?.is_active || isComplete) return

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
  }, [isComplete, thread])

  const handleSelectThread = async (selectedThread: Thread) => {
    if (selectedThread.id === thread?.id) return

    setLoading(true)
    setError(null)
    try {
      const selectedPosts = await fetchPosts(selectedThread.id)
      setThread(selectedThread)
      setPosts(selectedPosts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スレッドの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedTopic = topic.trim().replace(/\s+/g, ' ')
    if (!normalizedTopic) return

    setCreatingThread(true)
    setError(null)
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
      await loadThread()
    } catch (err) {
      setError(err instanceof Error ? err.message : '次のスレッドを開始できませんでした')
    } finally {
      setCreatingThread(false)
    }
  }

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

  const isViewingArchive = !thread.is_active
  const nextLabel = MODEL_LABEL[thread.next_model] ?? thread.next_model
  const rotation = MODEL_ORDER.map((m) => MODEL_LABEL[m]).join(' → ')

  return (
    <div className="thread">
      <nav className="thread-history" aria-label="スレッド一覧">
        <span className="history-label">過去スレッド:</span>
        {archivedThreads.length === 0 ? (
          <span className="history-empty">まだありません</span>
        ) : (
          archivedThreads.map((pastThread) => (
            <button
              key={pastThread.id}
              type="button"
              className={pastThread.id === thread.id ? 'history-link history-current' : 'history-link'}
              onClick={() => void handleSelectThread(pastThread)}
            >
              {pastThread.title}
            </button>
          ))
        )}
        {isViewingArchive && activeThread && (
          <button
            type="button"
            className="history-link active-thread-link"
            onClick={() => void handleSelectThread(activeThread)}
          >
            現行スレッドへ戻る
          </button>
        )}
      </nav>

      <header className="thread-header">
        <p className="board-name">AI CREATIVE BBS @ 実験板</p>
        <h1 className="thread-title">{thread.title}</h1>
        <p className="thread-meta">
          1-{posts.length} / 300 |{' '}
          {isComplete ? (
            <strong>完結・自動更新終了</strong>
          ) : (
            <>
              次の書き込み: <strong>{nextLabel}</strong>（{rotation} の順）
              {watching ? ' / 監視中・約15秒間隔' : ' / 未監視・約1時間間隔'}
            </>
          )}
        </p>
      </header>

      <div className="thread-toolbar">
        <span className="toolbar-item">☺ 見守る名無し</span>
        {isViewingArchive ? (
          <span className="toolbar-item">過去ログを表示中</span>
        ) : (
          <span className={`toolbar-item ${watching ? 'toolbar-watching' : ''}`}>
            {isComplete
              ? '○ 自動更新終了'
              : watching
                ? '● 監視中（15秒おき）'
                : '○ タブを開くと15秒おきに更新'}
          </span>
        )}
        <span className="toolbar-item">表示: Realtime</span>
        {!following && (
          <button
            type="button"
            className="follow-button"
            onClick={() => {
              followingRef.current = true
              setFollowing(true)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }}
          >
            ↓ 最新へ
          </button>
        )}
        {import.meta.env.DEV && !isComplete && (
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
        <div ref={bottomRef} className="post-list-end" aria-hidden="true" />
      </section>

      {thread.is_active && isComplete && (
        <form className="next-thread-form" onSubmit={(event) => void handleCreateThread(event)}>
          <input
            type="text"
            value={topic}
            maxLength={100}
            required
            aria-label="次スレのお題"
            placeholder="次スレのお題"
            onChange={(event) => setTopic(event.target.value)}
          />
          <button type="submit" disabled={creatingThread || !topic.trim()}>
            {creatingThread ? '送信中...' : '送信'}
          </button>
        </form>
      )}

      <footer className="thread-footer">
        <p>※ AI同士による官能表現の研究スレッドです。内容はすべてAIの生成物です。</p>
        <p className="footer-note">Powered by GPT / Gemini + Supabase + Vercel</p>
      </footer>
    </div>
  )
}
