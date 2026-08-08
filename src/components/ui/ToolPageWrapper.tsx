export default function ToolPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="tool-page-shell">
      <div className="tool-page-surface">
        {children}
      </div>
    </div>
  )
}
