import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

const VIRTUAL_OVERSCAN = 10
const MIN_ESTIMATED_POST_HEIGHT = 96
const MAX_ESTIMATED_POST_HEIGHT = 720

export interface PostListHandle {
  scrollToTop: () => void
  scrollToBottom: () => void
}

interface PostListProps {
  posts: Post[]
}

function getListScrollMargin(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY
}

function estimatePostHeight(bodyHtml: string): number {
  const lineCount = bodyHtml.split('\n').length
  const charEstimate = Math.ceil(bodyHtml.length / 42)
  return Math.min(
    MAX_ESTIMATED_POST_HEIGHT,
    Math.max(MIN_ESTIMATED_POST_HEIGHT, 56 + Math.max(lineCount, charEstimate) * 18),
  )
}

export const PostList = memo(
  forwardRef<PostListHandle, PostListProps>(function PostList({ posts }, ref) {
    const listRef = useRef<HTMLElement>(null)
    const [scrollMargin, setScrollMargin] = useState<number | null>(null)
    const displays = useMemo(() => buildPostDisplays(posts), [posts])

    useLayoutEffect(() => {
      const updateScrollMargin = () => {
        if (!listRef.current) return
        setScrollMargin(getListScrollMargin(listRef.current))
      }

      updateScrollMargin()
      window.addEventListener('resize', updateScrollMargin)

      return () => {
        window.removeEventListener('resize', updateScrollMargin)
      }
    }, [posts.length])

    const virtualizer = useWindowVirtualizer({
      count: displays.length,
      estimateSize: (index) => estimatePostHeight(displays[index]?.bodyHtml ?? ''),
      overscan: VIRTUAL_OVERSCAN,
      scrollMargin: scrollMargin ?? 0,
      measureElement: (element) => element.getBoundingClientRect().height,
    })

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: () => {
          if (displays.length === 0) return
          virtualizer.scrollToIndex(0, { align: 'start', behavior: 'smooth' })
        },
        scrollToBottom: () => {
          if (displays.length === 0) return
          virtualizer.scrollToIndex(displays.length - 1, { align: 'end', behavior: 'smooth' })
        },
      }),
      [displays.length, virtualizer],
    )

    const margin = scrollMargin ?? 0

    return (
      <section ref={listRef} className="post-list">
        {scrollMargin === null ? (
          <p className="post-list-loading" aria-busy="true">
            読み込み中...
          </p>
        ) : (
          <div
            className="post-list-virtual-spacer"
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const display = displays[virtualItem.index]
              return (
                <div
                  key={display.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  className="post-list-virtual-item"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - margin}px)`,
                  }}
                >
                  <PostItem {...display} />
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }),
)
