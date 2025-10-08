import React, { useState, useEffect } from 'react'

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 1000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setIsVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 animate-slide-up">
      <div className="max-w-7xl mx-auto bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-black/95 backdrop-blur-md border border-cyan-400/50 rounded-lg shadow-2xl overflow-hidden">
        {/* Retro top border animation */}
        <div className="h-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-pulse"></div>

        <div className="px-4 py-3 md:px-6 md:py-3">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
            {/* Cookie Icon */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center text-xl md:text-2xl shadow-lg">
                🍪
              </div>
            </div>

            {/* Content */}
            <div className="flex-grow text-center md:text-left">
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                <span className="retro-mono text-cyan-400 font-bold">█ COOKIE CONSENT</span>
                {' '}&nbsp;We use cookies to enhance your experience, analyze site usage, and assist with our marketing efforts.
                By clicking <span className="text-cyan-400 font-bold">"ACCEPT"</span>, you consent to our use of cookies.
                Learn more in our{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    window.dispatchEvent(new CustomEvent('openPrivacyModal'))
                  }}
                  className="text-cyan-400 hover:text-purple-400 font-semibold underline transition-colors"
                >
                  Privacy Policy
                </a>.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-row gap-2 flex-shrink-0">
              <button
                onClick={handleDecline}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg retro-mono text-xs transition-all duration-200 border border-gray-600 hover:border-gray-500 whitespace-nowrap"
              >
                DECLINE
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white font-bold rounded-lg retro-mono text-xs transition-all duration-200 shadow-lg hover:shadow-cyan-400/50 whitespace-nowrap"
              >
                ACCEPT COOKIES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
