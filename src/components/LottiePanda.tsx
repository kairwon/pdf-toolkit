import { useEffect, useState, useCallback } from 'react'

export default function LottiePanda() {
  const [animData, setAnimData] = useState<any>(null)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    import('lottie-web').then(Lottie => {
      fetch('/panda-sleep.json')
        .then(r => r.json())
        .then(data => {
          setAnimData(data)
          // Reveal the animation with a short pop-in delay.
          setTimeout(() => setVisible(true), 300)
        })
        .catch(() => setError(true))
    })
  }, [])

  useEffect(() => {
    if (!animData) return
    import('lottie-web').then(Lottie => {
      const container = document.getElementById('lottie-container')
      if (!container) return
      const anim = Lottie.default.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animData,
      })
      return () => anim.destroy()
    })
  }, [animData])

  const replay = useCallback(() => {
    setVisible(false)
    setTimeout(() => setVisible(true), 50)
  }, [])

  if (error) return null

  return (
    <div className="fixed bottom-6 right-6 z-30 pointer-events-none">
      <div
        id="lottie-container"
        onClick={replay}
        style={{
          width: '200px',
          height: '200px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.3)',
          transition: 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}
