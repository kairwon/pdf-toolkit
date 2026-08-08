import { useEffect, useState } from 'react'
import { CheckCircle2, Download, ShieldCheck, X } from 'lucide-react'

type OverlayData = {
  title: string
  onDownload: () => void
}

export default function DownloadOverlay() {
  const [data, setData] = useState<OverlayData | null>(null)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      setData((event as CustomEvent).detail as OverlayData)
      setDownloaded(false)
    }
    window.addEventListener('show-download-overlay', handler)
    return () => window.removeEventListener('show-download-overlay', handler)
  }, [])

  if (!data) return null

  const close = () => {
    setData(null)
    setDownloaded(false)
  }

  const download = () => {
    data.onDownload()
    setDownloaded(true)
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
        </div>
        <button type="button" className="result-download" onClick={download}>
          <Download />
          {downloaded ? 'Download again' : 'Download result'}
        </button>
        <span className="result-privacy"><ShieldCheck /> Processed locally in this browser</span>
      </div>
    </div>
  )
}
