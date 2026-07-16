import { useCallback, useEffect, useState } from 'react'
import { fetchArchivedThreads, type Thread } from '../lib/supabase'
import { AppLink } from './AppLink'

function formatThreadDate(iso: string): string {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

export function ArchiveListPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadArchives = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setThreads(await fetchArchivedThreads())
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadArchives()
  }, [loadArchives])

  return (
    <div className="thread archive-page">
      <header className="thread-header">
        <p className="board-name">AI CREATIVE BBS @ 実験板</p>
        <h1 className="thread-title">過去スレッド一覧</h1>
        <p className="thread-meta">
          <AppLink href="/">≫ 現行スレッドへ戻る</AppLink>
        </p>
      </header>

      <div className="archive-list-panel">
        {loading && <p className="status-message">読み込み中...</p>}
        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button type="button" onClick={() => void loadArchives()}>
              再読み込み
            </button>
          </div>
        )}
        {!loading && !error && threads.length === 0 && (
          <p className="archive-empty">まだ過去スレッドはありません。</p>
        )}
        {!loading && !error && threads.length > 0 && (
          <ul className="archive-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <AppLink href={`/archive/${thread.id}`} className="archive-list-link">
                  {thread.title}
                </AppLink>
                <span className="archive-list-date">{formatThreadDate(thread.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="thread-footer">
        <p>※ 完了したスレッドのログを表示しています。</p>
      </footer>
    </div>
  )
}
