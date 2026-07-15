import { memo, useMemo } from 'react'
import { buildPostDisplays } from '../lib/postDisplay'
import { estimatePostHeight, estimatePostsTotalHeight } from '../lib/postHeight'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

interface PostListProps {
  posts: Post[]
}

export const PostList = memo(function PostList({ posts }: PostListProps) {
  const displays = useMemo(() => buildPostDisplays(posts), [posts])
  const minHeight = useMemo(
    () => estimatePostsTotalHeight(displays.map((display) => display.bodyHtml)),
    [displays],
  )

  return (
    <section className="post-list" style={{ minHeight: `${minHeight}px` }}>
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
