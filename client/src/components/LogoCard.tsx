import React from 'react'

type LogoCardProps = {
  src: string
  title?: string
  onClick?: () => void
}

const LogoCard: React.FC<LogoCardProps> = ({ src, title, onClick }) => {
  return (
    <button onClick={onClick} className="text-left group">
      <div className="rounded-lg overflow-hidden border border-cyan-400/30">
        <img src={src} alt={title || 'Logo'} className="w-full h-auto block" />
      </div>
      {title && (
        <div className="mt-2 text-white/90 group-hover:text-white">{title}</div>
      )}
    </button>
  )
}

export default LogoCard


