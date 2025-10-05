import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Send conversion event to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'ads_conversion_purchase', {
        value: 9.99,
        currency: 'EUR',
        transaction_id: Date.now().toString()
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 pt-32 md:pt-40 lg:pt-48 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 pt-12">
            <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl mb-6 text-white">
              PAYMENT SUCCESSFUL! <span style={{color: '#fde047', filter: 'none'}}>🎉</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 font-mono">
              Welcome to Premium! You now have unlimited logo generation.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8 mb-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-8 font-mono text-center">YOUR PREMIUM BENEFITS:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-3">🚀</div>
                <span className="text-gray-300 font-mono text-sm">Unlimited Generation</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-3">✨</div>
                <span className="text-gray-300 font-mono text-sm">8K High Resolution</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-3">⚡</div>
                <span className="text-gray-300 font-mono text-sm">Priority Support</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-3">💼</div>
                <span className="text-gray-300 font-mono text-sm">Commercial Rights</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="relative px-8 py-4 rounded-2xl font-extrabold text-xl transition-all duration-300 transform overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="relative z-10 flex items-center justify-center">
                <span className="mr-3 text-2xl">🎨</span>
                <span className="text-white font-extrabold">START CREATING LOGOS</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative px-8 py-4 rounded-2xl font-extrabold text-xl transition-all duration-300 transform overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600 border border-gray-600 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="relative z-10 flex items-center justify-center">
                <span className="mr-3 text-2xl">📊</span>
                <span className="text-white font-extrabold">VIEW DASHBOARD</span>
              </div>
            </button>
          </div>

          <div className="mt-8 text-gray-400 font-mono text-sm">
            <p>Receipt sent to your email • €9.99 charged successfully</p>
            <p>Need help? Contact support anytime</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccessPage


