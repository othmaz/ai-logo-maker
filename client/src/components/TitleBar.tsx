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
    <button
      onClick={() => {
        if (pathname === '/') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          navigate('/')
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
        }
      }}
      className={`fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 z-50 h-16 md:h-24 lg:h-32 transition-transform duration-300 cursor-pointer ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="relative overflow-hidden h-full">
        <div className="flex animate-scroll whitespace-nowrap h-full stable-font">
          <div className="flex items-start space-x-0 mr-0 h-full">
            {[...Array(50)].map((_, i) => (
              <h1 key={`tb-first-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{ marginRight: '-27.5px', lineHeight: '4rem' }}>
                CRAFT YOUR LOGO
              </h1>
            ))}
          </div>
          <div className="flex items-start space-x-0 mr-0 h-full">
            {[...Array(50)].map((_, i) => (
              <h1 key={`tb-second-${i}`} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-phosphate tracking-tighter flex items-center justify-center m-0 p-0 stable-font h-16 md:h-24 lg:h-32 text-[4.41rem] md:text-[7.15rem] lg:text-[8.89rem]" style={{ marginRight: '-27.5px', lineHeight: '4rem' }}>
                CRAFT YOUR LOGO
              </h1>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

export default TitleBar


