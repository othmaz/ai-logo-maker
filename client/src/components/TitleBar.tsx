import React, { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TitleBar: React.FC = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      // Show when scrolling up, hide when scrolling down
      if (currentY < 10) {
        setIsHeaderVisible(true)
      } else if (currentY < lastScrollY.current) {
        setIsHeaderVisible(true)
      } else if (currentY > lastScrollY.current) {
        setIsHeaderVisible(false)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-20 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        background: 'rgba(5, 5, 8, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)', // violet-500 with low opacity
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(34, 211, 238, 0.1)' // cyan inner glow
      }}
    >
      {/* Subtle top edge gradient line for neon effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      
      {/* Glassmorphism subtle noise overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />

      <div className="h-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex items-center justify-between relative z-10">
        
        {/* Left: Nerdy status indicator */}
        <div className="hidden sm:flex items-center space-x-3 w-1/3">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
          </div>
          <span className="text-[11px] font-mono text-cyan-500/80 tracking-widest uppercase mt-0.5">SYS.ONLINE</span>
        </div>

        {/* Center: Sleek Logo Button */}
        <button
          onClick={() => {
            if (pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
              navigate('/')
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
            }
          }}
          className="flex-1 sm:w-1/3 flex justify-center items-center group cursor-pointer h-full"
        >
          <span 
            className="font-brand-display tracking-[0.25em] text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-white to-gray-300 group-hover:from-cyan-300 group-hover:via-white group-hover:to-violet-400 transition-all duration-500"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)' }}
          >
            CRAFT YOUR LOGO
          </span>
        </button>

        {/* Right: Abstract geometry / version */}
        <div className="hidden sm:flex items-center justify-end w-1/3 opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-xs font-mono text-violet-400/80 tracking-widest border border-violet-500/30 px-3 py-1 rounded-sm bg-violet-500/10">
            v2.0_BETA
          </span>
        </div>
      </div>
    </div>
  )
}

export default TitleBar
