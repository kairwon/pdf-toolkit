import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ShareButtons from '../ui/ShareButtons'

type ArticleShellProps = {
  kicker: string
  title: string
  summary: string
  updated: string
  readingTime?: string
  reviewed?: boolean
  children: ReactNode
  tool?: { href: string; label: string; note: string }
}

export default function ArticleShell({ kicker, title, summary, updated, readingTime, reviewed = true, children, tool }: ArticleShellProps) {
  const { pathname } = useLocation()
  return (
    <article className="content-article">
      <header className="content-hero">
        <span className="content-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="content-summary">{summary}</p>
        <div className="content-byline">
          <span><UserRoundCheck /> Lab of PDF editorial team</span>
          <span><CalendarDays /> Updated {updated}</span>
          {readingTime && <span><Clock3 /> {readingTime}</span>}
        </div>
        <div className="content-share">
          <ShareButtons path={pathname} title={title} />
        </div>
        {reviewed && (
          <div className="content-review-note">
            <ShieldCheck />
            <span><strong>Product and privacy reviewed</strong> Instructions are checked against the current browser tools and our local-processing model.</span>
          </div>
        )}
      </header>

      <div className="content-layout">
        <div className="content-body">{children}</div>
        <aside className="content-aside" aria-label="Article information">
          {tool && (
            <div className="content-tool-card">
              <span>USE THE RELATED TOOL</span>
              <h2>{tool.label}</h2>
              <p>{tool.note}</p>
              <Link to={tool.href}>{tool.label}<ArrowRight /></Link>
            </div>
          )}
          <div className="content-method-card">
            <CheckCircle2 />
            <h2>How we check this content</h2>
            <p>We test the workflow, verify claims against the current interface, and avoid promises the tool cannot support.</p>
            <Link to="/editorial-policy">Read our editorial method</Link>
          </div>
        </aside>
      </div>
    </article>
  )
}
