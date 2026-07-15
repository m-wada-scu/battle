import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

if (process.argv.includes('--production')) {
  process.env.VERCEL_ENV = 'production'
  loadEnvFile(resolve('.env'))
}

const { buildPostBodyHtml } = await import('../api/lib/revisionDiff.ts')
const { createServiceClient } = await import('../api/lib/supabase.ts')

interface BackfillPost {
  id: string
  content: string
  post_number: number
  body_html: string | null
}

function updateLastRevisionBody(content: string, postNumber: number): string | null {
  const finalMatch = content.match(/完成稿:\s*\n?([\s\S]*)$/)
  if (finalMatch) return finalMatch[1].trim()

  const revisionMatch = content.match(/改稿本文:\s*\n?([\s\S]*)$/)
  if (revisionMatch) return revisionMatch[1].trim()

  if (postNumber === 1) {
    const draftMatch = content.match(/初稿：\s*\n?([\s\S]*?)(?:\n\n|$)/)
    return draftMatch?.[1]?.trim() ?? null
  }

  return null
}

async function backfillThread(threadId: string, title: string): Promise<number> {
  const supabase = createServiceClient()
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, post_number, body_html')
    .eq('thread_id', threadId)
    .order('post_number', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  let lastRevisionBody: string | null = null
  let updated = 0

  for (const post of (posts ?? []) as BackfillPost[]) {
    if (!post.body_html) {
      const { bodyHtml, hasRevisionDiff } = buildPostBodyHtml(
        post.content,
        lastRevisionBody,
      )

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          body_html: bodyHtml,
          has_revision_diff: hasRevisionDiff,
        })
        .eq('id', post.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      updated += 1
    }

    const nextRevisionBody = updateLastRevisionBody(post.content, post.post_number)
    if (nextRevisionBody !== null) {
      lastRevisionBody = nextRevisionBody
    }
  }

  console.log(`[backfill] ${title}: ${updated} posts updated`)
  return updated
}

async function main(): Promise<void> {
  const supabase = createServiceClient()
  const { data: threads, error } = await supabase.from('threads').select('id, title')

  if (error) {
    throw new Error(error.message)
  }

  let totalUpdated = 0
  for (const thread of threads ?? []) {
    totalUpdated += await backfillThread(thread.id, thread.title)
  }

  console.log(`[backfill] Done. ${totalUpdated} posts updated.`)
}

void main()
