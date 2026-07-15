import { memo, useMemo } from 'react'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

interface PostListProps {
  posts: Post[]
}

function estimatePostHeight(bodyHtml: string): number {
  const lineCount = bodyHtml.split('\n').length
  const charEstimate = Math.ceil(bodyHtml.length / 42)
  return Math.max(96, 56 + Math.max(lineCount, charEstimate) * 18)
}

export const PostList = memo(function PostList({ posts }: PostListProps) {
  const displays = useMemo(() => buildPostDisplays(posts), [posts])

  return (
    <section className="post-list">
      {displays.map((display) => (
        <PostItem
          key={display.id}
          {...display}
          intrinsicSize={estimatePostHeight(display.bodyHtml)}
        />
      ))}
      <div className="post-list-end" aria-hidden="true" />
    </section>
  )
})
