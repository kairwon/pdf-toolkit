export default function ToolPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full mx-auto px-0">
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(221, 228, 216, 0.35)',
          borderRadius: '20px',
          padding: '2.5rem',
        }}
      >
        {children}
      </div>
    </div>
  )
}
