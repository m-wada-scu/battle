import { useEffect, useRef, type RefObject } from 'react'

interface ScrollJumpControlsProps {
  topRef: RefObject<HTMLElement | null>
  bottomRef: RefObject<HTMLElement | null>
}

export function ScrollJumpControls({ topRef, bottomRef }: ScrollJumpControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const markScrolling = () => {
      container.classList.remove('scroll-jump--idle')
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => {
        container.classList.add('scroll-jump--idle')
      }, 700)
    }

    window.addEventListener('scroll', markScrolling, { passive: true })

    return () => {
      window.removeEventListener('scroll', markScrolling)
      window.clearTimeout(idleTimerRef.current)
    }
  }, [])

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  return (
    <div ref={containerRef} className="scroll-jump scroll-jump--idle" aria-label="ページ移動">
      <button
        type="button"
        className="scroll-jump-button"
        aria-label="最上部へ移動"
        onClick={scrollToTop}
      >
        ▲
      </button>
      <button
        type="button"
        className="scroll-jump-button"
        aria-label="最下部へ移動"
        onClick={scrollToBottom}
      >
        ▼
      </button>
    </div>
  )
}
