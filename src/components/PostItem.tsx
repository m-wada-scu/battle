import { memo } from 'react'
import type { PostDisplay } from '../lib/postDisplay'

export const PostItem = memo(function PostItem({
  postNumber,
  displayName,
  formattedDate,
  bodyHtml,
  hasRevisionDiff,
  isOp,
}: PostDisplay) {
  return (
    <article className={`post ${isOp ? 'post-op' : ''}`} id={`res${postNumber}`}>
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
