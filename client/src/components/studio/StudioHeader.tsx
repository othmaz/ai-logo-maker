import React from 'react';
import { Sparkles, Shield, CreditCard } from 'lucide-react';

/**
 * StudioHeader — Minimal, trust-focused navigation
 * 
 * Vibe: Premium SaaS, not retro terminal
 */
export const StudioHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500 shadow-[0_0_20px_rgba(8,145,178,0.3)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Craft Your Logo</h1>
              <p className="text-xs text-gray-500">AI Logo Studio</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="h-4 w-4 text-cyan-500" />
              <span className="text-sm">Secure SSL</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <CreditCard className="h-4 w-4 text-cyan-500" />
              <span className="text-sm">Stripe Payments</span>
            </div>
          </div>

          {/* User menu placeholder */}
          <div className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/[0.1]" />
        </div>
      </div>
      
      {/* Subtle divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </header>
  );
};

export default StudioHeader;
