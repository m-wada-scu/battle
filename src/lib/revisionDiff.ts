const REVISION_BODY_PATTERN = /改稿本文:\s*\n?([\s\S]*)$/
const FINAL_BODY_PATTERN = /完成稿:\s*\n?([\s\S]*)$/
const INITIAL_DRAFT_PATTERN = /初稿：\s*\n?([\s\S]*?)(?:\n\n|$)/

export type RevisionSectionLabel = '改稿本文:' | '完成稿:'

export function extractRevisionBody(content: string): string | null {
  const finalMatch = content.match(FINAL_BODY_PATTERN)
  if (finalMatch) return finalMatch[1].trim()

  const revisionMatch = content.match(REVISION_BODY_PATTERN)
  if (revisionMatch) return revisionMatch[1].trim()

  return null
}

export function extractInitialDraft(content: string): string | null {
  const match = content.match(INITIAL_DRAFT_PATTERN)
  return match?.[1]?.trim() ?? null
}

export function getRevisionSectionLabel(content: string): RevisionSectionLabel | null {
  if (FINAL_BODY_PATTERN.test(content)) return '完成稿:'
  if (REVISION_BODY_PATTERN.test(content)) return '改稿本文:'
  return null
}

export function findPreviousRevisionBody(
  posts: Array<{ content: string; post_number: number }>,
  index: number,
): string | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const revisionBody = extractRevisionBody(posts[i].content)
    if (revisionBody) return revisionBody

    if (posts[i].post_number === 1) {
      const initialDraft = extractInitialDraft(posts[i].content)
      if (initialDraft) return initialDraft
    }
  }

  return null
}

function segmentText(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })
    return [...segmenter.segment(text)].map((part) => part.segment)
  }

  return [...text]
}

type DiffOp = { type: 'equal' | 'insert'; text: string }

function diffForNewText(oldText: string, newText: string): DiffOp[] {
  const oldParts = segmentText(oldText)
  const newParts = segmentText(newText)
  const rows = oldParts.length + 1
  const cols = newParts.length + 1
  const lcs: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (oldParts[i - 1] === newParts[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  const ops: DiffOp[] = []
  let i = oldParts.length
  let j = newParts.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldParts[i - 1] === newParts[j - 1]) {
      ops.unshift({ type: 'equal', text: oldParts[i - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      ops.unshift({ type: 'insert', text: newParts[j - 1] })
      j -= 1
    } else {
      i -= 1
    }
  }

  return mergeAdjacentOps(ops)
}

function mergeAdjacentOps(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = []

  for (const op of ops) {
    const last = merged[merged.length - 1]
    if (last && last.type === op.type) {
      last.text += op.text
    } else {
      merged.push({ ...op })
    }
  }

  return merged
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function highlightRevisionDiff(oldText: string, newText: string): string {
  if (oldText === newText) return escapeHtml(newText)

  return diffForNewText(oldText, newText)
    .map((op) => {
      const escaped = escapeHtml(op.text)
      return op.type === 'insert'
        ? `<mark class="revision-highlight">${escaped}</mark>`
        : escaped
    })
    .join('')
}

export function splitRevisionContent(content: string): {
  prefix: string
  body: string
  label: RevisionSectionLabel
} | null {
  const label = getRevisionSectionLabel(content)
  if (!label) return null

  const body = extractRevisionBody(content)
  if (!body) return null

  const labelIndex = content.indexOf(label)
  const prefix = content.slice(0, labelIndex + label.length)

  return { prefix, body, label }
}
