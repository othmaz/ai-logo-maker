import React from 'react'

const ApiPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="flex items-center justify-center min-h-screen pt-32 md:pt-40 lg:pt-48 pb-16">
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          {/* Animated Border Container */}
          <div className="relative p-8 border-4 border-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl animate-pulse-border">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl p-12">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 max-w-5xl mx-auto leading-tight text-white">
                WORK IN PROGRESS
                <br />
                <span className="text-glow animated-text-gradient text-xl lg:text-3xl xl:text-4xl">API DOCUMENTATION</span>
              </h1>

              {/* Matrix-style Animation */}
              <div className="flex justify-center items-center mt-8">
                <div className="font-mono text-green-400 text-sm animate-pulse">
                  {'{'} "status": "building", "progress": "██████████", "eta": "soon" {'}'}
                </div>
              </div>

              {/* Retro Loading Animation */}
              <div className="flex justify-center items-center space-x-2 mt-6">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>

              <p className="retro-body text-base md:text-lg text-cyan-400 mt-8 max-w-3xl mx-auto leading-relaxed">
                &gt; DEVELOPING POWERFUL API ENDPOINTS...
                <br />
                &gt; INTEGRATIONS AND DOCUMENTATION COMING SOON
              </p>

              {/* Retro Terminal Cursor */}
              <div className="inline-block w-3 h-6 bg-green-400 ml-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiPage