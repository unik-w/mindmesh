import type { FeedItem } from './types'
import { DEMO_ARXIV_IDS } from './data'

export function arxivIdForPost(post: FeedItem): string {
  if (post.arxivId) return post.arxivId
  let h = 0
  for (let i = 0; i < post.id.length; i++)
    h = (h * 31 + post.id.charCodeAt(i)) >>> 0
  return DEMO_ARXIV_IDS[h % DEMO_ARXIV_IDS.length]
}

export function arxivPdfUrl(post: FeedItem) {
  return `https://arxiv.org/pdf/${arxivIdForPost(post)}.pdf`
}

/** In-modal preview: arXiv blocks direct PDF iframes; Google’s viewer embeds the public PDF URL. */
export function arxivPdfPreviewEmbedUrl(post: FeedItem) {
  const pdfUrl = arxivPdfUrl(post)
  return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`
}

export function arxivAbsUrl(post: FeedItem) {
  return `https://arxiv.org/abs/${arxivIdForPost(post)}`
}

/** Substance only (no in-app template paragraphs). Used for video agent context. */
export function paperVideoContextText(post: FeedItem): string {
  const detail = post.paperDetail?.trim()
  if (detail) return detail
  return post.aiSummary?.trim() ?? ''
}

export function paperDetailText(post: FeedItem) {
  if (post.paperDetail) return post.paperDetail
  return [
    post.aiSummary,
    '',
    'Deeper read',
    'This section expands on the card summary with a slower walk through claims, evidence, and limits. Where the feed prioritizes speed, here we spell out what would need to be true for the headline results to transfer to your setting—data coverage, evaluation leakage, and the operational constraints the authors did (or did not) measure.',
    '',
    'Contributions',
    'The paper states its core idea relative to the closest published systems, reports matched-compute or matched-latency comparisons where relevant, and separates robust findings from suggestive trends.',
    '',
    'Open questions',
    'External validity under distribution shift, hidden failure modes reviewers flag, and what a careful deployment checklist would require beyond the reported benchmarks.',
  ].join('\n\n')
}
