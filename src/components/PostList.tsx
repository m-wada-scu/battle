import {
  forwardRef,
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { measureElement as measureVirtualElement, useWindowVirtualizer } from '@tanstack/react-virtual'
import { buildPostDisplays } from '../lib/postDisplay'
import type { Post } from '../lib/supabase'
import { PostItem } from './PostItem'

const VIRTUAL_OVERSCAN = 12
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
    const scrollMarginRef = useRef(0)
    const sizeCacheRef = useRef(new Map<string, number>())
    const [layoutReady, rerenderAfterLayout] = useReducer((value: number) => value + 1, 0)
    const displays = useMemo(() => {
      const built = buildPostDisplays(posts)
      for (const display of built) {
        if (!sizeCacheRef.current.has(display.id)) {
          sizeCacheRef.current.set(display.id, estimatePostHeight(display.bodyHtml))
        }
      }
      return built
    }, [posts])

    useLayoutEffect(() => {
      if (!listRef.current) return
      scrollMarginRef.current = getListScrollMargin(listRef.current)
      rerenderAfterLayout()
    }, [posts[0]?.thread_id])

    const scrollMargin = scrollMarginRef.current
    const isReady = layoutReady > 0 && displays.length > 0

    const virtualizer = useWindowVirtualizer({
      count: displays.length,
      getItemKey: (index) => displays[index]?.id ?? index,
      estimateSize: (index) => {
        const display = displays[index]
        if (!display) return MIN_ESTIMATED_POST_HEIGHT
        return sizeCacheRef.current.get(display.id) ?? estimatePostHeight(display.bodyHtml)
      },
      overscan: VIRTUAL_OVERSCAN,
      scrollMargin,
      useCachedMeasurements: true,
      useScrollendEvent: true,
      isScrollingResetDelay: 200,
      measureElement: (element, entry, instance) => {
        const height = measureVirtualElement(element, entry, instance)
        const index = Number(element.getAttribute('data-index'))
        const display = displays[index]
        if (display) {
          sizeCacheRef.current.set(display.id, height)
        }
        return height
      },
    })

    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false

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

    return (
      <section ref={listRef} className="post-list">
        {!isReady ? (
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
                    transform: `translateY(${virtualItem.start - scrollMargin}px)`,
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
