type WatchListener = () => void

let watching =
  typeof document !== 'undefined' && document.visibilityState === 'visible'
const listeners = new Set<WatchListener>()

export function getWatching(): boolean {
  return watching
}

export function subscribeWatching(listener: WatchListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setWatching(nextWatching: boolean): void {
  if (watching === nextWatching) return
  watching = nextWatching
  for (const listener of listeners) {
    listener()
  }
}
