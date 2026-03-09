import React, { useState } from 'react';
import { StudioCard } from './StudioCard';
import { StudioButton } from './StudioButton';

/**
 * LogoResultCard — Glass card for generated logos
 */
interface LogoResultCardProps {
  imageUrl: string;
  prompt?: string;
  isPremium?: boolean;
  onLike?: () => void;
  onDownload?: () => void;
  onRefine?: () => void;
  isLiked?: boolean;
}

export const LogoResultCard: React.FC<LogoResultCardProps> = ({
  imageUrl,
  prompt,
  isPremium = false,
  onLike,
  onDownload,
  onRefine,
  isLiked = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <StudioCard
      variant="subtle"
      className={`
        group transition-all duration-300
        ${isHovered ? 'border-cyan-500/30 shadow-[0_0_30px_rgba(8,145,178,0.15)]' : ''}
      `}
    >
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo image */}
        <div className="aspect-square overflow-hidden rounded-t-2xl bg-[#12121a]">
          <img
            src={imageUrl}
            alt={prompt || 'Generated logo'}
            className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Hover overlay with actions */}
        <div className={`
          absolute inset-0 flex items-center justify-center gap-3
          bg-black/60 backdrop-blur-sm
          transition-opacity duration-200
          ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
          <StudioButton variant="secondary" size="sm" onClick={onLike}>
            <span className={`${isLiked ? 'text-cyan-500' : ''}`}>♡</span>
          </StudioButton>

          {isPremium && (
            <StudioButton variant="secondary" size="sm" onClick={onDownload}>
              <span>↓</span>
            </StudioButton>
          )}

          <StudioButton variant="primary" size="sm" onClick={onRefine}>
            <span className="mr-1">✦</span>
            Refine
          </StudioButton>
        </div>

        {/* Card footer */}
        <div className="border-t border-white/[0.05] px-5 py-4">
          <p className="text-sm text-gray-400 line-clamp-2">
            {prompt || 'Generated logo design'}
          </p>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
                  <span>↓</span>
                  HD Available
                </span>
              )}
            </div>

            <button
              onClick={onLike}
              className={`
                flex h-8 w-8 items-center justify-center rounded-lg
                transition-all duration-200
                ${isLiked 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'bg-white/[0.05] text-gray-500 hover:bg-white/[0.1] hover:text-gray-300'
                }
              `}
            >
              <span>{isLiked ? '♥' : '♡'}</span>
            </button>
          </div>
        </div>
      </div>
    </StudioCard>
  );
};

export default LogoResultCard;
