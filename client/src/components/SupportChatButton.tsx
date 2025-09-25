import React, { useEffect, useState } from 'react'

interface SupportChatButtonProps {
  onOpenModal: (modalType: 'contact') => void
}

const SupportChatButton: React.FC<SupportChatButtonProps> = ({ onOpenModal }) => {
  const [showChatButton, setShowChatButton] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowChatButton(window.scrollY > 120)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => onOpenModal('contact')}
      className={`fixed right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8 h-8 md:w-16 md:h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-110 group ${
        showChatButton ? 'bottom-6 translate-y-0' : 'bottom-0 translate-y-20'
      }`}
      title="Contact Us"
    >
      <span className="text-sm md:text-2xl group-hover:scale-110 transition-transform">💬</span>
    </button>
  )
}

export default SupportChatButton


