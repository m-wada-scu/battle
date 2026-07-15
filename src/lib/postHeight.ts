export function estimatePostHeight(bodyHtml: string): number {
  const plainText = bodyHtml.replace(/<[^>]+>/g, '')
  const lineCount = bodyHtml.split('\n').length
  const brCount = (bodyHtml.match(/<br\s*\/?>/gi) ?? []).length
  const charEstimate = Math.ceil(plainText.length / 36)
  const lines = Math.max(lineCount, brCount + 1, charEstimate)
  return Math.max(96, 72 + lines * 20)
}

export function estimatePostsTotalHeight(bodyHtmlList: string[]): number {
  const total = bodyHtmlList.reduce((sum, bodyHtml) => sum + estimatePostHeight(bodyHtml), 0)
  return Math.ceil(total * 1.08)
}
