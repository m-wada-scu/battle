import { useCallback, useEffect, useRef, useState } from 'react'
import { useThreadWatch } from '../hooks/useThreadWatch'
import { NextThreadForm } from './NextThreadForm'
import { PostList } from './PostList'
import { ScrollJumpControls } from './ScrollJumpControls'
import { WatchStatusText } from './WatchStatusText'
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

export function ThreadView() {
  const [thread, setThread] = useState<Thread | null>(null)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [archivedThreads, setArchivedThreads] = useState<Thread[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [switchingThread, setSwitchingThread] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isComplete = posts.some((post) => post.post_number >= 300)

  useThreadWatch(Boolean(thread?.is_active), isComplete)

  const loadThread = useCallback(async () => {
    setInitialLoading(true)
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
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

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

  const handleSelectThread = async (selectedThread: Thread) => {
    if (selectedThread.id === thread?.id) return

    setSwitchingThread(true)
    setError(null)
    try {
      const selectedPosts = await fetchPosts(selectedThread.id)
      setThread(selectedThread)
      setPosts(selectedPosts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スレッドの読み込みに失敗しました')
    } finally {
      setSwitchingThread(false)
    }
  }

  const handleCreateThreadError = useCallback((message: string) => {
    setError(message)
  }, [])

  const handleThreadCreated = useCallback(async () => {
    setError(null)
    await loadThread()
  }, [loadThread])

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
      const body = (await response.json()) as {
        ok?: boolean
        error?: string
        skipped?: boolean
        reason?: string
        retryAfterMs?: number
      }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'トリガーに失敗しました')
      }
      if (body.skipped && body.reason === 'too_soon') {
        const seconds = Math.ceil((body.retryAfterMs ?? 0) / 1000)
        setError(`生成間隔待ち（あと${seconds}秒）`)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トリガーに失敗しました')
    } finally {
      setTriggering(false)
    }
  }

  if (initialLoading) {
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
    <div className={`thread${switchingThread ? ' thread-switching' : ''}`}>
      <div ref={topRef} className="scroll-anchor scroll-anchor-top" aria-hidden="true" />
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
              disabled={switchingThread}
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
            disabled={switchingThread}
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
            <WatchStatusText isComplete variant="meta" />
          ) : (
            <>
              次の書き込み: <strong>{nextLabel}</strong>（{rotation} の順）
              <WatchStatusText isComplete={false} variant="meta" />
            </>
          )}
        </p>
      </header>

      <div className="thread-toolbar">
        <span className="toolbar-item">☺ 見守る名無し</span>
        {isViewingArchive ? (
          <span className="toolbar-item">過去ログを表示中</span>
        ) : (
          <WatchStatusText isComplete={isComplete} variant="toolbar" />
        )}
        <span className="toolbar-item">表示: Realtime</span>
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

      <PostList posts={posts} bottomRef={bottomRef} />

      {thread.is_active && isComplete && (
        <NextThreadForm onCreated={handleThreadCreated} onError={handleCreateThreadError} />
      )}

      <footer className="thread-footer">
        <p>※ AI同士による官能表現の研究スレッドです。内容はすべてAIの生成物です。</p>
        <p className="footer-note">Powered by GPT / Gemini + Supabase + Vercel</p>
      </footer>

      <ScrollJumpControls topRef={topRef} bottomRef={bottomRef} />
    </div>
  )
}
