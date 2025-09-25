import React, { useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { useModal } from '../contexts/ModalContext'
import { useDbContext } from '../contexts/DatabaseContext'

type SavedLogo = { id: string; url: string }

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { isSignedIn, isLoaded, user } = useUser()
  const { showConfirmation } = useModal()

  // Use database context instead of localStorage
  const {
    savedLogos,
    userProfile,
    isInitialized,
    removeLogoFromDB,
    clearAllLogosFromDB,
    isLoading
  } = useDbContext()

  const clearAll = () => {
    showConfirmation(
      'Clear All Logos',
      'This will permanently delete ALL your saved logos from your collection. This action cannot be undone. Are you absolutely sure you want to continue?',
      async () => {
        await clearAllLogosFromDB()
      }
    )
  }

  const removeSavedLogo = (id: string) => {
    showConfirmation(
      'Remove Logo',
      'Are you sure you want to remove this logo from your collection? This action cannot be undone.',
      async () => {
        await removeLogoFromDB(id)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 pt-24 md:pt-32 lg:pt-40 pb-16">
        {!isSignedIn ? (
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-center mb-12 pt-16 md:pt-20 lg:pt-24">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 text-white">DASHBOARD ACCESS</h1>
              <p className="text-xl text-gray-300 font-mono">Sign in to access your dashboard</p>
            </div>

            <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-6 mb-8">
              <h2 className="text-xl font-bold text-cyan-400 mb-4 retro-mono">DASHBOARD FEATURES</h2>
              <div className="flex gap-8 justify-center text-center">
                {[
                  {label: 'Usage Statistics', emoji: '📈'},
                  {label: 'Logo Collection', emoji: '🎨'},
                  {label: 'Account Management', emoji: '⚙️'},
                  {label: 'Premium Benefits', emoji: '⭐'}
                ].map(({label, emoji}) => (
                  <div key={label} className="flex flex-col items-center space-y-2">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-gray-300 retro-mono text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {isLoaded && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SignInButton mode="redirect">
                  <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 retro-mono text-lg">
                    SIGN IN
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect">
                  <button className="px-8 py-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all duration-200 retro-mono text-lg border border-gray-600">
                    CREATE ACCOUNT
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-center mb-12 pt-16 md:pt-20 lg:pt-24">
              <h1 className="retro-title text-2xl lg:text-4xl xl:text-5xl hero-text mb-6 text-white">YOUR DASHBOARD</h1>
              <p className="text-xl text-gray-300 font-mono">Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-800/50 rounded-2xl border border-green-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-400 font-mono">PREMIUM {userProfile?.subscription_status === 'premium' ? 'ACTIVE' : 'INACTIVE'}</h3>
                </div>
                <p className="text-gray-300 font-mono">{userProfile?.subscription_status === 'premium' ? 'Unlimited logo generation' : 'Upgrade for unlimited generation'}</p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-cyan-400 font-mono">LOGOS CREATED</h3>
                </div>
                <p className="text-3xl font-bold text-white font-mono">{userProfile?.generations_used || 0}</p>
                <p className="text-gray-400 font-mono text-sm">Total generated</p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-purple-400/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-purple-400 font-mono">SAVED LOGOS</h3>
                </div>
                <p className="text-3xl font-bold text-white font-mono">{savedLogos.length}</p>
                <p className="text-gray-400 font-mono text-sm">In your collection</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gray-800/50 rounded-2xl border border-cyan-400/30 p-8">
                <h3 className="text-2xl font-bold text-cyan-400 font-mono mb-4">CREATE NEW LOGO</h3>
                <p className="text-gray-300 font-mono mb-6">Generate unlimited rounds of professional logos with AI power</p>
                <button onClick={() => navigate('/')} className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 font-mono text-lg">START CREATING</button>
              </div>
              <div className="bg-gray-800/50 rounded-2xl border border-purple-400/30 p-8">
                <h3 className="text-2xl font-bold text-purple-400 font-mono mb-4">SAVED COLLECTION</h3>
                <p className="text-gray-300 font-mono mb-6">Access your saved logos and download them in 8K and SVG formats</p>
                <button
                  onClick={() => {
                    const el = document.getElementById('dashboard-saved-logos')
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-mono text-lg"
                >
                  VIEW COLLECTION ({savedLogos.length})
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isSignedIn && !isInitialized && (
              <div className="mt-12 text-center">
                <div className="inline-flex items-center space-x-2 text-cyan-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                  <span className="font-mono">Loading your dashboard...</span>
                </div>
              </div>
            )}

            {/* Saved Logos Section */}
            {isSignedIn && isInitialized && savedLogos.length > 0 && (
              <div id="dashboard-saved-logos" className="mt-12 bg-gray-800/30 rounded-2xl border border-gray-600/30 p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white font-mono mb-4">YOUR SAVED COLLECTION</h3>
                  <p className="text-gray-300 font-mono">{savedLogos.length} logo{savedLogos.length > 1 ? 's' : ''} saved to your collection</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {savedLogos.map(logo => (
                    <div key={logo.id} className="relative cursor-pointer transition-all duration-300 transform hover:scale-105 group">
                      <div className="bg-gray-700/50 rounded-xl border border-gray-600/50 hover:border-cyan-400/50 transition-colors duration-200 overflow-hidden">
                        <img src={logo.logo_url || logo.url} alt={`Saved Logo ${logo.id}`} className="w-full h-32 object-cover rounded-lg" />
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button onClick={(e) => { e.stopPropagation(); removeSavedLogo(logo.id) }} className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-xs" title="Remove from collection">×</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button onClick={clearAll} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors font-mono">CLEAR ALL</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage


