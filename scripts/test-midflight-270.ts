import './load-env.ts'
import { createClient } from '@supabase/supabase-js'
import { MAX_POST_NUMBER } from '../api/lib/types.ts'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const service = createClient(supabaseUrl, serviceRoleKey)

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

async function fetchPosts(threadId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('post_number', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

function threadViewState(
  thread: { is_active: boolean; max_posts?: number | null },
  posts: { post_number: number }[],
) {
  const maxPosts = thread.max_posts ?? MAX_POST_NUMBER
  const latestPostNumber = posts[posts.length - 1]?.post_number ?? 0
  const isComplete = latestPostNumber >= maxPosts
  const showNextThreadForm = thread.is_active && isComplete
  return { maxPosts, latestPostNumber, isComplete, showNextThreadForm }
}

async function main() {
  console.log('=== 270レス中途現行スレッド tests ===\n')

  const active = await fetchActiveThread()
  assert(Boolean(active), '現行スレッドが存在する')
  assert(active!.title.includes('300レス推敲'), '旧本番タイトルが保持されている')
  assert(active!.max_posts === 270, `max_posts=${active!.max_posts}（270に設定されている）`)

  const posts = await fetchPosts(active!.id)
  assert(posts.length === 270, `全${posts.length}件のレスを取得できる`)
  assert(posts[0]?.post_number === 1, '>>1 が先頭')
  assert(posts[269]?.post_number === 270, '>>270 が末尾')

  const legacyPersonaCount = posts.filter((p) =>
    ['gpt_hothead', 'gemini_sarcastic'].includes(p.model),
  ).length
  assert(legacyPersonaCount > 0, `旧4ペルソナのレスが混在している（${legacyPersonaCount}件）`)

  const state = threadViewState(active!, posts)
  assert(
    state.latestPostNumber === 270 && state.maxPosts === 270,
    `進捗表示: ${state.latestPostNumber}/${state.maxPosts}`,
  )
  assert(state.isComplete, '270/270 で完結扱い（300未到達でも打ち切り完結）')
  assert(state.showNextThreadForm, '次スレお題フォーム表示条件を満たす')

  const watchRes = await fetch('http://127.0.0.1:3001/api/watch', { method: 'POST' })
  const watchBody = (await watchRes.json()) as { skipped?: boolean; reason?: string }
  assert(
    watchBody.skipped === true && watchBody.reason === 'thread_complete',
    '自動生成は thread_complete でスキップ（271レス目は作られない）',
  )

  const { data: claimRows, error: claimError } = await service.rpc('claim_post_generation', {
    input_min_interval_ms: 0,
  })
  if (claimError) throw new Error(claimError.message)
  const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as {
    claim_id: string | null
    reason: string | null
  }
  assert(claim.claim_id === null && claim.reason === 'thread_complete', 'DB claim も thread_complete')

  const threadsRes = await fetch('http://127.0.0.1:3001/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: '270移行後の次スレ' }),
  })
  const threadsBody = (await threadsRes.json()) as { ok?: boolean; error?: string }
  assert(threadsRes.ok && threadsBody.ok === true, '次スレ開始: POST /api/threads が成功')

  const newActive = await fetchActiveThread()
  assert(
    newActive?.title === '【30レス推敲】270移行後の次スレ',
    '新スレッドは30レス体制で開始された',
  )
  assert(newActive?.max_posts === 30, '新スレッド max_posts=30')

  const archived270 = await supabase
    .from('threads')
    .select('*')
    .eq('id', active!.id)
    .single()
  assert(archived270.data?.is_active === false, '270レス旧現行スレはアーカイブ化された')

  const archivedPosts = await fetchPosts(active!.id)
  assert(archivedPosts.length === 270, 'アーカイブ後も270レス閲覧可能')

  const archivedState = threadViewState(
    { is_active: false, max_posts: archived270.data?.max_posts },
    archivedPosts,
  )
  assert(
    archivedState.latestPostNumber === 270 && archivedState.maxPosts === 270,
    `アーカイブ表示: ${archivedState.latestPostNumber}/${archivedState.maxPosts}`,
  )
  assert(!archivedState.showNextThreadForm, 'アーカイブ閲覧時は次スレフォーム非表示')

  console.log('\n=== All tests passed ===')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
