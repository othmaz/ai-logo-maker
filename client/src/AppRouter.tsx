import React from 'react'
import { Routes, Route } from 'react-router-dom'

import { ModalProvider, useModal } from './contexts/ModalContext'
import { DatabaseProvider, useDbContext } from './contexts/DatabaseContext'
import TitleBar from './components/TitleBar'
import NavBar from './components/NavBar'
import SupportChatButton from './components/SupportChatButton'
import Footer from './components/Footer'
import Modals from './components/Modals'

import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import PricingPage from './pages/PricingPage'
import ApiPage from './pages/ApiPage'
import AboutPage from './pages/AboutPage'

// Inner component that uses the modal context
const AppRouterContent: React.FC = () => {
  const { setActiveModal } = useModal()
  const { isPremiumUser } = useDbContext()

  const handleUpgradeClick = () => {
    setActiveModal('upgrade')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <TitleBar />
      <NavBar isPaid={isPremiumUser()} onUpgradeClick={handleUpgradeClick} />
      {/* Content sections already offset by fixed bars via components' own top positions */}
      <main>
        <Routes>
          {/* Route-based pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      <Footer onOpenModal={setActiveModal} />
      <SupportChatButton onOpenModal={setActiveModal} />
      <Modals />
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


