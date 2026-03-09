import React from 'react';

/**
 * StudioCard — Primary glass container
 * 
 * Uses Domeo's glassmorphism DNA but inverted for dark mode
 */
interface StudioCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
}

export const StudioCard: React.FC<StudioCardProps> = ({
  children,
  className = '',
  variant = 'default'
}) => {
  const variants = {
    default: 'bg-white/[0.05] backdrop-blur-2xl border-white/[0.08]',
    elevated: 'bg-white/[0.07] backdrop-blur-3xl border-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.5)]',
    subtle: 'bg-white/[0.04] backdrop-blur-xl border-white/[0.06]'
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        ${variants[variant]}
        border
        shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
        ${className}
      `}
    >
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </div>
  );
};

export default StudioCard;
