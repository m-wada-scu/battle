import type { Post } from '../lib/supabase'

interface PostItemProps {
  post: Post
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

export function PostItem({ post }: PostItemProps) {
  const isOp = post.post_number === 1

  return (
    <article className={`post ${isOp ? 'post-op' : ''}`} id={`res${post.post_number}`}>
      <div className="post-header">
        <span className="post-number">{post.post_number}</span>
        <span className="post-name">{post.display_name}</span>
        <span className="post-date">{formatDate(post.created_at)}</span>
        <span className="post-id">ID:********</span>
      </div>
      <div
        className="post-body"
        dangerouslySetInnerHTML={{ __html: linkifyContent(post.content) }}
      />
    </article>
  )
}
