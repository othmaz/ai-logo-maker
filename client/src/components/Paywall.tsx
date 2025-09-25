import React from 'react'
import { Link } from 'react-router-dom'

type PaywallProps = {
  message?: string
}

const Paywall: React.FC<PaywallProps> = ({ message }) => {
  return (
    <div className="border-2 border-pink-500 text-white p-6 rounded-none bg-gray-900/70">
      <h3 className="font-bold text-xl">Unlock Premium</h3>
      <p className="mt-2 opacity-90">{message || 'Upgrade to generate unlimited logos and 8K upscaling.'}</p>
      <Link to="/" className="inline-block mt-4 px-4 py-2 bg-cyan-400 text-black font-bold">Get Started</Link>
    </div>
  )
}

export default Paywall


