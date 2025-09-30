import React from 'react'

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="pt-32 md:pt-40 lg:pt-48 pb-16">
        <div className="relative max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 leading-tight text-white">
              ABOUT
              <br />
              <span className="text-glow animated-text-gradient text-xl lg:text-3xl xl:text-4xl">AI LOGO MAKER</span>
            </h1>
            <p className="retro-body text-base md:text-lg text-cyan-400 max-w-2xl mx-auto">
              &gt; POWERED BY GOOGLE GEMINI • BUILT WITH PASSION
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8 mb-8">
            <h2 className="retro-title text-xl lg:text-2xl text-cyan-400 mb-4">
              OUR MISSION
            </h2>
            <p className="retro-body text-gray-300 leading-relaxed mb-4">
              We believe every business deserves a professional logo, regardless of budget or design expertise.
              Our AI-powered platform democratizes logo design, making it fast, affordable, and accessible to everyone.
            </p>
            <p className="retro-body text-gray-300 leading-relaxed">
              Powered by Google's Gemini AI, we generate unique, high-quality logos in minutes.
              Try it free, upgrade for unlimited access and premium export options.
            </p>
          </div>

          {/* What We Offer Section */}
          <div className="bg-gray-800/50 rounded-2xl border border-purple-400/30 p-8 mb-8">
            <h2 className="retro-title text-xl lg:text-2xl text-purple-400 mb-4">
              WHAT WE OFFER
            </h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg mt-1">✓</span>
                <p className="retro-body text-gray-300">
                  <strong className="text-white">AI-Powered Generation:</strong> Google Gemini creates unique logos tailored to your business
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg mt-1">✓</span>
                <p className="retro-body text-gray-300">
                  <strong className="text-white">Professional Quality:</strong> 8K upscaling, SVG vectorization, background removal
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg mt-1">✓</span>
                <p className="retro-body text-gray-300">
                  <strong className="text-white">Multiple Formats:</strong> Standard PNG, 8K resolution, SVG vector, favicon, and more
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg mt-1">✓</span>
                <p className="retro-body text-gray-300">
                  <strong className="text-white">Credits System:</strong> 15 free credits, then just €9.99 for unlimited access
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg mt-1">✓</span>
                <p className="retro-body text-gray-300">
                  <strong className="text-white">Commercial Rights:</strong> Full ownership for personal and commercial use
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl border-2 border-cyan-400/50 p-8">
            <h2 className="retro-title text-xl lg:text-2xl text-cyan-400 mb-4">
              GET IN TOUCH
            </h2>
            <div className="space-y-4">
              <p className="retro-body text-gray-300 leading-relaxed">
                Have questions, feedback, or need support? We're here to help.
              </p>
              <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-4 border border-cyan-400/30">
                <span className="text-cyan-400 text-2xl">✉️</span>
                <div>
                  <p className="text-sm text-gray-400">Support Email</p>
                  <a
                    href="mailto:support@ailogomaker.com"
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-lg"
                  >
                    support@ailogomaker.com
                  </a>
                </div>
              </div>
              <p className="text-gray-400 text-sm retro-body">
                We typically respond within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPage