import React, { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react'

interface NavBarProps {
  isPaid?: boolean
  onUpgradeClick?: () => void
}

const NavBar: React.FC<NavBarProps> = ({ isPaid = false, onUpgradeClick }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isSignedIn: _isSignedIn } = useUser()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const items = ['Home','Dashboard','Pricing','API','About']
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      // Slide up and stick under title bar when hidden
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
    <div className={`fixed left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-600/50 z-[60] h-12 md:h-14 transition-all duration-300 ${
      isHeaderVisible ? 'top-16 md:top-24 lg:top-32' : 'top-0'
    }`}>
      <div className="w-full h-full relative">
        <div className="hidden xl:absolute xl:inset-0 xl:flex xl:items-center xl:justify-center">
          <div className="flex items-center h-full">
            {items.map((item, index) => (
              <div key={item} className="flex items-center h-full">
                <Link to={item === 'Home' ? '/' : `/${item.toLowerCase()}`} className={`nav-shimmer flex items-center justify-center h-full px-4 md:px-6 text-base md:text-lg lg:text-xl retro-mono font-bold transition-colors duration-200 uppercase ${
                  (pathname === '/' && item === 'Home') || pathname.startsWith('/dashboard') && item === 'Dashboard' ? 'text-cyan-400' : 'text-gray-300 hover:text-cyan-400'
                }`}>
                  {item}
                </Link>
                {index < items.length - 1 && (
                  <span className="mx-3 md:mx-4 text-gray-600 text-base md:text-lg font-bold">|</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="xl:hidden absolute left-4 top-0 h-full flex items-center">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex flex-col justify-center items-center w-8 h-8 space-y-1">
            <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-300 transition duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-gray-300 transform transition duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>

        <div className="absolute right-4 top-0 h-full flex items-center gap-2 justify-end">
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="nav-shimmer px-2 md:px-4 py-1 md:py-2 bg-cyan-400 text-black font-bold rounded-lg retro-mono text-xs">SIGN IN</button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="nav-shimmer px-2 md:px-4 py-1 md:py-2 bg-purple-500 text-white font-bold rounded-lg retro-mono text-xs">SIGN UP</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            {/* Premium Status Indicator - Only for signed-in users */}
            {isPaid ? (
              <div className="golden-scintillate px-1.5 md:px-3 py-1 md:py-2 text-white font-bold rounded-lg retro-mono text-xs">
                ✨ PREMIUM
              </div>
            ) : (
              <button
                onClick={onUpgradeClick}
                className="golden-scintillate px-1.5 md:px-3 py-1 md:py-2 text-white font-bold rounded-lg retro-mono text-xs"
              >
                UPGRADE TO PREMIUM
              </button>
            )}
            <UserButton />
          </SignedIn>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-4 mt-4 w-[60%] bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg z-[70] xl:hidden" style={{top: 'calc(4rem + 3.5rem + 1rem)'}}>
          <div className="flex flex-col">
            {items.map(item => (
              <Link key={item} to={item === 'Home' ? '/' : `/${item.toLowerCase()}`} onClick={() => setIsMobileMenuOpen(false)} className={`nav-shimmer flex items-center justify-center py-4 px-6 text-lg retro-mono font-bold transition-colors duration-200 uppercase border-b border-gray-600/30 last:border-b-0 first:rounded-t-lg last:rounded-b-lg ${
                (pathname === '/' && item === 'Home') || pathname.startsWith('/dashboard') && item === 'Dashboard' ? 'text-cyan-400 bg-gray-700/30' : 'text-gray-300 hover:text-cyan-400 hover:bg-gray-700/30'
              }`}>
                {item}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NavBar


