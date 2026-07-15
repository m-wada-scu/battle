import { memo } from 'react'
import type { PostDisplay } from '../lib/postDisplay'

interface PostItemProps extends PostDisplay {
  intrinsicSize?: number
}

export const PostItem = memo(function PostItem({
  postNumber,
  displayName,
  formattedDate,
  bodyHtml,
  hasRevisionDiff,
  isOp,
  intrinsicSize,
}: PostItemProps) {
  return (
    <article
      className={`post ${isOp ? 'post-op' : ''}`}
      id={`res${postNumber}`}
      style={intrinsicSize ? { containIntrinsicSize: `auto ${intrinsicSize}px` } : undefined}
    >
      <div className="post-header">
        <span className="post-number">{postNumber}</span>
        <span className="post-name">{displayName}</span>
        <span className="post-date">{formattedDate}</span>
        <span className="post-id">ID:********</span>
        {hasRevisionDiff && (
          <span className="revision-diff-legend">水色 = 直前稿からの変更</span>
        )}
      </div>
      <div className="post-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </article>
  )
})
