import { useSyncExternalStore } from 'react'
import { getWatching, subscribeWatching } from '../lib/watchStatus'

interface WatchStatusTextProps {
  isComplete: boolean
  variant: 'meta' | 'toolbar'
}

export function WatchStatusText({ isComplete, variant }: WatchStatusTextProps) {
  const watching = useSyncExternalStore(subscribeWatching, getWatching)

  if (isComplete) {
    return variant === 'meta' ? (
      <strong>完結・自動更新終了</strong>
    ) : (
      <span className="toolbar-item">○ 自動更新終了</span>
    )
  }

  if (variant === 'meta') {
    return (
      <>
        {watching ? ' / 監視中・約15秒間隔' : ' / 未監視・約1時間間隔'}
      </>
    )
  }

  return (
    <span className={`toolbar-item ${watching ? 'toolbar-watching' : ''}`}>
      {watching ? '● 監視中（15秒おき）' : '○ タブを開くと15秒おきに更新'}
    </span>
  )
}
