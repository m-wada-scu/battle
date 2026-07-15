import { memo, useMemo, type RefObject } from 'react'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

interface PostListProps {
  posts: Post[]
  bottomRef: RefObject<HTMLDivElement | null>
}

export const PostList = memo(function PostList({ posts, bottomRef }: PostListProps) {
  const displays = useMemo(() => buildPostDisplays(posts), [posts])

  return (
    <section className="post-list">
      {displays.map((display) => (
        <PostItem key={display.id} {...display} />
      ))}
      <div ref={bottomRef} className="post-list-end" aria-hidden="true" />
    </section>
  )
})
