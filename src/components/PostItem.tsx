import type { Post } from '../lib/supabase'
import {
  findPreviousRevisionBody,
  highlightRevisionDiff,
  splitRevisionContent,
} from '../lib/revisionDiff'

interface PostItemProps {
  post: Post
  allPosts: Post[]
  postIndex: number
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

function renderPostBody(post: Post, allPosts: Post[], postIndex: number): string {
  const revisionParts = splitRevisionContent(post.content)
  if (!revisionParts) {
    return linkifyContent(post.content)
  }

  const previousRevisionBody = findPreviousRevisionBody(allPosts, postIndex)
  const prefixHtml = linkifyContent(revisionParts.prefix)
  const bodyHtml = previousRevisionBody
    ? highlightRevisionDiff(previousRevisionBody, revisionParts.body)
    : linkifyContent(revisionParts.body)

  return `${prefixHtml}\n${bodyHtml}`
}

export function PostItem({ post, allPosts, postIndex }: PostItemProps) {
  const isOp = post.post_number === 1
  const hasRevisionDiff =
    splitRevisionContent(post.content) !== null &&
    findPreviousRevisionBody(allPosts, postIndex) !== null

  return (
    <article className={`post ${isOp ? 'post-op' : ''}`} id={`res${post.post_number}`}>
      <div className="post-header">
        <span className="post-number">{post.post_number}</span>
        <span className="post-name">{post.display_name}</span>
        <span className="post-date">{formatDate(post.created_at)}</span>
        <span className="post-id">ID:********</span>
        {hasRevisionDiff && (
          <span className="revision-diff-legend">蛍光色 = 直前稿からの変更</span>
        )}
      </div>
      <div
        className="post-body"
        dangerouslySetInnerHTML={{ __html: renderPostBody(post, allPosts, postIndex) }}
      />
    </article>
  )
}
