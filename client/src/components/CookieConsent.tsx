import React, { useState, useEffect } from 'react'

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookieConsent')) {
      // Show instantly - no delay
      setIsVisible(true)
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
    <div
      className="fixed bottom-4 right-4 z-[200] w-[calc(100vw-1.5rem)] max-w-md"
      style={{ animation: 'cookieSlideIn 0.35s ease-out both' }}
    >
      {/* Dark glass card matching the business-name input */}
      <div
        className="rounded-2xl px-3.5 py-3 flex items-start gap-2.5"
        style={{
          background: 'rgba(5,5,8,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs mt-0.5"
          style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
        >
          🍪
        </div>

        <p className="text-[11px] text-gray-300 leading-relaxed flex-1">
          We use cookies for product analytics and improvement.{' '}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openPrivacyModal'))}
            className="text-indigo-400 hover:text-indigo-300 underline transition-colors font-medium"
          >
            Privacy Policy
          </button>
        </p>

        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
          <button
            onClick={handleDecline}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 hover:bg-white/10"
            style={{
              color: '#9ca3af',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 hover:opacity-90"
            style={{
              color: '#ffffff',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
            }}
          >
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieSlideIn {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default CookieConsent
