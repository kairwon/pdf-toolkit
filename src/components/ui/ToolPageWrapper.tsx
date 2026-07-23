export default function ToolPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className="section-card overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(221, 228, 216, 0.4)',
          borderRadius: '16px',
          padding: '1.25rem',
        }}
      >
        {children}
      </div>
    </div>
  )
}
