import {
  forwardRef,
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

export interface PostListHandle {
  scrollToTop: () => void
  scrollToBottom: () => void
}

interface PostListProps {
  posts: Post[]
}

function estimatePostHeight(bodyHtml: string): number {
  const lineCount = bodyHtml.split('\n').length
  const charEstimate = Math.ceil(bodyHtml.length / 42)
  return Math.max(96, 56 + Math.max(lineCount, charEstimate) * 18)
}

export const PostList = memo(
  forwardRef<PostListHandle, PostListProps>(function PostList({ posts }, ref) {
    const topRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const displays = useMemo(() => buildPostDisplays(posts), [posts])

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: () => {
          if (displays.length === 0) {
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return
          }
          document.getElementById(`res${displays[0].postNumber}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        },
        scrollToBottom: () => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        },
      }),
      [displays],
    )

    return (
      <section className="post-list">
        <div ref={topRef} className="scroll-anchor scroll-anchor-top" aria-hidden="true" />
        {displays.map((display) => (
          <PostItem
            key={display.id}
            {...display}
            intrinsicSize={estimatePostHeight(display.bodyHtml)}
          />
        ))}
        <div ref={bottomRef} className="post-list-end" aria-hidden="true" />
      </section>
    )
  }),
)
