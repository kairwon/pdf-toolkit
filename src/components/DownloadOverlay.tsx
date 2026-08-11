import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Send, ShieldCheck, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { submitFeedback, type FeedbackReason } from '../lib/feedback'

type OverlayData = {
  title: string
  onDownload: () => void
  tool: string
  summary?: string[]
}

const failureReasons: { value: FeedbackReason; label: string }[] = [
  { value: 'watermark_remains', label: 'Watermark remains' },
  { value: 'quality_reduced', label: 'Quality was reduced' },
  { value: 'file_wont_open', label: "File won't open" },
  { value: 'target_not_met', label: 'Target size not met' },
  { value: 'output_incomplete', label: 'Output is incomplete' },
  { value: 'too_slow', label: 'Processing was too slow' },
  { value: 'other', label: 'Other' },
]

export default function DownloadOverlay() {
  const [data, setData] = useState<OverlayData | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [feedbackChoice, setFeedbackChoice] = useState<'yes' | 'no' | null>(null)
  const [feedbackReason, setFeedbackReason] = useState<FeedbackReason | null>(null)
  const [comment, setComment] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as Omit<OverlayData, 'tool'>
      setData({ ...detail, tool: window.location.pathname })
      setDownloaded(false)
      setFeedbackChoice(null)
      setFeedbackReason(null)
      setComment('')
      setFeedbackStatus('idle')
    }
    window.addEventListener('show-download-overlay', handler)
    return () => window.removeEventListener('show-download-overlay', handler)
  }, [])

  if (!data) return null

  const close = () => {
    setData(null)
    setDownloaded(false)
    setFeedbackChoice(null)
    setFeedbackReason(null)
    setComment('')
    setFeedbackStatus('idle')
  }

  const download = () => {
    data.onDownload()
    setDownloaded(true)
  }

  const sendFeedback = async (outcome: 'yes' | 'no', reason: FeedbackReason, optionalComment = '') => {
    if (!data) return
    setFeedbackStatus('sending')
    try {
      await submitFeedback({ tool: data.tool, outcome, reason, comment: optionalComment })
      setFeedbackChoice(outcome)
      setFeedbackStatus('sent')
    } catch {
      setFeedbackStatus('error')
    }
  }

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-dialog">
        <button type="button" className="result-close" aria-label="Close result" onClick={close}>
          <X />
        </button>
        <span className="result-icon"><CheckCircle2 /></span>
        <div>
          <span className="result-kicker">PROCESSING COMPLETE</span>
          <h2 id="result-title">{data.title}</h2>
          <p>Your original file was not changed. Review the downloaded copy before submitting or sharing it.</p>
          {data.summary && data.summary.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-500 dark:text-gray-400">
              {data.summary.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
        <button type="button" className="result-download" onClick={download}>
          <Download />
          {downloaded ? 'Download again' : 'Download result'}
        </button>
        {downloaded && (
          <section className="result-feedback" aria-live="polite">
            {feedbackStatus === 'sent' ? (
              <div className="result-feedback-thanks"><CheckCircle2 /> Thank you — no PDF, file name, or document content was sent.</div>
            ) : (
              <>
                <strong>Did the downloaded result solve your problem?</strong>
                <div className="result-feedback-choice">
                  <button type="button" disabled={feedbackStatus === 'sending'} onClick={() => sendFeedback('yes', 'result_worked')}><ThumbsUp /> Yes</button>
                  <button type="button" className={feedbackChoice === 'no' ? 'active' : ''} disabled={feedbackStatus === 'sending'} onClick={() => { setFeedbackChoice('no'); setFeedbackStatus('idle') }}><ThumbsDown /> Not yet</button>
                </div>
                {feedbackChoice === 'no' && (
                  <form onSubmit={(event) => { event.preventDefault(); if (feedbackReason) sendFeedback('no', feedbackReason, comment) }}>
                    <fieldset>
                      <legend>What went wrong?</legend>
                      <div className="result-feedback-reasons">
                        {failureReasons.map((reason) => (
                          <label key={reason.value}><input type="radio" name="feedback-reason" value={reason.value} checked={feedbackReason === reason.value} onChange={() => setFeedbackReason(reason.value)} /> {reason.label}</label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="result-feedback-comment">Optional detail
                      <textarea value={comment} maxLength={300} onChange={(event) => setComment(event.target.value)} placeholder="Do not include names, document text, file names, or other personal information." />
                    </label>
                    <button type="submit" className="result-feedback-send" disabled={!feedbackReason || feedbackStatus === 'sending'}><Send /> {feedbackStatus === 'sending' ? 'Sending…' : 'Send feedback'}</button>
                  </form>
                )}
                {feedbackStatus === 'error' && <p className="result-feedback-error">Feedback could not be sent. Your downloaded file is unaffected; you can try again.</p>}
              </>
            )}
          </section>
        )}
        <span className="result-privacy"><ShieldCheck /> Processed locally in this browser</span>
      </div>
    </div>
  )
}
