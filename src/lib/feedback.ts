export type FeedbackOutcome = 'yes' | 'no'
export type FeedbackReason =
  | 'result_worked'
  | 'watermark_remains'
  | 'quality_reduced'
  | 'file_wont_open'
  | 'target_not_met'
  | 'output_incomplete'
  | 'too_slow'
  | 'other'

let releaseCommitPromise: Promise<string> | null = null

function getReleaseCommit() {
  if (!releaseCommitPromise) {
    releaseCommitPromise = fetch('/release.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((release) => typeof release?.commit === 'string' ? release.commit : '')
      .catch(() => '')
  }
  return releaseCommitPromise
}

export async function submitFeedback(input: {
  tool: string
  outcome: FeedbackOutcome
  reason: FeedbackReason
  comment?: string
}) {
  const releaseCommit = await getReleaseCommit()
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      tool: input.tool,
      outcome: input.outcome,
      reason: input.reason,
      comment: input.comment?.trim() || undefined,
      releaseCommit: /^[0-9a-f]{40}$/.test(releaseCommit) ? releaseCommit : undefined,
    }),
  })
  if (!response.ok) throw new Error(`Feedback request failed with ${response.status}`)
}
