import { useEffect, useState } from 'react'

export default function LottiePanda() {
  const [animData, setAnimData] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    import('lottie-web').then(Lottie => {
      fetch('/panda-sleep.json')
        .then(r => r.json())
        .then(data => {
          setAnimData(data)
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
      console.log('Lottie running')
      return () => anim.destroy()
    })
  }, [animData])

  if (error) return null
  if (!animData) return null

  return (
    <div
      id="lottie-container"
      className="fixed bottom-6 right-6 z-30 pointer-events-none"
      style={{ width: '200px', height: '200px' }}
    />
  )
}
