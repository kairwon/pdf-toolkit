import { useLocation } from 'react-router-dom'
import ShareButtons from './ShareButtons'

interface ToolHeaderProps {
  title: string
  description: string
}

export default function ToolHeader({ title, description }: ToolHeaderProps) {
  const location = useLocation()

  return (
    <div className="tool-header">
      <div className="tool-header-row">
        <div className="tool-header-copy">
          <span className="tool-header-kicker">PRIVATE BROWSER TOOL</span>
          <h1>
            {title}
          </h1>
          <p>{description}</p>
        </div>
        <div className="tool-share">
          <ShareButtons path={location.pathname} title={`${title} | Lab of PDF`} />
        </div>
      </div>
    </div>
  )
}
