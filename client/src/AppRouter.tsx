/**
 * ROUTER (ACTIVE)
 *
 * Production homepage route (`/`) resolves to HomePage -> HeroProgressive.
 * This router intentionally keeps only production routes for release builds.
 * See docs/CODEBASE-STATUS.md.
 */
import React, { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import { ModalProvider, useModal } from './contexts/ModalContext'
import { DatabaseProvider, useDbContext } from './contexts/DatabaseContext'
import TitleBar from './components/TitleBar'
import NavBar from './components/NavBar'
import SupportChatButton from './components/SupportChatButton'
import Footer from './components/Footer'

import HomePage from './pages/HomePage'

const Modals = lazy(() => import('./components/Modals'))
const CookieConsent = lazy(() => import('./components/CookieConsent'))

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ApiPage = lazy(() => import('./pages/ApiPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))


// Inner component that uses the modal context
const AppRouterContent: React.FC = () => {
  const { setActiveModal } = useModal()
  const { isPremiumUser } = useDbContext()
  const location = useLocation()
  const isHomePage = location.pathname === '/'


  const handleUpgradeClick = () => {
    setActiveModal('upgrade')
  }

  // Get premium status - memoized to prevent unnecessary re-renders
  const isPaid = React.useMemo(() => isPremiumUser(), [isPremiumUser])

  // Listen for privacy modal open event from cookie banner
  React.useEffect(() => {
    const handleOpenPrivacyModal = () => {
      setActiveModal('privacy')
    }
    window.addEventListener('openPrivacyModal', handleOpenPrivacyModal)
    return () => window.removeEventListener('openPrivacyModal', handleOpenPrivacyModal)
  }, [setActiveModal])

  return (
    <div className="min-h-screen bg-gray-900">
      {!isHomePage && <TitleBar />}
      {!isHomePage && <NavBar isPaid={isPaid} onUpgradeClick={handleUpgradeClick} />}
      {/* Content sections already offset by fixed bars via components' own top positions */}
      <main>
        <Suspense fallback={null}>
          <Routes>
            {/* Route-based pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>

      {!isHomePage && <Footer onOpenModal={setActiveModal} />}
      {!isHomePage && <SupportChatButton onOpenModal={setActiveModal} />}
      {!isHomePage && (
        <Suspense fallback={null}>
          <Modals />
        </Suspense>
      )}
      {!isHomePage && (
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      )}
    </div>
  )
}

// Main component wrapped with providers
const AppRouter: React.FC = () => {
  return (
    <ModalProvider>
      <DatabaseProvider>
        <AppRouterContent />
      </DatabaseProvider>
    </ModalProvider>
  )
}

export default AppRouter
