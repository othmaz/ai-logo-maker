import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useDbContext } from '../contexts/DatabaseContext'

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSignedIn, user } = useUser()
  const { updateUserSubscription, refreshUserProfile } = useDbContext()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isProcessing, _setIsProcessing] = useState(true)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Prevent infinite loop - only run once
    if (hasProcessed.current) return

    const handlePaymentSuccess = async () => {
      console.log('🎉 PaymentSuccessPage loaded - checking gtag...')

      // Send conversion event to Google Analytics
      if (window.gtag) {
        console.log('✅ gtag is available, sending purchase events...')

        // Standard GA4 purchase event (shows in GA4 real-time)
        window.gtag('event', 'purchase', {
          value: 9.99,
          currency: 'EUR',
          transaction_id: Date.now().toString()
        })

        // Custom conversion event for Google Ads
        window.gtag('event', 'ads_conversion_purchase', {
          value: 9.99,
          currency: 'EUR',
          transaction_id: Date.now().toString()
        })

        console.log('📊 Purchase events sent to Google Analytics')

        // Debug: Check dataLayer
        if (window.dataLayer) {
          console.log('📊 DataLayer after purchase:', window.dataLayer.slice(-5))
        }
      } else {
        console.warn('⚠️ gtag not available on payment success page!')
      }

      // Verify and process payment
      const paymentIntent = searchParams.get('payment_intent')
      const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')

      if (paymentIntent && paymentIntentClientSecret && isSignedIn && user) {
        try {
          console.log('🎉 Payment success detected, verifying payment...')

          // Verify payment status with Stripe
          const token = await user.getToken()
          const verificationResponse = await fetch(`/api/verify-payment/${paymentIntent}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          if (!verificationResponse.ok) {
            throw new Error('Failed to verify payment')
          }

          const paymentData = await verificationResponse.json()
          console.log('💳 Payment verification:', paymentData)

          if (paymentData.status !== 'succeeded') {
            console.error('❌ Payment not confirmed by Stripe:', paymentData.status)
            setIsProcessing(false)
            return
          }

          console.log('✅ Payment verified with Stripe, updating subscription...')

          // Update database subscription status
          console.log('🔄 Calling updateUserSubscription function...')
          const dbResult = await updateUserSubscription('premium')
          console.log('📊 Database update result:', dbResult)

          if (dbResult && dbResult.success) {
            console.log('✅ Database subscription status updated to premium')
            await refreshUserProfile()

            // Redirect to home page after 3 seconds so users can continue generating
            setRedirectCountdown(3)
            const countdownInterval = setInterval(() => {
              setRedirectCountdown(prev => {
                if (prev === null || prev <= 1) {
                  clearInterval(countdownInterval)
                  navigate('/')
                  return null
                }
                return prev - 1
              })
            }, 1000)
          } else {
            console.error('❌ Failed to update database subscription:', dbResult ? dbResult.error : 'No result returned')
          }

          setIsProcessing(false)

        } catch (error) {
          console.error('❌ Error during payment verification:', error)
          setIsProcessing(false)
        }
      } else {
        setIsProcessing(false)
      }

      hasProcessed.current = true
    }

    handlePaymentSuccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 pt-32 md:pt-40 lg:pt-48 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 pt-12">
            <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl mb-6 text-white">
              PAYMENT SUCCESSFUL! <span style={{color: '#fde047', filter: 'none'}}>🎉</span>
            </h1>
            <p className="text-xl text-gray-300 mb-4 font-mono">
              Welcome to Premium! You now have unlimited logo generation.
            </p>
            {redirectCountdown !== null && (
              <p className="text-lg text-cyan-400 font-mono animate-pulse">
                Redirecting in {redirectCountdown}... or click below to start now
              </p>
            )}
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


