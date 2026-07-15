import { memo, useMemo } from 'react'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

interface PostListProps {
  posts: Post[]
}

export const PostList = memo(function PostList({ posts }: PostListProps) {
  const displays = useMemo(() => buildPostDisplays(posts), [posts])

  return (
    <section className="post-list">
      {displays.map((display) => (
        <PostItem key={display.id} {...display} />
      ))}
      <div className="post-list-end" aria-hidden="true" />
    </section>
  )
})
