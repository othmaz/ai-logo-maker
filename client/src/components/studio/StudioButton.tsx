import React from 'react';

/**
 * StudioButton — Primary and secondary actions
 */
interface StudioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const StudioButton: React.FC<StudioButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  ...props
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: `
      text-white
      bg-gradient-to-r from-cyan-600 to-cyan-500
      hover:from-cyan-500 hover:to-cyan-400
      shadow-[0_0_20px_rgba(8,145,178,0.3)]
      hover:shadow-[0_0_30px_rgba(8,145,178,0.4)]
    `,
    secondary: `
      text-gray-300
      bg-white/[0.06] hover:bg-white/[0.1]
      border border-white/[0.1] hover:border-white/[0.15]
      backdrop-blur-xl
    `,
    ghost: `
      text-gray-400 hover:text-white
      hover:bg-white/[0.05]
    `
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-sm rounded-xl',
    lg: 'px-8 py-4 text-base rounded-xl'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
          <span className="opacity-0">{children}</span>
        </>
      ) : children}
    </button>
  );
};

export default StudioButton;
