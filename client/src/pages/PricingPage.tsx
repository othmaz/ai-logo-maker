import React from 'react'

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="flex items-center justify-center min-h-screen pt-32 md:pt-40 lg:pt-48 pb-16">
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          {/* Animated Border Container */}
          <div className="relative p-8 border-4 border-transparent bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl animate-pulse-border">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl p-12">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 max-w-5xl mx-auto leading-tight text-white">
                WORK IN PROGRESS
                <br />
                <span className="text-glow animated-text-gradient text-xl lg:text-3xl xl:text-4xl">PRICING COMING SOON</span>
              </h1>

              {/* Retro Loading Animation */}
              <div className="flex justify-center items-center space-x-2 mt-8">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>

              <p className="retro-body text-base md:text-lg text-cyan-400 mt-8 max-w-3xl mx-auto leading-relaxed">
                &gt; BUILDING AWESOME PRICING PLANS FOR YOU...
                <br />
                &gt; CHECK BACK SOON FOR UPDATES
              </p>

              {/* Retro Terminal Cursor */}
              <div className="inline-block w-3 h-6 bg-cyan-400 ml-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage