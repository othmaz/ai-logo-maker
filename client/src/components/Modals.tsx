import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '../CheckoutForm'
import { useModal } from '../contexts/ModalContext'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

const Modals: React.FC = () => {
  const navigate = useNavigate()
  const { isSignedIn, user } = useUser()
  const { activeModal, setActiveModal, confirmModal } = useModal()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, message, type }
    setToasts(prev => [...prev, toast])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const handlePaymentUpgrade = async () => {
    try {
      if (!isSignedIn || !user) {
        showToast('Please sign in to upgrade to premium', 'error')
        return
      }

      if (!tosAccepted) {
        showToast('Please accept the Terms of Service to continue', 'error')
        return
      }

      setIsLoadingPayment(true)
      showToast('Creating payment...', 'info')

      const response = await fetch('/api/create-payment-intent-with-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret: secret } = await response.json()
      setClientSecret(secret)
      showToast('Payment ready!', 'success')

    } catch (error) {
      console.error('Payment error:', error)
      showToast('Payment failed. Please try again.', 'error')
    } finally {
      setIsLoadingPayment(false)
    }
  }

  if (!activeModal && !confirmModal.isOpen) return null

  return (
    <>
      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
          <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            activeModal === 'upgrade'
              ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
              : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-6 ${
              activeModal === 'upgrade' ? 'border-b border-cyan-400/30' : 'border-b'
            }`}>
              <h2 className={`text-2xl font-bold ${
                activeModal === 'upgrade'
                  ? 'retro-title text-white'
                  : 'text-gray-800'
              }`}>
                {activeModal === 'tos' && 'Terms of Service'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'contact' && 'Contact Us'}
                {activeModal === 'upgrade' && 'UPGRADE TO PREMIUM'}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className={`text-2xl font-bold ${
                  activeModal === 'upgrade'
                    ? 'text-cyan-400 hover:text-cyan-300'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {activeModal === 'tos' && (
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h3>
                    <p>By accessing and using AI Logo Maker, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">2. Service Description</h3>
                    <p>AI Logo Maker provides AI-powered logo generation services with both free and premium tiers:</p>
                    <ul className="list-disc ml-6 mt-2">
                      <li><strong>Free Service:</strong> Up to 3 logo generations at standard resolution</li>
                      <li><strong>Premium Service:</strong> Unlimited logo generations with 8K high-resolution downloads for a one-time fee of €9.99</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">3. Payment Terms</h3>
                    <p>Premium upgrade requires a one-time payment of €9.99. Payment processing is handled securely through Stripe. Upon successful payment, you gain immediate access to unlimited generations and high-resolution downloads.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">4. Intellectual Property Rights</h3>
                    <p>Generated logos are provided for your commercial and personal use. However, we cannot guarantee uniqueness of generated content. You are responsible for ensuring your logo doesn't infringe on existing trademarks.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">5. Refund Policy</h3>
                    <p>Due to the digital nature of our service, refunds are generally not provided once premium access is granted. However, we will consider refund requests within 24 hours of purchase if technical issues prevent service delivery.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">6. Service Availability</h3>
                    <p>We strive for 99% uptime but cannot guarantee uninterrupted service. Maintenance windows and AI provider limitations may affect availability.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">7. Limitation of Liability</h3>
                    <p>Our liability is limited to the amount paid for premium service. We are not responsible for any indirect, incidental, or consequential damages.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">8. Contact Information</h3>
                    <p>For questions regarding these terms, please contact us through the Contact Us button or email support at the address provided in our contact form.</p>
                  </div>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Information We Collect</h3>
                    <p>We collect minimal information necessary to provide our service:</p>
                    <ul className="list-disc ml-6 mt-2">
                      <li>Email address and basic profile information (when you create an account)</li>
                      <li>Usage data (number of logos generated, upgrade status)</li>
                      <li>Technical data (IP address, browser type, device information)</li>
                      <li>Logo generation prompts and preferences</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">How We Use Your Information</h3>
                    <ul className="list-disc ml-6">
                      <li>To provide and improve our logo generation service</li>
                      <li>To process payments and manage your premium account</li>
                      <li>To send service-related communications</li>
                      <li>To analyze usage patterns and improve our AI models</li>
                      <li>To provide customer support</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Data Sharing</h3>
                    <p>We do not sell or rent your personal information. We only share data with:</p>
                    <ul className="list-disc ml-6 mt-2">
                      <li>Service providers (Clerk for authentication, Stripe for payments, Google for AI services)</li>
                      <li>When required by law or to protect our rights</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Data Security</h3>
                    <p>We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Your Rights (GDPR)</h3>
                    <p>If you are in the EU, you have the right to:</p>
                    <ul className="list-disc ml-6 mt-2">
                      <li>Access your personal data</li>
                      <li>Correct inaccurate data</li>
                      <li>Delete your data (right to be forgotten)</li>
                      <li>Object to processing</li>
                      <li>Data portability</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3">Contact for Privacy Matters</h3>
                    <p>For privacy-related questions, data requests, or concerns, please contact us through the Contact Us button or email our privacy team at the address provided in our contact form.</p>
                  </div>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-gray-600">We're here to help! Get in touch with our team.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h4 className="font-semibold text-gray-800">Quick Support</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-gray-600">
                          <span className="text-2xl">📧</span>
                          <span>support@craftyourlogo.com</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <span className="text-2xl">💬</span>
                          <span>Live chat (coming soon)</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <span className="text-2xl">📚</span>
                          <span>Help Center (coming soon)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800">Send us a message</h4>
                      <form className="space-y-4" onSubmit={async (e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const data = {
                          name: formData.get('name') as string,
                          email: formData.get('email') as string,
                          subject: formData.get('subject') as string,
                          message: formData.get('message') as string
                        }

                        try {
                          const response = await fetch('/api/contact', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                          })

                          if (!response.ok) {
                            const error = await response.json()
                            throw new Error(error.error || 'Failed to send message')
                          }

                          showToast('Message sent! We\'ll get back to you soon.', 'success')
                          setActiveModal(null)
                        } catch (error) {
                          console.error('Contact form error:', error)
                          showToast(error instanceof Error ? error.message : 'Failed to send message. Please try again.', 'error')
                        }
                      }}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input name="name" type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input name="email" type="email" required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                          <select name="subject" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                            <option>General Question</option>
                            <option>Technical Issue</option>
                            <option>Billing Question</option>
                            <option>Feature Request</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                          <textarea name="message" rows={4} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"></textarea>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                          Send Message
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="border-t pt-6 text-center text-sm text-gray-500">
                    <p>Typical response time: Within 24 hours</p>
                  </div>
                </div>
              )}

              {activeModal === 'upgrade' && (
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8 -m-6 rounded-xl">
                  {clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm />
                    </Elements>
                  ) : (
                    <div className="text-center">
                      {/* Retro Header */}
                      <h3 className="retro-title text-2xl lg:text-3xl mb-4 text-white">
                        UPGRADE TO
                        <br />
                        <span className="text-glow animated-text-gradient text-xl lg:text-2xl">PREMIUM ACCESS</span>
                      </h3>

                      {/* Retro Computer Animation */}
                      <div className="flex justify-center items-center mt-6">
                        <div className="font-mono text-cyan-400 text-lg animate-pulse">
                          🚀 PREMIUM.FEATURES.LOADING()
                        </div>
                      </div>

                      {/* Retro Loading Animation */}
                      <div className="flex justify-center items-center space-x-2 mt-4 mb-8">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>

                      {/* Terminal Style Comparison */}
                      <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-6 mb-8 max-w-3xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 text-left">
                          <div className="space-y-3">
                            <h4 className="retro-mono text-lg font-bold text-gray-400 mb-4 text-center">FREE TIER</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-red-400 retro-mono">✗</span>
                                <span className="text-gray-400 retro-mono text-sm">3 GENERATIONS ONLY</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-red-400 retro-mono">✗</span>
                                <span className="text-gray-400 retro-mono text-sm">1K RESOLUTION</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-red-400 retro-mono">✗</span>
                                <span className="text-gray-400 retro-mono text-sm">BASIC SUPPORT</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-red-400 retro-mono">✗</span>
                                <span className="text-gray-400 retro-mono text-sm">NO COMMERCIAL USE</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border-2 border-cyan-400/50">
                            <h4 className="retro-mono text-lg font-bold text-cyan-400 mb-4 text-center">PREMIUM - €9.99</h4>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-cyan-400 retro-mono">🚀</span>
                                <span className="text-cyan-400 retro-mono text-sm">UNLIMITED GENERATION</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-cyan-400 retro-mono">✨</span>
                                <span className="text-cyan-400 retro-mono text-sm">8K HIGH RESOLUTION</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-cyan-400 retro-mono">⚡</span>
                                <span className="text-cyan-400 retro-mono text-sm">PRIORITY SUPPORT</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-cyan-400 retro-mono">💼</span>
                                <span className="text-cyan-400 retro-mono text-sm">COMMERCIAL RIGHTS</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Terms of Service Checkbox */}
                      <div className="mb-6 flex items-start">
                        <input
                          type="checkbox"
                          id="tos-checkbox"
                          checked={tosAccepted}
                          onChange={(e) => setTosAccepted(e.target.checked)}
                          className="mt-1 mr-3 w-4 h-4"
                        />
                        <label htmlFor="tos-checkbox" className="text-sm text-gray-300 text-left retro-mono">
                          I accept the{' '}
                          <button
                            onClick={() => setActiveModal('tos')}
                            className="text-cyan-400 hover:text-cyan-300 underline"
                          >
                            Terms of Service
                          </button>
                          {' '}and{' '}
                          <button
                            onClick={() => setActiveModal('privacy')}
                            className="text-cyan-400 hover:text-cyan-300 underline"
                          >
                            Privacy Policy
                          </button>
                        </label>
                      </div>

                      {/* Retro Upgrade Button */}
                      <button
                        onClick={handlePaymentUpgrade}
                        disabled={!tosAccepted || isLoadingPayment}
                        className={`w-full px-8 py-4 rounded-lg font-bold retro-mono text-lg shadow-lg transition-all duration-200 border-2 ${
                          tosAccepted && !isLoadingPayment
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 hover:shadow-xl border-cyan-400/50 cursor-pointer'
                            : 'bg-gray-600 text-gray-400 border-gray-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {isLoadingPayment ? 'LOADING...' : 'UPGRADE NOW - €9.99'}
                      </button>

                      {/* Terminal Footer */}
                      <p className="retro-body text-cyan-400 text-sm mt-4">
                        &gt; ONE-TIME PAYMENT • INSTANT ACCESS • NO SUBSCRIPTION
                      </p>

                      {/* Retro Terminal Cursor */}
                      <div className="inline-block w-3 h-6 bg-cyan-400 ml-2 animate-pulse mt-2"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border-2 border-cyan-400">
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2 font-mono uppercase">
                  {confirmModal.title}
                </h3>
                <p className="text-gray-300 font-mono text-sm leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={confirmModal.onCancel}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-mono text-sm font-bold transition-colors border border-gray-600"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono text-sm font-bold transition-colors border border-red-500 shadow-lg"
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 animate-in slide-in-from-top-5 ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            <span>
              {toast.type === 'success' ? '✓' :
               toast.type === 'error' ? '✕' :
               toast.type === 'warning' ? '⚠' :
               'ℹ'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default Modals