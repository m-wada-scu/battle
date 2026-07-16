import { useEffect } from 'react'

const WATCH_INTERVAL_MS = 15_000

export function useThreadWatch(isActive: boolean, isComplete: boolean): void {
  useEffect(() => {
    if (!isActive || isComplete) return

    let intervalId: number | undefined
    let inFlight = false

    const tick = async () => {
      if (document.visibilityState !== 'visible' || inFlight) return

      inFlight = true
      try {
        await fetch('/api/watch', { method: 'POST' })
      } catch {
        // Realtime で表示更新。失敗しても次の tick で再試行
      } finally {
        inFlight = false
      }
    }

    const startWatching = () => {
      if (intervalId !== undefined) return
      void tick()
      intervalId = window.setInterval(() => void tick(), WATCH_INTERVAL_MS)
    }

    const stopWatching = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startWatching()
      } else {
        stopWatching()
      }
    }

    if (document.visibilityState === 'visible') {
      startWatching()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopWatching()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isActive, isComplete])
}
