import type { Post } from './supabase'
import {
  extractInitialDraft,
  extractRevisionBody,
  highlightRevisionDiff,
  splitRevisionContent,
} from './revisionDiff'

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

function linkifyContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
    .replace(/(&gt;&gt;\d+)/g, '<span class="anchor">$1</span>')
}

function renderPostBody(
  post: Post,
  previousRevisionBody: string | null,
): { bodyHtml: string; hasRevisionDiff: boolean } {
  const revisionParts = splitRevisionContent(post.content)
  if (!revisionParts) {
    return {
      bodyHtml: linkifyContent(post.content),
      hasRevisionDiff: false,
    }
  }

  const hasRevisionDiff = previousRevisionBody !== null
  const prefixHtml = linkifyContent(revisionParts.prefix)
  const bodyHtml = previousRevisionBody
    ? highlightRevisionDiff(previousRevisionBody, revisionParts.body)
    : linkifyContent(revisionParts.body)

  return {
    bodyHtml: `${prefixHtml}\n${bodyHtml}`,
    hasRevisionDiff,
  }
}

function updateLastRevisionBody(post: Post): string | null {
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
    const { bodyHtml, hasRevisionDiff } = renderPostBody(post, lastRevisionBody)
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
