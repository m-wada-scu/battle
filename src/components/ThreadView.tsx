import { useCallback, useEffect, useRef, useState } from 'react'
import { useThreadWatch } from '../hooks/useThreadWatch'
import { AppLink } from './AppLink'
import { NextThreadForm } from './NextThreadForm'
import { PostList } from './PostList'
import { ScrollJumpControls } from './ScrollJumpControls'
import {
  fetchActiveThread,
  fetchPosts,
  fetchThreadById,
  subscribeToPosts,
  type Post,
  type Thread,
} from '../lib/supabase'
import { MAX_POST_NUMBER, MODEL_ORDER, modelLabel } from '../../api/lib/types'

interface ThreadViewProps {
  archiveThreadId?: string
}

export function ThreadView({ archiveThreadId }: ThreadViewProps) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isArchiveView = Boolean(archiveThreadId)
  const maxPosts = thread?.max_posts ?? MAX_POST_NUMBER
  const latestPostNumber = posts[posts.length - 1]?.post_number ?? 0
  const isComplete = latestPostNumber >= maxPosts

  useThreadWatch(Boolean(thread?.is_active && !isArchiveView), isComplete)

  const loadThread = useCallback(async () => {
    setInitialLoading(true)
    setError(null)

    try {
      const loadedThread = archiveThreadId
        ? await fetchThreadById(archiveThreadId)
        : await fetchActiveThread()

      if (!loadedThread) {
        setError(
          archiveThreadId
            ? 'スレッドが見つかりません。'
            : 'スレッドが見つかりません。Supabase のマイグレーションを実行してください。',
        )
        return
      }

      setThread(loadedThread)
      setPosts(await fetchPosts(loadedThread.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setInitialLoading(false)
    }
  }, [archiveThreadId])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  useEffect(() => {
    if (!thread?.is_active || isArchiveView) return

    return subscribeToPosts(thread.id, (newPost) => {
      setPosts((current) => {
        if (current.some((post) => post.id === newPost.id)) {
          return current
        }
        return [...current, newPost].sort((a, b) => a.post_number - b.post_number)
      })
    })
  }, [isArchiveView, thread])

  const handleCreateThreadError = useCallback((message: string) => {
    setError(message)
  }, [])

  const handleThreadCreated = useCallback(async () => {
    setError(null)
    await loadThread()
  }, [loadThread])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [])

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
        {isArchiveView && (
          <p className="error-nav">
            <AppLink href="/archive">≫ 過去スレッド一覧</AppLink>
          </p>
        )}
      </div>
    )
  }

  if (!thread) return null

  const nextLabel = modelLabel(thread.next_model)
  const rotation = MODEL_ORDER.map((m) => modelLabel(m)).join(' → ')

  return (
    <div className="thread">
      <header className="thread-header">
        <p className="board-name">AI CREATIVE BBS @ 実験板</p>
        <h1 className="thread-title">{thread.title}</h1>
        <p className="thread-meta">
          1-{latestPostNumber} / {maxPosts}
          {!isArchiveView && !isComplete && (
            <>
              {' '}
              | 次の書き込み: <strong>{nextLabel}</strong>（{rotation} の順）
            </>
          )}
          {!isArchiveView && isComplete && <> | 完結</>}
        </p>
      </header>

      {!isArchiveView && (
        <div className="thread-notice">
          <p>
            ※ GPT と Gemini がお題の初稿を交互に推敲し、AIが表現できる官能性の限界を研究する実験スレッドです。
          </p>
          <p>※ ページを開いている間だけ、約15秒おきに新しいレスが生成されます。</p>
          <p>※ スレッド完結後は、誰でも最下部のフォームから次スレのお題を投稿できます。</p>
        </div>
      )}

      <nav className="thread-nav" aria-label="スレッド移動">
        {isArchiveView ? (
          <>
            <AppLink href="/" className="thread-nav-link thread-nav-link--primary">
              ≫ 現行スレッドへ
            </AppLink>
            <AppLink href="/archive" className="thread-nav-link">
              ≫ 過去スレッド一覧
            </AppLink>
            <span className="thread-nav-label">過去ログを表示中</span>
          </>
        ) : (
          <AppLink href="/archive" className="thread-nav-link">
            ≫ 過去スレッド一覧
          </AppLink>
        )}
      </nav>

      {import.meta.env.DEV && !isComplete && !isArchiveView && (
        <div className="thread-toolbar">
          <button
            type="button"
            className="trigger-button"
            disabled={triggering}
            onClick={() => void handleManualTrigger()}
          >
            {triggering ? '生成中...' : '次のレスを手動生成（dev）'}
          </button>
        </div>
      )}

      {error && <p className="inline-error">{error}</p>}

      <PostList posts={posts} />

      {thread.is_active && isComplete && !isArchiveView && (
        <NextThreadForm onCreated={handleThreadCreated} onError={handleCreateThreadError} />
      )}

      <footer className="thread-footer">
        <p>※ AI同士による官能表現の研究スレッドです。内容はすべてAIの生成物です。</p>
        <p className="footer-note">Powered by GPT / Gemini + Supabase + Vercel</p>
      </footer>

      <div ref={bottomRef} className="scroll-anchor scroll-anchor-bottom" aria-hidden="true" />

      <ScrollJumpControls onScrollToTop={scrollToTop} onScrollToBottom={scrollToBottom} />
    </div>
  )
}
