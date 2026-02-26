import React, { useState } from 'react';
import { Sparkles, Zap, Lock, CreditCard, Palette, Type } from 'lucide-react';
import { StudioHeader } from './StudioHeader';
import { StudioCard } from './StudioCard';
import { StudioButton } from './StudioButton';
import { LogoResultCard } from './LogoResultCard';

/**
 * StudioDesignDemo — Preview of the new dark studio design system
 * 
 * This is a prototype page showing the new visual direction:
 * - Dark glassmorphism (inverted Domeo pattern)
 * - Subtle cyan accents
 * - Premium studio/agency feel
 * - Trust-focused UI for payments
 */
const StudioDesignDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'results' | 'upgrade'>('form');
  const [businessName, setBusinessName] = useState('Acme Corp');

  // Demo logo data
  const demoLogos = [
    { id: '1', url: 'https://placehold.co/600x600/12121a/0891b2?text=Logo+1', prompt: 'Modern minimalist tech logo', isPremium: true },
    { id: '2', url: 'https://placehold.co/600x600/12121a/0891b2?text=Logo+2', prompt: 'Bold geometric wordmark', isPremium: true },
    { id: '3', url: 'https://placehold.co/600x600/12121a/0891b2?text=Logo+3', prompt: 'Elegant serif logotype', isPremium: false },
    { id: '4', url: 'https://placehold.co/600x600/12121a/0891b2?text=Logo+4', prompt: 'Clean sans-serif brand mark', isPremium: true },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <StudioHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tab navigation */}
        <div className="mb-8 flex gap-2">
          {(['form', 'results', 'upgrade'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* FORM SECTION */}
        {activeTab === 'form' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <StudioCard variant="elevated" className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Create Your Logo</h2>
                <p className="mt-1 text-gray-500">Tell us about your business and we'll generate the perfect mark.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl bg-[#1a1a25] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    placeholder="Enter your company name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">Industry</label>
                    <select className="w-full rounded-xl bg-[#1a1a25] border border-white/[0.08] px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none">
                      <option>Technology</option>
                      <option>Fashion</option>
                      <option>Food & Beverage</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">Style</label>
                    <select className="w-full rounded-xl bg-[#1a1a25] border border-white/[0.08] px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none">
                      <option>Modern</option>
                      <option>Minimal</option>
                      <option>Vintage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Description</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl bg-[#1a1a25] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none"
                    placeholder="Briefly describe what your business does..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <StudioButton variant="primary" size="lg" className="flex-1">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Logos
                  </StudioButton>
                  
                  <StudioButton variant="secondary" size="lg">
                    <Palette className="h-5 w-5" />
                  </StudioButton>
                </div>
              </div>
            </StudioCard>

            <div className="space-y-4">
              <StudioCard className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <Zap className="h-5 w-5 text-cyan-500" />
                  What You Get
                </h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-cyan-500/20 text-center text-xs leading-5 text-cyan-400">5</span>
                    <span>AI-generated logo variations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-cyan-500/20 text-center text-xs leading-5 text-cyan-400">✓</span>
                    <span>Unlimited refinements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-cyan-500/20 text-center text-xs leading-5 text-cyan-400">✓</span>
                    <span>High-res downloads (premium)</span>
                  </li>
                </ul>
              </StudioCard>

              <StudioCard className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <Type className="h-5 w-5 text-cyan-500" />
                  Pro Tips
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Be specific about your brand personality. Instead of "modern," try 
                  "clean sans-serif with geometric accents for a fintech startup."
                </p>
              </StudioCard>
            </div>
          </div>
        )}

        {/* RESULTS SECTION */}
        {activeTab === 'results' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Logos</h2>
                <p className="text-gray-500">Round 1 of 3 • 5 variations generated</p>
              </div>
              <StudioButton variant="primary">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate More
              </StudioButton>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {demoLogos.map((logo) => (
                <LogoResultCard
                  key={logo.id}
                  imageUrl={logo.url}
                  prompt={logo.prompt}
                  isPremium={logo.isPremium}
                  onLike={() => console.log('Like', logo.id)}
                  onRefine={() => console.log('Refine', logo.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* UPGRADE SECTION */}
        {activeTab === 'upgrade' && (
          <div className="mx-auto max-w-2xl">
            <StudioCard variant="elevated" className="p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-500 shadow-[0_0_30px_rgba(8,145,178,0.4)]">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Upgrade to Premium</h2>
                <p className="mt-2 text-gray-400">Unlock unlimited generations and professional downloads.</p>
              </div>

              <div className="mb-8 space-y-4">
                {[
                  'Unlimited AI logo generations',
                  '8K high-resolution downloads',
                  'Vector SVG export',
                  'Transparent background removal',
                  'Favicon pack for web',
                  'Full commercial license'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20">
                      <svg className="h-3 w-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6 rounded-xl bg-white/[0.03] p-6 text-center">
                <div className="text-sm text-gray-500">One-time payment</div>
                <div className="mt-1 text-4xl font-bold text-white">€9.99</div>
                <div className="text-sm text-gray-500">No subscription. Lifetime access.</div>
              </div>

              <div className="space-y-4">
                <StudioButton variant="primary" size="lg" className="w-full">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay Securely
                </StudioButton>

                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    SSL Encrypted
                  </div>
                  <span className="text-gray-700">•</span>
                  <span>Stripe Secure</span>
                  <span className="text-gray-700">•</span>
                  <span>30-day refund</span>
                </div>
              </div>
            </StudioCard>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudioDesignDemo;
