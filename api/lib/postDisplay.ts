import type { Post } from './types.js'
import {
  buildPostBodyHtml,
  extractInitialDraft,
  extractRevisionBody,
} from './revisionDiff.js'

export interface PostDisplay {
  id: string
  postNumber: number
  displayName: string
  formattedDate: string
  bodyHtml: string
  hasRevisionDiff: boolean
  isOp: boolean
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}/${m}/${d}(?) ${hh}:${mm}:${ss}`
}

function updateLastRevisionBody(post: Pick<Post, 'content' | 'post_number'>): string | null {
  const revisionBody = extractRevisionBody(post.content)
  if (revisionBody) return revisionBody

  if (post.post_number === 1) {
    return extractInitialDraft(post.content)
  }

  return null
}

export function buildPostDisplays(posts: Post[]): PostDisplay[] {
  let lastRevisionBody: string | null = null

  return posts.map((post) => {
    let bodyHtml = post.body_html
    let hasRevisionDiff = post.has_revision_diff

    if (!bodyHtml) {
      const rendered = buildPostBodyHtml(post.content, lastRevisionBody)
      bodyHtml = rendered.bodyHtml
      hasRevisionDiff = rendered.hasRevisionDiff
    }

    const nextRevisionBody = updateLastRevisionBody(post)
    if (nextRevisionBody !== null) {
      lastRevisionBody = nextRevisionBody
    }

    return {
      id: post.id,
      postNumber: post.post_number,
      displayName: post.display_name,
      formattedDate: formatDate(post.created_at),
      bodyHtml,
      hasRevisionDiff,
      isOp: post.post_number === 1,
    }
  })
}

export function buildPostDisplayFields(
  posts: Post[],
  content: string,
): { bodyHtml: string; hasRevisionDiff: boolean } {
  const previousRevisionBody = getLastRevisionBodyFromPosts(posts)
  return buildPostBodyHtml(content, previousRevisionBody)
}

function getLastRevisionBodyFromPosts(
  posts: Array<Pick<Post, 'content' | 'post_number'>>,
): string | null {
  let lastRevisionBody: string | null = null

  for (const post of posts) {
    const nextRevisionBody = updateLastRevisionBody(post)
    if (nextRevisionBody !== null) {
      lastRevisionBody = nextRevisionBody
    }
  }

  return lastRevisionBody
}
