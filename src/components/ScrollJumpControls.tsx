import { useEffect, useRef } from 'react'

interface ScrollJumpControlsProps {
  onScrollToTop: () => void
  onScrollToBottom: () => void
}

export function ScrollJumpControls({
  onScrollToTop,
  onScrollToBottom,
}: ScrollJumpControlsProps) {
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

  return (
    <div ref={containerRef} className="scroll-jump scroll-jump--idle" aria-label="ページ移動">
      <button
        type="button"
        className="scroll-jump-button"
        aria-label="最上部へ移動"
        onClick={onScrollToTop}
      >
        ▲
      </button>
      <button
        type="button"
        className="scroll-jump-button"
        aria-label="最下部へ移動"
        onClick={onScrollToBottom}
      >
        ▼
      </button>
    </div>
  )
}
