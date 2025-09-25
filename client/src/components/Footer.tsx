import React from 'react'

interface FooterProps {
  onOpenModal: (modalType: 'tos' | 'privacy') => void
}

const Footer: React.FC<FooterProps> = ({ onOpenModal }) => {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 text-center border-t border-gray-700/30">
      <p className="text-gray-400 text-sm mb-4">
        Powered by Google Gemini AI • Created with ❤️ for entrepreneurs
      </p>
      <div className="space-x-4">
        <button
          onClick={() => onOpenModal('tos')}
          className="text-gray-500 hover:text-cyan-400 transition-colors text-sm font-mono"
        >
          TERMS OF SERVICE
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={() => onOpenModal('privacy')}
          className="text-gray-500 hover:text-cyan-400 transition-colors text-sm font-mono"
        >
          PRIVACY POLICY
        </button>
      </div>
    </div>
  )
}

export default Footer


