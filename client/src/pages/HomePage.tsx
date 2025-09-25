import React from 'react'
import LegacyApp from '../App'

// Placeholder: the full landing/generator will be migrated progressively.
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Temporary: render legacy landing/generator from App while we migrate piece by piece.
          We hide duplicate title/nav/support elements coming from App to avoid double chrome. */}
      <style>{`
        #legacy-app .fixed.top-0.left-0.right-0 { display: none !important; }
        #legacy-app .fixed.left-0.right-0.h-12 { display: none !important; }
        #legacy-app .fixed.right-6 { display: none !important; }
        #legacy-app .py-16.text-center { display: none !important; }
      `}</style>
      <div id="legacy-app">
        <LegacyApp />
      </div>
    </div>
  )
}

export default HomePage


