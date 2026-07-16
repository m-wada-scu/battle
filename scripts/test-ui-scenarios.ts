import './load-env.ts'
import { createClient } from '@supabase/supabase-js'
import { MAX_POST_NUMBER } from '../api/lib/types.ts'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`PASS: ${message}`)
}

async function fetchActiveThread() {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function fetchArchivedThreads() {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('is_active', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

async function fetchPosts(threadId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('post_number', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

function threadViewState(thread: {
  is_active: boolean
  max_posts?: number | null
}, posts: { post_number: number }[]) {
  const maxPosts = thread.max_posts ?? MAX_POST_NUMBER
  const latestPostNumber = posts[posts.length - 1]?.post_number ?? 0
  const isComplete = latestPostNumber >= maxPosts
  const showNextThreadForm = thread.is_active && isComplete
  return { maxPosts, latestPostNumber, isComplete, showNextThreadForm }
}

async function main() {
  console.log('=== UI scenario tests ===\n')

  const archived = await fetchArchivedThreads()
  const archive300 = archived.find((t) => t.max_posts === 300)
  assert(Boolean(archive300), '300レスのアーカイブスレッドが存在する')

  const archivePosts = await fetchPosts(archive300!.id)
  assert(archivePosts.length === 300, `300レス過去ログ: 全${archivePosts.length}件取得できる`)
  assert(archivePosts[0]?.post_number === 1, '300レス過去ログ: >>1 が先頭')
  assert(archivePosts[299]?.post_number === 300, '300レス過去ログ: >>300 が末尾')
  assert(
    archivePosts[299]?.content.includes('完成稿'),
    '300レス過去ログ: >>300 に完成稿がある',
  )

  const archiveState = threadViewState(archive300!, archivePosts)
  assert(archiveState.maxPosts === 300, '300レス過去ログ: 表示上限 max_posts=300')
  assert(
    archiveState.latestPostNumber === 300,
    `300レス過去ログ: 進捗 ${archiveState.latestPostNumber}/${archiveState.maxPosts}`,
  )
  assert(archiveState.isComplete, '300レス過去ログ: 完結扱い')
  assert(
    !archiveState.showNextThreadForm,
    '300レス過去ログ: アーカイブなので次スレフォームは非表示',
  )

  const active = await fetchActiveThread()
  assert(Boolean(active), 'アクティブスレッドが存在する')

  const activePosts = await fetchPosts(active!.id)
  const activeState = threadViewState(active!, activePosts)
  assert(activePosts.length === 30, `アクティブスレッド: 全${activePosts.length}件取得`)
  assert(activeState.maxPosts === 30, 'アクティブスレッド: max_posts=30')
  assert(
    activeState.latestPostNumber === 30,
    `アクティブスレッド: 進捗 ${activeState.latestPostNumber}/${activeState.maxPosts}`,
  )
  assert(activeState.isComplete, 'アクティブスレッド: 30レス到達で完結')
  assert(
    activeState.showNextThreadForm,
    'アクティブスレッド: 次スレお題フォーム表示条件を満たす',
  )

  const watchRes = await fetch('http://127.0.0.1:3001/api/watch', { method: 'POST' })
  const watchBody = (await watchRes.json()) as { skipped?: boolean; reason?: string }
  assert(
    watchBody.skipped === true && watchBody.reason === 'thread_complete',
    'アクティブ30完結: 自動生成は thread_complete でスキップ',
  )

  const threadsRes = await fetch('http://127.0.0.1:3001/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: '次スレテストお題' }),
  })
  const threadsBody = (await threadsRes.json()) as { ok?: boolean; error?: string }
  assert(threadsRes.ok && threadsBody.ok === true, '次スレお題フォーム: POST /api/threads が成功')

  const afterActive = await fetchActiveThread()
  assert(
    afterActive?.title === '【30レス推敲】次スレテストお題',
    '次スレお題フォーム: 新スレッドが開始された',
  )
  assert(afterActive?.max_posts === 30, '次スレお題フォーム: 新スレ max_posts=30')

  const afterArchive = await fetchArchivedThreads()
  assert(
    afterArchive.some((t) => t.id === archive300!.id),
    '300レス過去ログ: 次スレ開始後もアーカイブ一覧に残る',
  )

  console.log('\n=== All tests passed ===')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
