/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { SignInButton, SignUpButton, useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { useDbContext } from '../../contexts/DatabaseContext';
import '../../styles/dark-studio.css';
const FORM_STATE_KEY = 'hpFormState';
import { type LogoFormData, type DesignBrief } from '../../lib/promptBuilder';

const DownloadModal = lazy(() => import('../DownloadModal'));
const CookieConsent = lazy(() => import('../CookieConsent'));
const StripeCheckoutModal = lazy(() => import('./StripeCheckoutModal'));

type Step = 'name' | 'industry' | 'style' | 'logoType' | 'dimension' | 'color' | 'background' | 'tagline' | 'inspiration' | 'description' | 'done';
type ColorMode = '' | 'exact' | 'guided' | 'ai';
type RefineSelectionModalState = {
  message: string;
} | null;

const STEP_SEQUENCE: Step[] = ['name', 'industry', 'style', 'logoType', 'dimension', 'color', 'background', 'tagline', 'inspiration', 'description', 'done'];
const DEFAULT_RESUME_LOCKED_STEPS: Step[] = ['name', 'industry', 'style', 'logoType', 'dimension', 'color', 'background', 'tagline', 'description'];

const ANON_CREDITS_LIMIT = 5;
const SIGNIN_BONUS_CREDITS = 10;
const LOADING_LOGO_SLOT = '';

const createGenerationRequestId = (stage: 'initial' | 'refine') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `gen_${stage}_${crypto.randomUUID()}`;
  }

  return `gen_${stage}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const INDUSTRIES = [
  { label: 'Technology',   icon: '⚡', hot: true },
  { label: 'Fashion',      icon: '✦' },
  { label: 'Food & Drink', icon: '◈', hot: true },
  { label: 'Consulting',   icon: '◇' },
  { label: 'Healthcare',   icon: '✚' },
  { label: 'Creative',     icon: '◉', hot: true },
  { label: 'Finance',      icon: '▲' },
  { label: 'Education',    icon: '◆' },
  { label: 'Retail',       icon: '◎' },
  { label: 'Real Estate',  icon: '⬡' },
  { label: 'Sports',       icon: '◐' },
  { label: 'Legal',        icon: '⊞' },
  { label: 'Beauty',       icon: '✿' },
  { label: 'Travel',       icon: '◬' },
  { label: 'Other',        icon: '○' },
];

const STYLES = [
  { label: 'Modern',       hot: true },
  { label: 'Minimalist',   hot: true },
  { label: 'Vintage' },
  { label: 'Playful' },
  { label: 'Professional' },
  { label: 'Bold',         hot: true },
  { label: 'Luxury' },
  { label: 'Futuristic' },
  { label: 'Organic' },
  { label: 'Geometric' },
];

const LOGO_TYPES = [
  { label: 'Wordmark',    icon: 'Aa', desc: 'Name as logo' },
  { label: 'Lettermark',  icon: 'A',  desc: 'Initials only' },
  { label: 'Combination', icon: 'A⊞', desc: 'Icon + text' },
  { label: 'Pictorial',   icon: '◉',  desc: 'Symbol / icon' },
  { label: 'Abstract',    icon: '◈',  desc: 'Abstract shape' },
];

const DIMENSIONS = [
  { label: '2D', icon: '□', desc: 'Flat & clean' },
  { label: '3D', icon: '◆', desc: 'Depth & volume' },
];

const COLOR_SWATCHES = [
  { label: 'Red',     hex: '#ef4444', glow: 'rgba(239,68,68,0.6)' },
  { label: 'Orange',  hex: '#f97316', glow: 'rgba(249,115,22,0.6)' },
  { label: 'Amber',   hex: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
  { label: 'Emerald', hex: '#10b981', glow: 'rgba(16,185,129,0.6)' },
  { label: 'Cyan',    hex: '#22d3ee', glow: 'rgba(34,211,238,0.6)' },
  { label: 'Blue',    hex: '#3b82f6', glow: 'rgba(59,130,246,0.6)' },
  { label: 'Indigo',  hex: '#818cf8', glow: 'rgba(129,140,248,0.6)' },
  { label: 'Violet',  hex: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
  { label: 'Fuchsia', hex: '#e879f9', glow: 'rgba(232,121,249,0.6)' },
  { label: 'Rose',    hex: '#fb7185', glow: 'rgba(251,113,133,0.6)' },
  { label: 'Gold',    hex: '#fbbf24', glow: 'rgba(251,191,36,0.6)' },
  { label: 'White',   hex: '#f1f5f9', glow: 'rgba(241,245,249,0.4)' },
  { label: 'Black',   hex: '#1e293b', glow: 'rgba(30,41,59,0.6)' },
];

const BACKGROUNDS = [
  { label: 'Plain White', value: 'white',     desc: 'Clean white bg', hot: true },
  { label: 'Neon',        value: 'neon',      desc: 'Glowing effect' },
  { label: 'Solid',       value: 'solid',     desc: 'Flat fill' },
  { label: 'Gradient',    value: 'gradient',  desc: 'Color blend' },
  { label: 'Glass',       value: 'glass',     desc: '3D frosted',  hot: true },
  { label: 'Dark',        value: 'dark',      desc: 'Night mode' },
];

const GUIDED_PALETTES: { name: string; swatches: string[]; vibe: string; backendPrompt: string }[] = [
  {
    name: 'Volt',
    swatches: ['#000000', '#E0FF00', '#FFFFFF'],
    vibe: 'Brutalist, Tech, Fitness',
    backendPrompt: 'Primary #000000, accent #E0FF00, neutral #FFFFFF.',
  },
  {
    name: 'Cobalt',
    swatches: ['#0A192F', '#64FFDA', '#F8F9FA'],
    vibe: 'Fintech, Cybersecurity',
    backendPrompt: 'Primary #0A192F, accent #64FFDA, neutral #F8F9FA.',
  },
  {
    name: 'Canopy',
    swatches: ['#1B4332', '#95D5B2', '#FBF8F1'],
    vibe: 'Eco, Organic, Wellness',
    backendPrompt: 'Primary #1B4332, accent #95D5B2, neutral #FBF8F1.',
  },
  {
    name: 'Ignite',
    swatches: ['#D00000', '#FFBA08', '#FFFFFF'],
    vibe: 'Food, Energetic, Retail',
    backendPrompt: 'Primary #D00000, accent #FFBA08, neutral #FFFFFF.',
  },
  {
    name: 'Aura',
    swatches: ['#14213D', '#FCA311', '#FAFAFA'],
    vibe: 'Luxury, Real Estate, Law',
    backendPrompt: 'Primary #14213D, accent #FCA311, neutral #FAFAFA.',
  },
  {
    name: 'Bloom',
    swatches: ['#EF476F', '#073B4C', '#FFE8D6'],
    vibe: 'Modern D2C, Creative',
    backendPrompt: 'Primary #073B4C, accent #EF476F, neutral #FFE8D6.',
  },
  {
    name: 'Graphite',
    swatches: ['#212529', '#6C757D', '#FFFFFF'],
    vibe: 'Architecture, Minimalist',
    backendPrompt: 'Primary #212529, secondary #6C757D, neutral #FFFFFF.',
  },
  {
    name: 'Nebula',
    swatches: ['#3A0CA3', '#4CC9F0', '#FFFFFF'],
    vibe: 'Web3, AI, Agencies',
    backendPrompt: 'Primary #3A0CA3, accent #4CC9F0, neutral #FFFFFF.',
  },
  {
    name: 'Dune',
    swatches: ['#E07A5F', '#F4F1DE', '#3D405B'],
    vibe: 'Cafes, Boutiques, Retro',
    backendPrompt: 'Primary #3D405B, accent #E07A5F, neutral #F4F1DE.',
  },
  {
    name: 'Oasis',
    swatches: ['#006D77', '#83C5BE', '#FFFFFF'],
    vibe: 'Health, SaaS, Clean',
    backendPrompt: 'Primary #006D77, accent #83C5BE, neutral #FFFFFF.',
  },
  {
    name: 'Midnight Mint',
    swatches: ['#0B1320', '#14B8A6', '#F8FAFC'],
    vibe: 'SaaS, Devtools, Modern premium',
    backendPrompt: 'Primary #0B1320, accent #14B8A6, neutral #F8FAFC.',
  },
  {
    name: 'Carbon Lime',
    swatches: ['#111827', '#A3E635', '#F3F4F6'],
    vibe: 'Fitness-tech, Web3, Performance',
    backendPrompt: 'Primary #111827, accent #A3E635, neutral #F3F4F6.',
  },
  {
    name: 'Royal Copper',
    swatches: ['#1E3A8A', '#B45309', '#FFF7ED'],
    vibe: 'Finance, Consulting, Premium B2B',
    backendPrompt: 'Primary #1E3A8A, accent #B45309, neutral #FFF7ED.',
  },
  {
    name: 'Obsidian Rose',
    swatches: ['#0B0F1A', '#FB7185', '#E5E7EB'],
    vibe: 'Beauty-tech, Creator brands, Apps',
    backendPrompt: 'Primary #0B0F1A, accent #FB7185, neutral #E5E7EB.',
  },
  {
    name: 'Evergreen Gold',
    swatches: ['#064E3B', '#F59E0B', '#FFFBEB'],
    vibe: 'Eco, Food, Craft, Wellness',
    backendPrompt: 'Primary #064E3B, accent #F59E0B, neutral #FFFBEB.',
  },
  {
    name: 'Ultramarine Sky',
    swatches: ['#1D4ED8', '#38BDF8', '#0F172A'],
    vibe: 'Fintech, Cloud, Cybersecurity',
    backendPrompt: 'Primary #1D4ED8, accent #38BDF8, neutral #0F172A.',
  },
  {
    name: 'Plum Ice',
    swatches: ['#4C1D95', '#A78BFA', '#F8FAFC'],
    vibe: 'Education, Creative SaaS, Communities',
    backendPrompt: 'Primary #4C1D95, accent #A78BFA, neutral #F8FAFC.',
  },
  {
    name: 'Graphite Teal',
    swatches: ['#111827', '#0EA5A4', '#F9FAFB'],
    vibe: 'Productivity, Analytics, B2B SaaS',
    backendPrompt: 'Primary #111827, accent #0EA5A4, neutral #F9FAFB.',
  },
  {
    name: 'Brick Sand',
    swatches: ['#9A3412', '#FDE68A', '#1F2937'],
    vibe: 'Hospitality, Trades, Local business',
    backendPrompt: 'Primary #9A3412, accent #FDE68A, neutral #1F2937.',
  },
  {
    name: 'Mono Pro',
    swatches: ['#0F172A', '#94A3B8', '#FFFFFF'],
    vibe: 'Universal, Enterprise, Serious brands',
    backendPrompt: 'Primary #0F172A, secondary #94A3B8, neutral #FFFFFF.',
  },
  {
    name: 'Crimson Flare',
    swatches: ['#D00000', '#F97316', '#FFFFFF'],
    vibe: 'Food, Retail, Energy',
    backendPrompt: 'Primary #D00000, accent #F97316, neutral #FFFFFF.',
  },
  {
    name: 'Terracotta Clay',
    swatches: ['#C96C4B', '#7A5A46', '#F4E8D8'],
    vibe: 'Coffee, Organic, Craft',
    backendPrompt: 'Primary #C96C4B, secondary #7A5A46, neutral #F4E8D8.',
  },
  {
    name: 'Solar Void',
    swatches: ['#FACC15', '#000000', '#FFFFFF'],
    vibe: 'Creative, Brutalist, Tech',
    backendPrompt: 'Primary #FACC15, secondary #000000, neutral #FFFFFF.',
  },
  {
    name: 'Sage Bloom',
    swatches: ['#8FAF8F', '#F2B8B5', '#FFF7EC'],
    vibe: 'Wellness, Skincare, Soft',
    backendPrompt: 'Primary #8FAF8F, accent #F2B8B5, neutral #FFF7EC.',
  },
  {
    name: 'Mystic Teal',
    swatches: ['#1E5A6C', '#C9CF97', '#191F18'],
    vibe: 'Gaming, Fantasy, Collectibles',
    backendPrompt: 'Primary #1E5A6C, accent #C9CF97, neutral #191F18.',
  },
];

function getRecommendedLogoType(industry: string, style: string): string {
  const tech  = industry === 'Technology';
  const corp  = ['Finance','Legal','Consulting','Healthcare'].includes(industry);
  const creat = ['Creative','Fashion','Beauty','Travel'].includes(industry);
  const food  = ['Food & Drink','Retail','Sports'].includes(industry);
  const minim = ['Minimalist','Modern'].includes(style);
  if (tech && minim) return 'Wordmark';
  if (tech)          return 'Combination';
  if (corp)          return 'Lettermark';
  if (creat)         return 'Pictorial';
  if (food)          return 'Combination';
  return 'Combination';
}

function getRecommendedDimension(style: string): string {
  return ['Bold','Futuristic','Luxury','Geometric'].includes(style) ? '3D' : '2D';
}

function getRecommendedBg(dimension: string, style: string): string {
  void dimension;
  void style;
  // Gemini doesn't support true transparency, default to white
  return 'white';
}

function getStyleHint(industry: string, style: string): string | null {
  const tech  = industry === 'Technology';
  const corp  = ['Finance','Legal','Consulting'].includes(industry);
  const food  = industry === 'Food & Drink';
  const bold  = ['Bold','Futuristic','Luxury'].includes(style);
  if (tech && bold) return 'Tech + bold is powerful — go 3D for maximum impact.';
  if (tech)         return 'Clean tech logos often use Wordmarks or Combination marks.';
  if (corp)         return 'Corporate brands favor Lettermarks for a compact, professional look.';
  if (food)         return 'Food brands shine with Combination marks and warm colors.';
  return null;
}

const glassDark = 'rgba(5,5,8,0.72)';
const glassBlur = 'blur(20px)';
const glassBase: React.CSSProperties = { background: glassDark, backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur };

const pillBase = (selected: boolean, border: string, bg: string): React.CSSProperties => ({
  ...glassBase, background: selected ? bg : glassDark,
  border: selected ? `1px solid ${border}` : '1px solid rgba(255,255,255,0.08)',
  boxShadow: selected ? `0 0 18px ${border}44` : undefined,
});

const HotBadge = () => (
  <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
    style={{ background:'rgba(34,211,238,0.15)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.25)' }}>✦</span>
);

const RecBadge = () => (
  <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full"
    style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>★ for you</span>
);

const Hint: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-indigo-300/60 italic pl-1 mt-1">💡 {text}</p>
);

const BgPreview: React.FC<{ value: string; primaryHex: string }> = ({ value, primaryHex }) => {
  const b: React.CSSProperties = { width:'100%', height:'100%', borderRadius:6 };
  if (value==='none')     return <div style={{ ...b, border:'1.5px dashed rgba(255,255,255,0.18)' }} />;
  if (value==='white')    return <div style={{ ...b, background:'#ffffff', border:'1px solid rgba(255,255,255,0.3)' }} />;
  if (value==='solid')    return <div style={{ ...b, background: primaryHex }} />;
  if (value==='gradient') return <div style={{ ...b, background:`linear-gradient(135deg,${primaryHex},#e879f9)` }} />;
  if (value==='glass')    return <div style={{ ...b, background:'linear-gradient(135deg,rgba(255,255,255,0.28),rgba(255,255,255,0.07))', border:'1px solid rgba(255,255,255,0.32)', boxShadow:'inset 0 1px 1px rgba(255,255,255,0.28)' }} />;
  if (value==='dark')     return <div style={{ ...b, background:'linear-gradient(135deg,#0a0a12,#16162a)' }} />;
  if (value==='neon')     return <div style={{ ...b, background:'#050508', boxShadow:`inset 0 0 14px ${primaryHex}88`, border:`1px solid ${primaryHex}66` }} />;
  return null;
};

const StudioDesignDemoHeroProgressive: React.FC = () => {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { userProfile, isPremiumUser, saveLogoToDB, removeLogoFromDB, savedLogos, trackLogoGeneration, updateUserSubscription } = useDbContext();

  const [businessName,   setBusinessName]   = useState('');
  const [industry,       setIndustry]       = useState('');
  const [style,          setStyle]          = useState('');
  const [logoType,       setLogoType]       = useState('');
  const [dimension,      setDimension]      = useState('');
  const [primaryColor,   setPrimaryColor]   = useState('');
  const [primaryHex,     setPrimaryHex]     = useState('');
  const [showSecondary,  setShowSecondary]  = useState(false);
  const [secondaryColor, setSecondaryColor] = useState('');
  const [secondaryHex,   setSecondaryHex]   = useState('');
  const [showTertiary,   setShowTertiary]   = useState(false);
  const [tertiaryColor,  setTertiaryColor]  = useState('');
  const [tertiaryHex,    setTertiaryHex]    = useState('');
  const [colorMode,      setColorMode]      = useState<ColorMode>('');
  const [guidedPalette,  setGuidedPalette]  = useState('');
  const [guidedVibe,     setGuidedVibe]     = useState('');
  const [guidedTemp,     setGuidedTemp]     = useState('');
  const [guidedContrast, setGuidedContrast] = useState('');
  const [guidedAvoid,    setGuidedAvoid]    = useState<string[]>([]);
  const [colorUsageRules,     setColorUsageRules]     = useState('');
  const [background,     setBackground]     = useState('');
  const [taglineChoice,  setTaglineChoice]  = useState<'none'|'with'|''>('');
  const [taglineText,    setTaglineText]    = useState('');
  const [description,    setDescription]    = useState('');
  const [logoRounds,     setLogoRounds]     = useState<string[][]>([]);
  const [genError,       setGenError]       = useState('');
  const [creditBalance,  setCreditBalance]  = useState<number|null>(null); // derived from DB or anon localStorage
  const [refineFeedback, setRefineFeedback] = useState('');
  const [refineHistory,  setRefineHistory]  = useState<string[]>([]);
  const [specCore,       setSpecCore]       = useState<any>(null);
  const [latestDelta,    setLatestDelta]    = useState<any>(null);
  const [refineCount,    setRefineCount]    = useState<1|3|5>(1);
  const [isRefining,     setIsRefining]     = useState(false);
  const [refineError,    setRefineError]    = useState('');
  const [refineSelectionModal, setRefineSelectionModal] = useState<RefineSelectionModalState>(null);
  const [selectedIdxs,   setSelectedIdxs]   = useState<Set<number>>(new Set());
  const [stickySelectedRefUrls, setStickySelectedRefUrls] = useState<string[]>([]);
  const [likedUrls,      setLikedUrls]      = useState<Set<string>>(new Set());
  const latestRoundRef = useRef<HTMLDivElement>(null);
  const [authModal,      setAuthModal]      = useState<'save'|'upgrade'|'variations'|null>(null);
  const [stripeSecret,   setStripeSecret]   = useState<string|null>(null);
  const [paymentIntentId,setPaymentIntentId] = useState<string|null>(null);
  const [stripeLoading,  setStripeLoading]  = useState(false);
  const [stripeError,    setStripeError]    = useState('');
  const [tosAccepted,    setTosAccepted]    = useState(false);
  const [downloadModal,  setDownloadModal]  = useState<{id:string;url:string;prompt:string}|null>(null);
  const [freeDownloadUrl, setFreeDownloadUrl] = useState<string|null>(null);
  const [toasts,         setToasts]         = useState<{id:string;message:string;type:'success'|'error'|'info'|'warning'}[]>([]);
  const [showCollection, setShowCollection] = useState(false);
  const [infoModal, setInfoModal] = useState<'about'|'tos'|'privacy'|null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imgPreviews,    setImgPreviews]    = useState<string[]>([]);
  const refineRef = useRef<HTMLDivElement>(null);
  const [visibleSteps,   setVisibleSteps]   = useState<Step[]>(['name']);
  const [lockedSteps,    setLockedSteps]    = useState<Set<Step>>(new Set());
  const [generating,     setGenerating]     = useState(false);
  const [restoringState, setRestoringState] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const INITIAL_GENERATION_COUNT = 3;

  const isUploadedEditMode = uploadedImages.length > 0 && logoRounds.length === 0;

  const tutorialSteps = [
    {
      title: 'Pick a logo you like',
      description: 'Select one or more logos to set direction (not an exact copy). If none are good, select none and say that clearly in feedback.',
    },
    {
      title: 'Write what to change',
      description: 'Be explicit: what you dislike, what you expected, and what to preserve (e.g. "too busy, expected cleaner spacing, keep colors").',
    },
  ] as const;

  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [tutorialDismissedThisFlow, setTutorialDismissedThisFlow] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(-1);
  const [isTutorialStarting, setIsTutorialStarting] = useState(false);
  const [tutorialHighlight, setTutorialHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const safeGetToken = async (): Promise<string | null> => {
    try {
      const tokenPromise = getToken();
      const timeoutPromise = new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 1500);
      });

      const token = await Promise.race([tokenPromise, timeoutPromise]);
      return token || null;
    } catch (error) {
      console.warn('⚠️ Clerk token unavailable, continuing as anonymous request', error);
      return null;
    }
  };

  const nameRef        = useRef<HTMLInputElement>(null);
  const customColorRef = useRef<HTMLInputElement>(null);
  const customSecRef   = useRef<HTMLInputElement>(null);
  const customThirdRef = useRef<HTMLInputElement>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const colorConfirmRef = useRef<HTMLButtonElement>(null);
  const doneRef         = useRef<HTMLDivElement>(null);
  const latestStepRef   = useRef<HTMLDivElement>(null);
  const industryRef      = useRef<HTMLDivElement>(null);
  const headerRef        = useRef<HTMLDivElement>(null);
  const nameBlockRef     = useRef<HTMLDivElement>(null);
  const [nameTopOffset, setNameTopOffset] = useState(0);

  const ATTRIBUTION_STORAGE_KEY = 'hpAttribution';
  const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'] as const;

  const getAttributionData = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};

    const out: Record<string, string> = {};

    try {
      const params = new URLSearchParams(window.location.search);
      for (const key of ATTRIBUTION_KEYS) {
        const value = params.get(key);
        if (value) out[key] = value;
      }

      if (Object.keys(out).length > 0) {
        localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(out));
        return out;
      }

      const cached = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      if (!cached) return {};

      return JSON.parse(cached);
    } catch {
      return {};
    }
  };

  const trackGaEvent = (eventName: string, payload: Record<string, unknown> = {}) => {
    if (typeof window === 'undefined' || !(window as any).gtag) return;

    const attribution = getAttributionData();
    try {
      (window as any).gtag('event', eventName, { ...attribution, ...payload });
    } catch (error) {
      console.warn(`GA4 tracking failed for ${eventName}:`, error);
    }
  };

  const showUpgradePaywall = (reason: string) => {
    setAuthModal('upgrade');
    trackGaEvent('paywall_shown', {
      reason,
      credits_remaining: creditBalance ?? null,
      user_tier: isPremiumUser() ? 'premium' : isSignedIn ? 'signed_free' : 'anonymous',
    });
  };

  // Load saved form state on mount
  useEffect(() => {
    const saved = localStorage.getItem(FORM_STATE_KEY);
    try {
      if (saved) {
        const data = JSON.parse(saved);
        if (data.businessName !== undefined) setBusinessName(data.businessName);
        if (data.industry !== undefined) setIndustry(data.industry);
        if (data.style !== undefined) setStyle(data.style);
        if (data.logoType !== undefined) setLogoType(data.logoType);
        if (data.dimension !== undefined) setDimension(data.dimension);
        if (data.primaryColor !== undefined) setPrimaryColor(data.primaryColor);
        if (data.secondaryColor !== undefined) setSecondaryColor(data.secondaryColor);
        if (data.tertiaryColor !== undefined) setTertiaryColor(data.tertiaryColor);
        if (data.showSecondary !== undefined) setShowSecondary(Boolean(data.showSecondary));
        else if (data.secondaryColor) setShowSecondary(true);
        if (data.showTertiary !== undefined) setShowTertiary(Boolean(data.showTertiary));
        else if (data.tertiaryColor) setShowTertiary(true);
        if (data.colorMode !== undefined) {
          setColorMode(data.colorMode);
        } else if (data.noFixedColor) {
          // Backward compatibility with earlier toggle implementation
          setColorMode('ai');
        } else if (data.primaryColor) {
          setColorMode('exact');
        }
        if (data.guidedPalette !== undefined) setGuidedPalette(data.guidedPalette);
        if (data.guidedVibe !== undefined) setGuidedVibe(data.guidedVibe);
        if (data.guidedTemp !== undefined) setGuidedTemp(data.guidedTemp);
        if (data.guidedContrast !== undefined) setGuidedContrast(data.guidedContrast);
        if (Array.isArray(data.guidedAvoid)) setGuidedAvoid(data.guidedAvoid.filter(Boolean));
        if (data.colorUsageRules !== undefined) setColorUsageRules(data.colorUsageRules);
        else if (data.colorNotes !== undefined) setColorUsageRules(data.colorNotes); // legacy key
        if (data.background !== undefined) setBackground(data.background);
        if (data.taglineChoice !== undefined) setTaglineChoice(data.taglineChoice);
        if (data.taglineText !== undefined) setTaglineText(data.taglineText);
        if (data.description !== undefined) setDescription(data.description);
        if (Array.isArray(data.refineHistory)) setRefineHistory(data.refineHistory.filter(Boolean));

        const hasRounds = Array.isArray(data.logoRounds) && data.logoRounds.length > 0;
        if (hasRounds) setLogoRounds(data.logoRounds);

        if (Array.isArray(data.visibleSteps) && data.visibleSteps.length > 0) {
          setVisibleSteps(data.visibleSteps);
        } else if (hasRounds) {
          const fallbackSteps: Step[] = ['name','industry','style','logoType','dimension','color','background','tagline','inspiration','description','done'];
          setVisibleSteps(fallbackSteps);
        }

        if (Array.isArray(data.lockedSteps)) {
          setLockedSteps(new Set(data.lockedSteps || []));
        }

        if (hasRounds) {
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }), 250);
        }
      }
    } catch {
      // ignore malformed saved state
    } finally {
      setRestoringState(false);
    }
  }, []);

  // Scroll helpers (window-level to avoid black-screen bug from overflow containers)
  const scrollToEl = (el: HTMLElement | null, offset = 120) => {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportPaddingBottom = 48;
    const alreadyComfortablyVisible = rect.top >= offset && rect.bottom <= (window.innerHeight - viewportPaddingBottom);
    if (alreadyComfortablyVisible) return;

    const y = Math.max(0, rect.top + window.scrollY - offset);
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const scrollToElCentered = (el: HTMLElement | null, minimumTopOffset = 96) => {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerOffset = Math.max(minimumTopOffset, (window.innerHeight - rect.height) / 2);
    const y = Math.max(0, rect.top + window.scrollY - centerOffset);
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const getTutorialTarget = (stepIndex: number): HTMLElement | null => {
    if (stepIndex === 0) return latestRoundRef.current || doneRef.current;
    if (stepIndex === 1) return refineRef.current;
    return null;
  };

  const closeTutorial = () => {
    setTutorialStepIndex(-1);
    setIsTutorialStarting(false);
    setTutorialHighlight(null);
    setHasSeenTutorial(true);
    setTutorialDismissedThisFlow(true);
  };

  const nextTutorialStep = () => {
    setTutorialStepIndex((prev) => {
      const next = prev + 1;
      if (next >= tutorialSteps.length) {
        closeTutorial();
        return -1;
      }
      return next;
    });
  };

  const LOGO_TYPE_DETAILS: Record<string, string> = {
    Wordmark: 'A wordmark uses your brand name as the logo. Clean, memorable, and works great for modern tech and fashion brands.',
    Lettermark: 'Lettermarks use initials (like NASA or HBO). Perfect for long brand names or when you want a compact, iconic mark.',
    Combination: 'Combines an icon with text. The most versatile — you can use the icon alone or with text depending on context.',
    Pictorial: 'A recognizable symbol or icon (like Apple\'s apple). Great for global brands and instant visual recognition.',
    Abstract: 'An abstract geometric shape that represents your brand concept. Unique and highly distinctive.',
  };

  const toggleTooltip = (key: string) => {
    setActiveTooltip(prev => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!activeTooltip) return;

    const handleOutsideTooltipClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickedInsideTooltip = Boolean(target.closest('[data-logo-type-tooltip="true"]'));
      const clickedTooltipTrigger = Boolean(target.closest('[data-logo-type-tooltip-trigger="true"]'));
      if (!clickedInsideTooltip && !clickedTooltipTrigger) {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideTooltipClick);
    return () => document.removeEventListener('mousedown', handleOutsideTooltipClick);
  }, [activeTooltip]);

  useEffect(() => {
    if (hasSeenTutorial) return;
    if (tutorialDismissedThisFlow) return;
    if (tutorialStepIndex >= 0) return;
    if (isTutorialStarting) return;
    if (generating || isRefining) return;
    if (logoRounds.length === 0) return;

    setIsTutorialStarting(true);
    const firstTarget = getTutorialTarget(0) || doneRef.current;
    scrollToEl(firstTarget, 96);

    const id = window.setTimeout(() => {
      setTutorialStepIndex(0);
      setIsTutorialStarting(false);
    }, 420);

    return () => window.clearTimeout(id);
  }, [hasSeenTutorial, tutorialDismissedThisFlow, tutorialStepIndex, isTutorialStarting, generating, isRefining, logoRounds.length]);

  useEffect(() => {
    if (tutorialStepIndex < 0) {
      setTutorialHighlight(null);
      return;
    }

    let rafId: number | null = null;

    const updateHighlight = () => {
      const target = getTutorialTarget(tutorialStepIndex);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setTutorialHighlight({
        top: Math.max(8, rect.top - 8),
        left: Math.max(8, rect.left - 8),
        width: rect.width + 16,
        height: rect.height + 16,
      });
    };

    const scheduleHighlightUpdate = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateHighlight();
      });
    };

    if (tutorialStepIndex === 1) {
      scrollToElCentered(refineRef.current, 96);
    }

    updateHighlight();
    const id = window.setTimeout(updateHighlight, 180);

    window.addEventListener('resize', scheduleHighlightUpdate);
    window.addEventListener('scroll', scheduleHighlightUpdate, true);

    return () => {
      window.clearTimeout(id);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', scheduleHighlightUpdate);
      window.removeEventListener('scroll', scheduleHighlightUpdate, true);
    };
  }, [tutorialStepIndex, logoRounds.length, selectedIdxs.size]);

  useEffect(() => { nameRef.current?.focus(); }, []);

  // Open local privacy modal from cookie banner event
  useEffect(() => {
    const handler = () => setInfoModal('privacy');
    window.addEventListener('openPrivacyModal', handler as EventListener);
    return () => window.removeEventListener('openPrivacyModal', handler as EventListener);
  }, []);

  // Deterministic centering: compute exact spacer so name block is visually centered below fixed header
  useEffect(() => {
    if (lockedSteps.has('name')) return;

    const compute = () => {
      const headerH = headerRef.current?.getBoundingClientRect().height ?? 80;
      const nameH = nameBlockRef.current?.getBoundingClientRect().height ?? 0;
      const available = window.innerHeight - headerH;
      // Center inside the visible hero area (below fixed header), not full viewport
      const spacer = Math.max(0, headerH + (available - nameH) / 2 - 32);
      setNameTopOffset(spacer);
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [businessName, lockedSteps]);

  // Save form state on any meaningful change
  useEffect(() => {
    if (restoringState) return;

    const baseData = {
      businessName, industry, style, logoType, dimension,
      primaryColor, secondaryColor, tertiaryColor, showSecondary, showTertiary,
      colorMode, guidedPalette, guidedVibe, guidedTemp, guidedContrast, guidedAvoid, colorUsageRules, background,
      taglineChoice, taglineText, description,
      visibleSteps, lockedSteps: Array.from(lockedSteps),
      refineHistory,
    };

    const buildState = (maxRounds: number | null, maxLogosPerRound: number | null) => {
      const rounds = (maxRounds == null ? logoRounds : logoRounds.slice(-maxRounds))
        .map(round => Array.isArray(round)
          ? (maxLogosPerRound == null ? round : round.slice(0, maxLogosPerRound))
          : [])
        .filter(round => round.length > 0);

      return { ...baseData, logoRounds: rounds };
    };

    // Try progressively smaller snapshots when data URLs make localStorage exceed quota.
    // Never wipe logoRounds to [] as first fallback — that caused users to lose visible results after auth redirects.
    const candidates = [
      { label: 'full', data: buildState(null, null) },
      { label: 'compact(3 rounds x 2 logos)', data: buildState(3, 2) },
      { label: 'compact(2 rounds x 1 logo)', data: buildState(2, 1) },
      { label: 'compact(1 round x 1 logo)', data: buildState(1, 1) },
    ];

    let persisted = false;
    for (const candidate of candidates) {
      try {
        localStorage.setItem(FORM_STATE_KEY, JSON.stringify(candidate.data));
        if (candidate.label !== 'full') {
          console.warn(`⚠️ Persisted ${candidate.label} state due to localStorage quota pressure.`);
        }
        persisted = true;
        break;
      } catch {
        // Try the next smaller snapshot
      }
    }

    if (!persisted) {
      console.warn('⚠️ Could not persist form state (all snapshots exceeded storage quota). Keeping previous saved state.');
    }
  }, [restoringState, businessName, industry, style, logoType, dimension, primaryColor, secondaryColor, tertiaryColor, showSecondary, showTertiary, colorMode, guidedPalette, guidedVibe, guidedTemp, guidedContrast, guidedAvoid, colorUsageRules, background, taglineChoice, taglineText, description, visibleSteps, lockedSteps, logoRounds, refineHistory]);

  // Scroll to newly revealed step (industry handled explicitly on name confirm)
  useEffect(() => {
    if (visibleSteps.length > 1) {
      const newest = visibleSteps[visibleSteps.length - 1];
      if (newest === 'industry') return;
      setTimeout(() => scrollToEl(latestStepRef.current, 96), 150);
    }
  }, [visibleSteps.length]);

  // Scroll to color confirm button once a color mode is selected
  useEffect(() => {
    if (colorMode && !lockedSteps.has('color')) {
      setTimeout(() => scrollToEl(colorConfirmRef.current, 120), 150);
    }
  }, [colorMode]);

  // Scroll to done card when generation completes (fallback only; placeholders already handle primary scroll)
  useEffect(() => {
    if (!generating && visibleSteps.includes('done') && logoRounds.length === 0) {
      setTimeout(() => scrollToEl(doneRef.current, 32), 100);
    }
  }, [generating, logoRounds.length]);

  // Credit tracking: DB for signed-in users, localStorage for anon
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userProfile) {
      // Signed users keep full free tier in DB (guest 5 + sign-in bonus 10 = 15)
      setCreditBalance(isPremiumUser() ? Infinity : Math.max(0, userProfile.credits_limit - userProfile.credits_used));
    } else {
      // Anonymous users get a 5-credit teaser tracked locally
      const used = parseInt(localStorage.getItem('hpCreditsUsed') || '0', 10);
      setCreditBalance(Math.max(0, ANON_CREDITS_LIMIT - used));
    }
  }, [isLoaded, isSignedIn, userProfile]);

  const deductCredits = async (n: number = 1) => {
    if (isSignedIn) {
      // DB tracks via trackLogoGeneration — balance refreshes from userProfile effect
      await trackLogoGeneration('', n, isPremiumUser());
    } else {
      const used = parseInt(localStorage.getItem('hpCreditsUsed') || '0', 10) + n;
      localStorage.setItem('hpCreditsUsed', String(used));
      setCreditBalance(Math.max(0, ANON_CREDITS_LIMIT - used));
    }
  };

  const isLocked = (s: Step) => lockedSteps.has(s);

  const normalizeStepArray = (steps: any, fallback: Step[]): Step[] => {
    if (!Array.isArray(steps)) return fallback;
    const valid = steps.filter((s): s is Step => STEP_SEQUENCE.includes(s as Step));
    if (!valid.length) return fallback;
    const deduped = Array.from(new Set(valid));
    if (!deduped.includes('done')) deduped.push('done');
    return deduped;
  };

  const buildEditorStateSnapshot = (resumeLogoUrl?: string) => ({
    version: 1,
    businessName,
    industry,
    style,
    logoType,
    dimension,
    primaryColor,
    primaryHex,
    showSecondary,
    secondaryColor,
    secondaryHex,
    showTertiary,
    tertiaryColor,
    tertiaryHex,
    colorMode,
    guidedPalette,
    guidedVibe,
    guidedTemp,
    guidedContrast,
    guidedAvoid,
    colorUsageRules,
    background,
    taglineChoice,
    taglineText,
    description,
    visibleSteps: normalizeStepArray(visibleSteps, STEP_SEQUENCE),
    lockedSteps: normalizeStepArray(Array.from(lockedSteps), DEFAULT_RESUME_LOCKED_STEPS),
    refineHistory: refineHistory.slice(-3),
    specCore,
    latestDelta,
    resumeLogoUrl: resumeLogoUrl || null,
  });

  const resumeFromSavedLogo = (logo: any) => {
    const logoUrl = logo?.url || logo?.logo_url;
    if (!logoUrl) {
      showToast('Could not load this saved logo', 'error');
      return;
    }

    let state: any = logo?.editor_state || logo?.editorState || null;
    if (typeof state === 'string') {
      try {
        state = JSON.parse(state);
      } catch {
        state = null;
      }
    }

    let loadedSnapshot = false;

    if (state && typeof state === 'object') {
      loadedSnapshot = true;
      setBusinessName(state.businessName || '');
      setIndustry(state.industry || '');
      setStyle(state.style || '');
      setLogoType(state.logoType || '');
      setDimension(state.dimension || '');
      setPrimaryColor(state.primaryColor || '');
      setPrimaryHex(state.primaryHex || '');
      const secondaryValue = state.secondaryColor || '';
      const tertiaryValue = state.tertiaryColor || '';
      setShowSecondary(typeof state.showSecondary === 'boolean' ? state.showSecondary : Boolean(secondaryValue));
      setSecondaryColor(secondaryValue);
      setSecondaryHex(state.secondaryHex || '');
      setShowTertiary(typeof state.showTertiary === 'boolean' ? state.showTertiary : Boolean(tertiaryValue));
      setTertiaryColor(tertiaryValue);
      setTertiaryHex(state.tertiaryHex || '');
      if (state.colorMode) {
        setColorMode(state.colorMode);
      } else if (state.noFixedColor) {
        // Backward compatibility with older snapshots
        setColorMode('ai');
      } else if (state.primaryColor) {
        setColorMode('exact');
      } else {
        setColorMode('');
      }
      setGuidedPalette(state.guidedPalette || '');
      setGuidedVibe(state.guidedVibe || '');
      setGuidedTemp(state.guidedTemp || '');
      setGuidedContrast(state.guidedContrast || '');
      setGuidedAvoid(Array.isArray(state.guidedAvoid) ? state.guidedAvoid.filter(Boolean) : []);
      setColorUsageRules(state.colorUsageRules || state.colorNotes || ''); // legacy fallback
      setBackground(state.background || '');
      setTaglineChoice(state.taglineChoice === 'with' || state.taglineChoice === 'none' ? state.taglineChoice : '');
      setTaglineText(state.taglineText || '');
      setDescription(state.description || '');
      setVisibleSteps(normalizeStepArray(state.visibleSteps, STEP_SEQUENCE));
      setLockedSteps(new Set(normalizeStepArray(state.lockedSteps, DEFAULT_RESUME_LOCKED_STEPS)));
      setRefineHistory(Array.isArray(state.refineHistory) ? state.refineHistory.filter(Boolean).slice(-3) : []);
      setSpecCore(state.specCore || null);
      setLatestDelta(state.latestDelta || null);
    } else {
      // Fallback for legacy saves without editor state
      setVisibleSteps(STEP_SEQUENCE);
      setLockedSteps(new Set(DEFAULT_RESUME_LOCKED_STEPS));
    }

    setLogoRounds([[logoUrl]]);
    setSelectedIdxs(new Set());
    setStickySelectedRefUrls([]);
    setRefineFeedback('');
    setGenError('');
    setRefineError('');
    setGenerating(false);
    setIsRefining(false);
    setShowCollection(false);

    setTimeout(() => scrollToEl(refineRef.current, 96), 120);
    showToast(
      loadedSnapshot
        ? 'Loaded from collection. Continue from refinement.'
        : 'Loaded logo as reference. Fill details then refine.',
      loadedSnapshot ? 'success' : 'info'
    );
  };

  const advanceTo = (from: Step, next: Step) => {
    setLockedSteps(prev => new Set([...prev, from]));
    setVisibleSteps(prev => prev.includes(next) ? prev : [...prev, next]);
  };

  // Name confirm: reveal next relevant step in place (no auto-scroll)
  const handleNameSubmit = () => {
    if (!businessName.trim()) return;
    advanceTo('name', isUploadedEditMode ? 'color' : 'industry');
  };
  const handleIndustrySelect  = (v: string) => { setIndustry(v);  if (!isLocked('industry'))  setTimeout(() => advanceTo('industry',  'style'),       150); };
  const handleStyleSelect     = (v: string) => { setStyle(v);     if (!isLocked('style'))      setTimeout(() => advanceTo('style',     'logoType'),    150); };
  const handleLogoTypeSelect  = (v: string) => { setLogoType(v);  if (!isLocked('logoType'))   setTimeout(() => advanceTo('logoType',  'dimension'),   150); };
  const handleDimensionSelect = (v: string) => { setDimension(v); if (!isLocked('dimension'))  setTimeout(() => advanceTo('dimension', 'color'),       150); };
  const handleBackgroundSelect= (v: string) => { setBackground(v);if (!isLocked('background')) setTimeout(() => advanceTo('background','tagline'), 150); };

  const handlePrimarySelect  = (label: string, hex: string) => {
    setColorMode('exact');
    setPrimaryColor(label);
    setPrimaryHex(hex);
  };

  const handleColorModeSelect = (mode: Exclude<ColorMode, ''>) => {
    const nextMode: ColorMode = colorMode === mode ? '' : mode;
    setColorMode(nextMode);

    if (nextMode !== 'exact') {
      setPrimaryColor('');
      setPrimaryHex('');
      setShowSecondary(false);
      setSecondaryColor('');
      setSecondaryHex('');
      setShowTertiary(false);
      setTertiaryColor('');
      setTertiaryHex('');
    }

    if (nextMode === 'exact') {
      // Avoid carrying hidden guided/AI instructions
      setGuidedPalette('');
      setGuidedVibe('');
      setGuidedTemp('');
      setGuidedContrast('');
      setGuidedAvoid([]);
      setColorUsageRules('');
    }
  };

  const buildGuidedColorNotes = () => {
    const parts: string[] = [];
    const palette = GUIDED_PALETTES.find(p => p.name === guidedPalette);

    if (palette) {
      parts.push(`Palette direction: ${palette.name}`);
      parts.push(`Color translation: ${palette.backendPrompt}`);
    } else if (guidedPalette) {
      parts.push(`Palette direction: ${guidedPalette}`);
    }

    return parts.join('. ');
  };

  const getColorInputsForPrompt = () => {
    if (colorMode === 'exact') {
      return {
        colors: [primaryColor, secondaryColor, tertiaryColor].filter(Boolean).join(' and '),
        colorUsageRules: colorUsageRules.trim() || undefined,
      };
    }

    if (colorMode === 'guided') {
      const palette = GUIDED_PALETTES.find(p => p.name === guidedPalette);
      const mergedNotes = [buildGuidedColorNotes(), colorUsageRules.trim()].filter(Boolean).join('. ');
      return {
        colors: palette ? `${palette.name}: ${palette.swatches.join(', ')}` : guidedPalette || '',
        colorUsageRules: mergedNotes || undefined,
      };
    }

    if (colorMode === 'ai') {
      return {
        colors: '',
        colorUsageRules: colorUsageRules.trim() || undefined,
      };
    }

    return {
      colors: '',
      colorUsageRules: undefined,
    };
  };

  const handleTaglineChoice = (choice: 'none'|'with') => {
    setTaglineChoice(choice);
    if (choice === 'none' && !isLocked('tagline')) setTimeout(() => advanceTo('tagline', 'description'), 150);
  };
  const handleTaglineConfirm = () => { if (!isLocked('tagline')) advanceTo('tagline', 'description'); };

  const handlePrimaryConfirm = () => {
    if (isLocked('color')) return;

    if (!colorMode) {
      showToast('Choose a color mode first.', 'warning');
      return;
    }

    if (colorMode === 'exact' && !primaryColor) {
      showToast('Pick a primary color first.', 'warning');
      return;
    }

    if (colorMode === 'guided' && !guidedPalette) {
      showToast('Choose a palette first.', 'warning');
      return;
    }

    advanceTo('color', isUploadedEditMode ? 'description' : 'background');
  };

  const setRoundLogoAt = (roundIndex: number, logoIndex: number, logoUrl: string) => {
    setLogoRounds(prev => {
      const next = prev.map(round => [...round]);
      while (next.length <= roundIndex) next.push([]);
      const targetRound = [...(next[roundIndex] || [])];
      while (targetRound.length <= logoIndex) targetRound.push(LOADING_LOGO_SLOT);
      targetRound[logoIndex] = logoUrl;
      next[roundIndex] = targetRound;
      return next;
    });
  };

  const normalizedBusinessName = () => businessName.trim().toUpperCase();

  const deriveBusinessNameFromDescription = () => {
    const quoted = Array.from(description.matchAll(/"([^"]{2,40})"/g))
      .map(match => String(match[1] || '').trim())
      .filter(Boolean);

    if (quoted.length > 0) {
      return quoted.join(' ').trim().toUpperCase();
    }

    const condensed = description
      .replace(/[^a-zA-Z0-9\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!condensed) return '';

    return condensed
      .split(' ')
      .slice(0, 4)
      .join(' ')
      .toUpperCase();
  };

  const inferUploadedLogoType = (contextText = ''): LogoFormData['logoType'] => {
    const text = `${description} ${contextText}`.toLowerCase();

    const explicitNoText = /(no\s+text|without\s+text|icon\s+only|symbol\s+only|mark\s+only|pictorial|no\s+word(?:s|ing)?|text\s+unchanged)/i.test(text);
    if (explicitNoText) return 'pictorial';

    const explicitTextIntent = /(font|typograph|lettering|wordmark|brand\s*name|text\s+above|text\s+below|name\s+above|name\s+below|add\s+text|change\s+text|edit\s+text|tagline)/i.test(text);
    if (explicitTextIntent) return 'combination';

    // Conservative default for uploaded edits: do not force text introduction.
    return 'pictorial';
  };

  const handleGenerate = async () => {
    if (creditBalance !== null && creditBalance < INITIAL_GENERATION_COUNT) {
      showUpgradePaywall('generate_insufficient_credits');
      return;
    }

    trackGaEvent('first_generation_started', {
      business_name: businessName,
      industry,
      style,
      requested_variations: INITIAL_GENERATION_COUNT,
      user_tier: isPremiumUser() ? 'premium' : isSignedIn ? 'signed_free' : 'anonymous',
    });
    // Backward-compatible event name kept for existing dashboards
    trackGaEvent('logo_generation_started', {
      business_name: businessName,
      industry,
      style,
      requested_variations: INITIAL_GENERATION_COUNT,
      user_tier: isPremiumUser() ? 'premium' : isSignedIn ? 'signed_free' : 'anonymous',
    });
    setGenerating(true);
    setGenError('');
    setLogoRounds([]);
    setHasSeenTutorial(false);
    setTutorialDismissedThisFlow(false);
    setTutorialStepIndex(-1);
    setTutorialHighlight(null);
    advanceTo('description', 'done');

    // Map HeroProgressive state → shared LogoFormData
    const logoTypeMap: Record<string, LogoFormData['logoType']> = {
      'Wordmark': 'wordmark',
      'Lettermark': 'lettermark',
      'Combination': 'combination',
      'Pictorial': 'pictorial',
      'Abstract': 'abstract'
    };
    const colorInputs = getColorInputsForPrompt();
    const uploadEditMode = uploadedImages.length > 0;
    const derivedBusinessName = normalizedBusinessName() || deriveBusinessNameFromDescription() || 'UPLOADED LOGO';
    const uploadedModeLogoType = inferUploadedLogoType();

    const formData: LogoFormData = {
      businessName: uploadEditMode ? derivedBusinessName : normalizedBusinessName(),
      industry: uploadEditMode ? 'Other' : industry,
      description,
      logoType: uploadEditMode ? uploadedModeLogoType : (logoTypeMap[logoType] || 'pictorial'),
      style: uploadEditMode ? '' : [style, dimension].filter(Boolean).join(', '),
      colors: colorInputs.colors,
      colorUsageRules: colorInputs.colorUsageRules,
      hasBackground: uploadEditMode ? true : (background !== 'transparent' && background !== 'none' && background !== ''),
      backgroundValue: uploadEditMode ? 'white' : background,
      tagline: uploadEditMode ? undefined : (taglineChoice === 'with' ? taglineText : undefined),
    };

    try {
      const token = await safeGetToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const uploadedAnchorRefsForDirector = uploadedImages.length > 0
        ? (await Promise.all(uploadedImages.map(fileToBase64)))
        : [];

      // ── DIRECTOR AGENT FOR FIRST GEN ─────────────────────────────────────────
      console.log('🎨 First gen: Calling Director Agent...');
      const briefRes = await fetch('/api/interpret-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          formData,
          feedback: '',
          refineHistory: [],
          specCore: specCore || undefined,
          delta: latestDelta || undefined,
          variationCount: INITIAL_GENERATION_COUNT,
          referenceImages: uploadedAnchorRefsForDirector.length > 0 ? uploadedAnchorRefsForDirector : undefined,
        }),
      });
      if (!briefRes.ok) {
        const err = await briefRes.json().catch(() => ({ error: 'Brief failed' }));
        throw new Error(err.error || 'Failed to interpret design brief');
      }
      const briefPayload: { brief: DesignBrief; specCore?: any; delta?: any; variantPlans?: any[]; detectedLogoType?: string | null } = await briefRes.json();
      const brief = briefPayload.brief;
      console.log('✅ Director Agent brief (first gen):', brief);
      if (briefPayload.detectedLogoType) {
        console.log(`🧠 Director detected uploaded logo type: ${briefPayload.detectedLogoType}`);
      }
      if (briefPayload.specCore) setSpecCore(briefPayload.specCore);
      if (briefPayload.delta) setLatestDelta(briefPayload.delta);

      const variantPlans = Array.isArray(briefPayload?.variantPlans)
        ? briefPayload.variantPlans
        : (Array.isArray((brief as any)?.variant_plans) ? (brief as any).variant_plans : []);

      // Reuse uploaded refs already prepared for Director.
      const inspirationRefs = uploadedAnchorRefsForDirector;

      // Render placeholders immediately, then fill each slot as soon as each request finishes.
      setLogoRounds([Array.from({ length: INITIAL_GENERATION_COUNT }, () => LOADING_LOGO_SLOT)]);
      setSelectedIdxs(new Set());
      setStickySelectedRefUrls([]);
      // First generation: align summary card to top under header.
      setTimeout(() => scrollToEl(doneRef.current, 96), 80);

      const hasUploadedAnchors = inspirationRefs.length > 0;
      const briefForGeneration = hasUploadedAnchors
        ? { ...brief, reference_role: 'preserve' }
        : brief;

      const uploadVariantDirectives = [
        'Variant profile A (closest): keep the same core letter skeleton and composition, apply only subtle polish.',
        'Variant profile B: keep the same core letter skeleton and composition, but tighten spacing and increase typographic contrast.',
        'Variant profile C: keep the same core letter skeleton and composition, but explore a distinct finishing treatment (weight/edges/terminals) while staying the same brand identity.',
      ];

      if (hasUploadedAnchors) {
        console.log('🧷 Uploaded-logo mode: forcing reference_role=preserve for initial generation')
      }

      const generated = await Promise.all(
        Array.from({ length: INITIAL_GENERATION_COUNT }, async (_, index) => {
          try {
            const requestId = createGenerationRequestId('initial');
            const variantPlanForSlot = hasUploadedAnchors
              ? undefined
              : (variantPlans[index] ? [variantPlans[index]] : undefined);

            const slotBrief = (() => {
              if (!hasUploadedAnchors) return briefForGeneration;

              const baseMustChange = Array.isArray((briefForGeneration as any)?.must_change)
                ? (briefForGeneration as any).must_change.filter(Boolean)
                : [];

              const slotDirective = uploadVariantDirectives[index % uploadVariantDirectives.length];
              return {
                ...briefForGeneration,
                must_change: [...baseMustChange, slotDirective],
              };
            })();

            const res = await fetch('/api/generate-multiple', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({
                formData,
                brief: slotBrief,
                specCore: briefPayload.specCore || specCore || undefined,
                delta: briefPayload.delta || latestDelta || undefined,
                variationCount: 1,
                variantPlans: variantPlanForSlot,
                referenceImages: inspirationRefs.length > 0 ? inspirationRefs : undefined,
                generationStage: 'initial',
                requestId,
              }),
            });

            const text = await res.text();
            let data: any = {};
            try {
              data = JSON.parse(text);
            } catch {
              throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
            }
            if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

            const logoUrl = data?.logos?.[0] || '';
            if (!logoUrl) {
              throw new Error(`No logo returned for slot ${index + 1}`);
            }

            setRoundLogoAt(0, index, logoUrl);
            void deductCredits(1);
            return logoUrl;
          } catch (slotError: any) {
            console.error(`❌ Initial logo slot ${index + 1} failed:`, slotError?.message || slotError);
            return null;
          }
        })
      );

      const readyLogos = generated.filter(Boolean) as string[];
      if (readyLogos.length === 0) {
        throw new Error('All logo generations failed. Please retry.');
      }
      if (readyLogos.length < INITIAL_GENERATION_COUNT) {
        showToast(`${INITIAL_GENERATION_COUNT - readyLogos.length} variation(s) failed.`, 'warning');
      }

      // Hard fallback: ensure tutorial appears after first generation if eligible.
      if (!hasSeenTutorial && !tutorialDismissedThisFlow) {
        setTimeout(() => {
          setTutorialStepIndex(0);
        }, 120);
      }

      trackGaEvent('logos_generated', {
        business_name: businessName,
        count: readyLogos.length,
        user_tier: isPremiumUser() ? 'premium' : isSignedIn ? 'signed_free' : 'anonymous',
      });
    } catch (err: any) {
      setGenError(err.message || 'Something went wrong');
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Convert a logo URL → base64 reference image for multimodal refinement
  const urlToRef = async (
    url: string,
    source: ReferenceImagePayload['source'] = 'selected'
  ): Promise<ReferenceImagePayload | null> => {
    try {
      const blob = await fetch(url).then(r => r.blob());
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const max = 1024;
            let { width: w, height: h } = img;
            if (w > max || h > max) { const r = Math.min(max/w, max/h); w *= r; h *= r; }
            canvas.width = w; canvas.height = h;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, w, h);
            resolve({ data: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png', source });
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const triggerPngDownload = async (url: string) => {
    const a = document.createElement('a');
    a.style.display = 'none';
    if (url.startsWith('data:')) {
      a.href = url;
    } else {
      const blob = await fetch(url).then(r => r.blob());
      a.href = URL.createObjectURL(blob);
    }
    a.download = `${businessName.trim().toLowerCase().replace(/\s+/g, '-')}-logo.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
  };

  const ensureLikedForConnectedUser = async (url: string) => {
    if (!isSignedIn) return;

    const existing = (savedLogos as any[]).find((l: any) => (l.url || l.logo_url) === url);
    const alreadyLiked = likedUrls.has(url) || !!existing;

    if (alreadyLiked) {
      if (!likedUrls.has(url)) {
        setLikedUrls(prev => {
          const next = new Set(prev);
          next.add(url);
          return next;
        });
      }
      return;
    }

    setLikedUrls(prev => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });

    const res = await saveLogoToDB({
      url,
      prompt: '',
      is_premium: isPremiumUser(),
      file_format: 'png',
      editor_state: buildEditorStateSnapshot(url),
    });
    if (!res.success) {
      setLikedUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
      showToast('Downloaded, but failed to save to collection', 'warning');
    }
  };

  const downloadLogo = async (url: string) => {
    // Requirement: download should count as a like for connected users.
    if (isSignedIn) {
      await ensureLikedForConnectedUser(url);
    }

    if (isPremiumUser()) {
      // Use existing saved logo id if available — never save just for download
      const existing = (savedLogos as any[]).find((l: any) => (l.url || l.logo_url) === url);
      const logoId = existing?.id || url;
      setDownloadModal({ id: logoId, url, prompt: '' });
      return;
    }

    // Anonymous users: show what they miss before proceeding with plain PNG download.
    if (!isSignedIn) {
      setFreeDownloadUrl(url);
      return;
    }

    // Signed-in free users: direct PNG download.
    await triggerPngDownload(url);
  };

  const toggleLike = async (url: string) => {
    if (!isSignedIn) { setAuthModal('save'); return; }
    // Capture current state BEFORE optimistic update
    const wasLiked = likedUrls.has(url);
    const existing = (savedLogos as any[]).find((l: any) => (l.url || l.logo_url) === url);
    // Optimistic local toggle
    setLikedUrls(prev => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
    if (wasLiked) {
      // Remove from DB if we have the saved record
      if (existing?.id) await removeLogoFromDB(existing.id);
      showToast('Removed from collection', 'info');
    } else {
      // Only save if not already in savedLogos (prevents duplicates)
      if (!existing) {
        const res = await saveLogoToDB({
          url,
          prompt: '',
          is_premium: isPremiumUser(),
          file_format: 'png',
          editor_state: buildEditorStateSnapshot(url),
        });
        if (res.success) showToast('Saved to collection ♡', 'success');
        else { showToast('Failed to save', 'error'); setLikedUrls(prev => { const n = new Set(prev); n.delete(url); return n; }); }
      } else {
        showToast('Already in your collection', 'info');
      }
    }
  };

  type ReferenceImagePayload = {
    data: string;
    mimeType: string;
    source?: 'uploaded' | 'selected' | 'latest_fallback';
  };

  const fileToBase64 = (file: File): Promise<ReferenceImagePayload> =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const max = 1024;
          let { width: w, height: h } = img;
          if (w > max || h > max) { const r = Math.min(max/w, max/h); w *= r; h *= r; }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          resolve({ data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg', source: 'uploaded' });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadedImages.length + files.length > 3) { showToast('Maximum 3 images allowed', 'warning'); return; }
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) { showToast(`${f.name} is not a valid image`, 'error'); return false; }
      if (f.size > 5 * 1024 * 1024) { showToast(`${f.name} is too large (max 5MB)`, 'error'); return false; }
      return true;
    });

    const newFiles = [...uploadedImages, ...valid];
    setUploadedImages(newFiles);
    setImgPreviews(newFiles.map(f => URL.createObjectURL(f)));

    if (newFiles.length > 0 && logoRounds.length === 0) {
      setVisibleSteps(['color', 'description', 'done']);
      setLockedSteps(prev => {
        const next = new Set(prev);
        next.add('name');
        next.add('industry');
        next.add('style');
        next.add('logoType');
        next.add('dimension');
        next.add('background');
        next.add('tagline');
        next.add('inspiration');
        next.delete('color');
        next.delete('description');
        return next;
      });
      setTimeout(() => scrollToEl(colorConfirmRef.current, 96), 120);
    }
  };

  const removeImage = (i: number) => {
    const next = uploadedImages.filter((_, idx) => idx !== i);
    setUploadedImages(next);
    setImgPreviews(next.map(f => URL.createObjectURL(f)));

    if (next.length === 0 && logoRounds.length === 0) {
      setVisibleSteps(businessName.trim() ? ['name', 'industry'] : ['name']);
      setLockedSteps(prev => {
        const unlocked = new Set(prev);
        unlocked.delete('name');
        unlocked.delete('industry');
        unlocked.delete('style');
        unlocked.delete('logoType');
        unlocked.delete('dimension');
        unlocked.delete('background');
        unlocked.delete('tagline');
        unlocked.delete('inspiration');
        unlocked.delete('color');
        unlocked.delete('description');
        return unlocked;
      });
    }
  };

  const showToast = (message: string, type: 'success'|'error'|'info'|'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const hasShownSigninBonusRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasShownSigninBonusRef.current) return;
    if (typeof window === 'undefined') return;

    const hadGuestSession = localStorage.getItem('hpCreditsUsed') !== null;
    if (!hadGuestSession) return;

    hasShownSigninBonusRef.current = true;
    showToast(`Signed in ✦ You unlocked +${SIGNIN_BONUS_CREDITS} free credits (${ANON_CREDITS_LIMIT + SIGNIN_BONUS_CREDITS} total)`, 'success');
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!refineSelectionModal) return;
    if (selectedIdxs.size === 0) return;
    setRefineSelectionModal(null);
  }, [selectedIdxs, refineSelectionModal]);

  const handlePaymentUpgrade = async () => {
    if (!isSignedIn) {
      showUpgradePaywall('upgrade_requires_signin');
      return;
    }
    if (!tosAccepted) { showToast('Please accept the Terms of Service to continue', 'warning'); return; }
    setStripeLoading(true); setStripeError('');
    showToast('Preparing payment…', 'info');
    trackGaEvent('checkout_started', {
      value: 9.99,
      currency: 'EUR',
      plan: 'premium',
      user_tier: isPremiumUser() ? 'premium' : 'signed_free',
    });
    try {
      const token = await safeGetToken();
      const res = await fetch('/api/create-payment-intent-with-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userEmail: '' }),
      });
      if (!res.ok) throw new Error('Failed to create payment intent');
      const { clientSecret, paymentIntentId } = await res.json();
      setStripeSecret(clientSecret);
      setPaymentIntentId(paymentIntentId);
    } catch (e: any) {
      setStripeError(e.message || 'Payment error');
      showToast(e.message || 'Payment failed', 'error');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineFeedback.trim()) return;
    if (!creditBalance || creditBalance < refineCount) {
      showUpgradePaywall('refine_insufficient_credits');
      return;
    }
    setIsRefining(true);
    setRefineError('');
    setRefineSelectionModal(null);

    const logoTypeMap: Record<string, LogoFormData['logoType']> = {
      'Wordmark': 'wordmark',
      'Lettermark': 'lettermark',
      'Combination': 'combination',
      'Pictorial': 'pictorial',
      'Abstract': 'abstract'
    };
    const colorInputs = getColorInputsForPrompt();
    const uploadEditMode = uploadedImages.length > 0;
    const derivedBusinessName = normalizedBusinessName() || deriveBusinessNameFromDescription() || 'UPLOADED LOGO';
    const uploadedModeLogoType = inferUploadedLogoType(refineFeedback);

    const formData: LogoFormData = {
      businessName: uploadEditMode ? derivedBusinessName : normalizedBusinessName(),
      industry: uploadEditMode ? 'Other' : industry,
      description,
      logoType: uploadEditMode ? uploadedModeLogoType : (logoTypeMap[logoType] || 'pictorial'),
      style: uploadEditMode ? '' : [style, dimension].filter(Boolean).join(', '),
      colors: colorInputs.colors,
      colorUsageRules: colorInputs.colorUsageRules,
      hasBackground: uploadEditMode ? true : (background !== 'transparent' && background !== 'none' && background !== ''),
      backgroundValue: uploadEditMode ? 'white' : background,
      tagline: uploadEditMode ? undefined : (taglineChoice === 'with' ? taglineText : undefined),
    };

    try {
      const token = await safeGetToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const latestRoundBeforeRefine = logoRounds[logoRounds.length - 1] ?? [];
      const latestRoundAvailableCount = latestRoundBeforeRefine.filter(Boolean).length;

      const uploadedAnchorRefsForDirector: ReferenceImagePayload[] = uploadedImages.length > 0
        ? (await Promise.all(uploadedImages.map(fileToBase64)))
        : [];

      // ── Phase 1: DIRECTOR AGENT ──────────────────────────────────────────────
      // Get structured design brief before generating
      console.log('🎨 Phase 1: Calling Director Agent...');
      const briefRes = await fetch('/api/interpret-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          formData,
          feedback: refineFeedback,
          refineHistory,
          specCore: specCore || undefined,
          delta: latestDelta || undefined,
          variationCount: refineCount,
          referenceImages: uploadedAnchorRefsForDirector.length > 0 ? uploadedAnchorRefsForDirector : undefined,
          referenceContext: {
            currentRoundIndex: logoRounds.length,
            currentRoundSelectionCount: selectedIdxs.size,
            currentRoundAvailableCount: latestRoundAvailableCount,
            previousSelectedReferenceCount: stickySelectedRefUrls.length,
            hasUploadedAnchors: uploadedAnchorRefsForDirector.length > 0,
          },
        }),
      });
      if (!briefRes.ok) {
        const err = await briefRes.json().catch(() => ({ error: 'Brief failed' }));
        throw new Error(err.error || 'Failed to interpret design brief');
      }
      const briefPayload: { brief: DesignBrief; specCore?: any; delta?: any; variantPlans?: any[]; detectedLogoType?: string | null; referenceTarget?: string | null; referenceRound?: number | null; referenceLogo?: number | null } = await briefRes.json();
      const brief = briefPayload.brief;
      console.log('✅ Director Agent brief received:', brief);
      if (briefPayload.detectedLogoType) {
        console.log(`🧠 Director detected uploaded logo type: ${briefPayload.detectedLogoType}`);
      }
      if (briefPayload.specCore) setSpecCore(briefPayload.specCore);
      if (briefPayload.delta) setLatestDelta(briefPayload.delta);

      const variantPlans = Array.isArray(briefPayload?.variantPlans)
        ? briefPayload.variantPlans
        : (Array.isArray((brief as any)?.variant_plans) ? (brief as any).variant_plans : []);

      // ── PREPARE REFERENCE IMAGES ─────────────────────────────────────────────
      // Uploaded logo anchors should always be present when available.
      // Selected generated logos remain optional and act as round-specific guidance.
      const MAX_REFERENCE_IMAGES = 5
      let selectedRefs: ReferenceImagePayload[] = []
      let refs: ReferenceImagePayload[] = []

      const uploadedAnchorRefs: ReferenceImagePayload[] = uploadedAnchorRefsForDirector

      const referenceRole = String(
        (briefPayload as any)?.referenceRole || (brief as any)?.reference_role || ''
      ).toLowerCase();
      const wantsReference = referenceRole === 'preserve' || referenceRole === 'context';

      const latestRound = logoRounds[logoRounds.length - 1] ?? []
      const availableIndices = latestRound
        .map((candidate, i) => (candidate ? i : -1))
        .filter(i => i >= 0)

      let effectiveSelectedIndices = Array.from(selectedIdxs)
        .filter(i => i >= 0 && i < latestRound.length && Boolean(latestRound[i]))

      const toPositiveInt = (value: unknown): number | null => {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1) return null;
        return Math.floor(n);
      };

      const directorReferenceTarget = String(
        (briefPayload as any)?.referenceTarget
        || (brief as any)?.reference_target
        || (brief as any)?.referenceTarget
        || ''
      ).toLowerCase();

      const directorReferenceRound = toPositiveInt(
        (briefPayload as any)?.referenceRound
        ?? (brief as any)?.reference_round
        ?? (brief as any)?.referenceRound
      );

      const directorReferenceLogo = toPositiveInt(
        (briefPayload as any)?.referenceLogo
        ?? (brief as any)?.reference_logo
        ?? (brief as any)?.referenceLogo
      );

      // LLM-driven reference target selection from Director Agent.
      if (wantsReference && uploadedAnchorRefs.length === 0) {
        if (directorReferenceTarget === 'explicit_round' && directorReferenceRound) {
          const targetRoundIndex = directorReferenceRound - 1;
          const targetRound = logoRounds[targetRoundIndex] ?? [];
          const targetRoundUrls = targetRound.filter(Boolean) as string[];

          if (targetRoundUrls.length > 0) {
            let chosenUrls: string[] = [];
            const requestedLogoIdx = typeof directorReferenceLogo === 'number'
              ? directorReferenceLogo - 1
              : -1;

            if (
              requestedLogoIdx >= 0
              && requestedLogoIdx < targetRound.length
              && Boolean(targetRound[requestedLogoIdx])
            ) {
              chosenUrls = [targetRound[requestedLogoIdx] as string];
            } else {
              const stickyInTargetRound = stickySelectedRefUrls.filter(url => targetRoundUrls.includes(url));
              chosenUrls = stickyInTargetRound.length > 0
                ? stickyInTargetRound.slice(0, MAX_REFERENCE_IMAGES)
                : [targetRoundUrls[0]];
            }

            const explicitRefs = (await Promise.all(
              chosenUrls.map(url => urlToRef(url, 'selected'))
            )).filter(Boolean) as ReferenceImagePayload[];

            if (explicitRefs.length > 0) {
              selectedRefs = explicitRefs.slice(0, MAX_REFERENCE_IMAGES);
              setStickySelectedRefUrls(Array.from(new Set(chosenUrls)).slice(0, MAX_REFERENCE_IMAGES));

              const logoMsg = directorReferenceLogo ? ` logo ${directorReferenceLogo}` : '';
              showToast(`Using${logoMsg} from round ${directorReferenceRound} as reference.`, 'info');
              console.log(`🎯 Director reference_target=explicit_round → round ${directorReferenceRound}${logoMsg}`);
            }
          } else {
            showToast(`Could not find logos in round ${directorReferenceRound}; using normal reference logic.`, 'warning');
            console.log(`⚠️ Director requested explicit round not found (round ${directorReferenceRound})`);
          }
        } else if (directorReferenceTarget === 'previous_selected' && stickySelectedRefUrls.length > 0) {
          const stickyRefs = (await Promise.all(
            stickySelectedRefUrls.map(url => urlToRef(url, 'selected'))
          )).filter(Boolean) as ReferenceImagePayload[];

          if (stickyRefs.length > 0) {
            selectedRefs = stickyRefs.slice(0, MAX_REFERENCE_IMAGES);
            showToast('Using your previously selected reference logo.', 'info');
            console.log(`♻️ Director reference_target=previous_selected → reusing ${selectedRefs.length} sticky ref(s)`);
          }
        }
      }

      // If user uploaded anchors, allow refinement to proceed without forcing a selected generated logo.
      // If no uploaded anchors exist and Director wants preserve/context, we try this order:
      // 1) explicit selection in current round
      // 2) Director LLM reference_target override (explicit_round / previous_selected)
      // 3) sticky refs from previously selected round
      // 4) auto-select only available logo
      // 5) ask user to select one
      if (effectiveSelectedIndices.length === 0 && selectedRefs.length === 0 && wantsReference && uploadedAnchorRefs.length === 0) {
        if (stickySelectedRefUrls.length > 0) {
          const stickyRefs = (await Promise.all(
            stickySelectedRefUrls.map(url => urlToRef(url, 'selected'))
          )).filter(Boolean) as ReferenceImagePayload[]

          if (stickyRefs.length > 0) {
            selectedRefs = stickyRefs.slice(0, MAX_REFERENCE_IMAGES)
            showToast('No logo selected this round — reusing your previous selected reference.', 'info')
            console.log(`♻️ Reusing ${selectedRefs.length} previously selected reference logo(s)`)
          } else {
            setStickySelectedRefUrls([])
          }
        }

        if (selectedRefs.length === 0) {
          if (availableIndices.length === 1) {
            effectiveSelectedIndices = [availableIndices[0]]
            setSelectedIdxs(new Set(effectiveSelectedIndices))
            showToast('Using your only previous logo as reference.', 'info')
            console.log('📌 Auto-selected the only available logo as reference')
          } else if (availableIndices.length > 1) {
            const rawFeedback = refineFeedback.trim();
            const compactFeedback = rawFeedback.length > 90
              ? `${rawFeedback.slice(0, 87).trim()}…`
              : rawFeedback;

            const message = compactFeedback
              ? `You asked to “${compactFeedback}”. Select one or more logos first so I refine the right direction.`
              : 'Select one or more logos first so I refine the right direction.';

            setRefineSelectionModal({ message });
            setRefineError('');
            return
          }
        }
      }

      if (effectiveSelectedIndices.length === 0) {
        if (selectedRefs.length > 0) {
          console.log('♻️ No current logo selected — using previous selected reference(s)')
        } else if (uploadedAnchorRefs.length > 0) {
          console.log('🧷 No generated logo selected — using uploaded anchor reference(s) only')
        } else {
          console.log('🗑️  No references selected — treating as fresh start (reference_role: reject)')
        }
      } else {
        const refUrls = effectiveSelectedIndices
          .map(i => latestRound[i])
          .filter(Boolean) as string[]

        const latestLogos = latestRound.filter(Boolean) as string[]
        console.log(`📎 Using ${effectiveSelectedIndices.length} selected logo(s) as round reference`)

        const refImgs = (await Promise.all(refUrls.map(url => urlToRef(url, 'selected')))).filter(Boolean) as ReferenceImagePayload[]

        // Keep selected references strict: only the logo(s) selected for this round.
        selectedRefs = refImgs.slice(0, MAX_REFERENCE_IMAGES)
        setStickySelectedRefUrls(Array.from(new Set(refUrls)).slice(0, MAX_REFERENCE_IMAGES))

        if (selectedRefs.length === 0) {
          selectedRefs = (await Promise.all(
            latestLogos.slice(0, 1).map(url => urlToRef(url, 'latest_fallback'))
          )).filter(Boolean) as ReferenceImagePayload[]
        }
      }

      refs = [...selectedRefs, ...uploadedAnchorRefs].slice(0, MAX_REFERENCE_IMAGES)

      if (refs.length > 0) {
        const selectedCount = refs.filter(img => img.source === 'selected' || img.source === 'latest_fallback').length
        const uploadedCount = refs.filter(img => img.source === 'uploaded').length
        console.log(`🖼️ Final refine references → selected:${selectedCount}, uploaded:${uploadedCount}, total:${refs.length}`)
      } else {
        console.log('🚫 Refine round running without reference images')
      }

      const nextRoundIndex = logoRounds.length;
      setLogoRounds(prev => [...prev, Array.from({ length: refineCount }, () => LOADING_LOGO_SLOT)]);
      setSelectedIdxs(new Set());
      // Refinement rounds: center the currently generating row.
      setTimeout(() => scrollToElCentered(latestRoundRef.current, 96), 80);

      const refined = await Promise.all(
        Array.from({ length: refineCount }, async (_, index) => {
          try {
            const requestId = createGenerationRequestId('refine');
            const variantPlanForSlot = variantPlans[index] ? [variantPlans[index]] : undefined;

            const res = await fetch('/api/generate-multiple', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({
                formData,
                brief,
                specCore: briefPayload.specCore || specCore || undefined,
                delta: briefPayload.delta || latestDelta || undefined,
                variationCount: 1,
                variantPlans: variantPlanForSlot,
                referenceImages: refs.length > 0 ? refs : undefined,
                generationStage: 'refine',
                requestId,
              }),
            });

            const text = await res.text();
            let data: any = {};
            try {
              data = JSON.parse(text);
            } catch {
              throw new Error(`Server error (${res.status})`);
            }
            if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

            const logoUrl = data?.logos?.[0] || '';
            if (!logoUrl) throw new Error(`No logo returned for refine slot ${index + 1}`);

            setRoundLogoAt(nextRoundIndex, index, logoUrl);
            void deductCredits(1);
            return logoUrl;
          } catch (slotError: any) {
            console.error(`❌ Refine logo slot ${index + 1} failed:`, slotError?.message || slotError);
            return null;
          }
        })
      );

      const readyRefined = refined.filter(Boolean) as string[];
      if (readyRefined.length === 0) {
        throw new Error('All refinement variations failed. Please retry.');
      }
      if (readyRefined.length < refineCount) {
        showToast(`${refineCount - readyRefined.length} refinement variation(s) failed.`, 'warning');
      }

      trackGaEvent('logo_refined', {
        count: refineCount,
        feedback_length: refineFeedback.length,
        user_tier: isPremiumUser() ? 'premium' : isSignedIn ? 'signed_free' : 'anonymous',
      });

      setRefineHistory(prev => {
        const next = [...prev, refineFeedback.trim()].filter(Boolean);
        return next.slice(-12);
      });
      setRefineFeedback('');
    } catch (err: any) {
      setRefineError(err.message || 'Something went wrong');
    } finally {
      setIsRefining(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(FORM_STATE_KEY);
    setVisibleSteps(['name']); setLockedSteps(new Set());
    setBusinessName(''); setIndustry(''); setStyle(''); setLogoType(''); setDimension('');
    setPrimaryColor(''); setPrimaryHex(''); setShowSecondary(false); setSecondaryColor(''); setSecondaryHex(''); setShowTertiary(false); setTertiaryColor(''); setTertiaryHex('');
    setColorMode(''); setGuidedPalette(''); setGuidedVibe(''); setGuidedTemp(''); setGuidedContrast(''); setGuidedAvoid([]); setColorUsageRules('');
    setBackground(''); setTaglineChoice(''); setTaglineText(''); setDescription(''); setGenerating(false); setLogoRounds([]); setGenError(''); setRefineFeedback(''); setRefineHistory([]); setSpecCore(null); setLatestDelta(null); setRefineError(''); setRefineSelectionModal(null); setIsRefining(false); setSelectedIdxs(new Set()); setStickySelectedRefUrls([]); setLikedUrls(new Set()); setUploadedImages([]); setImgPreviews([]); setTutorialStepIndex(-1); setTutorialHighlight(null); setIsTutorialStarting(false); setTutorialDismissedThisFlow(false); setHasSeenTutorial(false);
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const recLogoType  = industry && style     ? getRecommendedLogoType(industry, style) : null;
  const recDimension = style                  ? getRecommendedDimension(style)          : null;
  const recBg        = dimension && style     ? getRecommendedBg(dimension, style)      : null;
  const styleHint    = industry && style      ? getStyleHint(industry, style)           : null;
  const exactColorCount = [primaryColor, secondaryColor, tertiaryColor].filter(Boolean).length;

  const lastStep = visibleSteps[visibleSteps.length - 1];

  const activeTutorialStep = tutorialStepIndex >= 0 ? tutorialSteps[tutorialStepIndex] : null;
  const shouldRenderTutorial = tutorialStepIndex >= 0 && Boolean(activeTutorialStep);
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720;
  const tutorialCardWidth = Math.min(420, viewportW - 32);
  const tutorialCardLeft = tutorialHighlight
    ? Math.max(16, Math.min(tutorialHighlight.left, viewportW - tutorialCardWidth - 16))
    : 16;
  const tutorialCardTop = tutorialHighlight
    ? (
      tutorialHighlight.top + tutorialHighlight.height + 14 > viewportH - 230
        ? Math.max(16, tutorialHighlight.top - 220)
        : tutorialHighlight.top + tutorialHighlight.height + 14
    )
    : 16;

  return (
    <div className="relative min-h-screen bg-[#050508] text-gray-200 overflow-x-hidden font-sans">

      {/* LAVA BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050508]"
        style={{ filter:'blur(40px) contrast(10)' }}>
        <div className="blob-1 absolute top-[5%]  left-[5%]  h-[280px] w-[280px] bg-cyan-400/70" />
        <div className="blob-2 absolute top-[8%]  left-[70%] h-[320px] w-[320px] bg-violet-500/70" />
        <div className="blob-3 absolute top-[70%] left-[8%]  h-[360px] w-[360px] bg-fuchsia-500/70" />
        <div className="blob-4 absolute top-[65%] left-[65%] h-[320px] w-[320px] bg-indigo-400/70" />
        <div className="blob-5 absolute top-[15%] left-[40%] h-[255px] w-[255px] bg-cyan-400/70" />
        <div className="blob-6 absolute top-[30%] left-[75%] h-[310px] w-[310px] bg-violet-200/70" />
        <div className="blob-7 absolute top-[55%] left-[20%] h-[275px] w-[275px] bg-fuchsia-500/70" />
      </div>
      {/* Subtle blur window over the background */}
      <div className="pointer-events-none fixed inset-0 z-[1]" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

      {/* HEADER */}
      <div ref={headerRef} className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-10 py-6 pointer-events-none"
        style={{ ...glassBase, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="h-11 flex items-center font-black text-3xl leading-none tracking-tight pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
          style={{ fontFamily:"'Impact','Arial Black','Helvetica Neue',sans-serif", textShadow:'0 0 30px rgba(139,92,246,0.6)' }}>
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-600 bg-clip-text text-transparent">CRAFTYOURLOGO</span>
        </button>
        <div className="flex items-center gap-4 pointer-events-auto">
          {/* Collection icon */}
          <button onClick={() => setShowCollection(true)}
            className="icon-btn"
            title="Collection">
            <svg width="21" height="21" viewBox="0 0 24 24" fill={savedLogos.length > 0 ? '#f472b6' : 'none'} stroke={savedLogos.length > 0 ? '#f472b6' : '#9ca3af'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {savedLogos.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background:'rgba(244,114,182,0.9)', color:'#0a0a12' }}>{savedLogos.length}</span>
            )}
          </button>
          {/* Account icon */}
          {isSignedIn ? (
            <div className="relative w-11 h-11 flex items-center justify-center">
              <UserButton afterSignOutUrl="/"
                appearance={{ elements: {
                  avatarBox: { width: '44px', height: '44px', borderRadius: '12px' },
                  userButtonTrigger: { padding: 0 },
                } }} />
              {isPremiumUser() && (
                <span className="absolute -top-1.5 -right-1.5 text-xs leading-none pointer-events-none" title="Premium"
                  style={{ color:'#fbbf24', textShadow:'0 0 8px rgba(251,191,36,0.8)' }}>✦</span>
              )}
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="icon-btn" title="Sign in">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {/* FLOW */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-24">
        <div className="w-full max-w-2xl flex flex-col gap-6">



          {/* Stable top spacer keeps input position fixed across confirm */}
          <div style={{ height: `${isUploadedEditMode ? 24 : nameTopOffset}px` }} />

          {/* NAME */}
          {visibleSteps.includes('name') && !isUploadedEditMode && (
            <div
              ref={nameBlockRef}
              className="flex flex-col"
              style={{
                animation: 'pSlideIn 0.5s ease-out both',
              }}
            >
              <div className="flex flex-col gap-3">
                <label className="text-xs tracking-[0.25em] uppercase text-cyan-400/80 font-bold pl-1">Business Name</label>
                <div className="relative">
                  <input ref={nameRef} type="text" value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNameSubmit(); } }}
                    placeholder="e.g. Neon Collective"
                    className="w-full rounded-2xl px-6 py-5 text-white placeholder-gray-600 focus:outline-none transition-all disabled:cursor-not-allowed"
                    style={{ ...glassBase, fontSize:'1.75rem',
                      border: '1px solid rgba(255,255,255,0.08)',
                      paddingRight: businessName.trim() ? '6rem' : '1.5rem',
                      transition: 'padding 0.2s ease' }} />
                  {!isLocked('name') && businessName.trim() && (
                    <button
                      onClick={handleNameSubmit}
                      className="absolute right-2 top-2 bottom-2 px-5 rounded-xl text-xl font-black tracking-widest uppercase transition-all duration-200 flex items-center"
                      style={{ background:'linear-gradient(135deg,rgba(34,211,238,0.2),rgba(99,102,241,0.25))',
                        border:'1px solid rgba(34,211,238,0.45)', color:'#22d3ee',
                        textShadow:'0 0 16px rgba(34,211,238,0.6)',
                        boxShadow:'0 0 20px rgba(34,211,238,0.15)' }}
                    >
                      Start →
                    </button>
                  )}
                  {isLocked('name') && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-cyan-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* OPTIONAL LOGO UPLOAD (EARLY) */}
          {(visibleSteps.includes('industry') || isUploadedEditMode) && (
            <div className="rounded-2xl px-4 py-3 flex flex-col gap-3" style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)', animation:'pSlideIn 0.5s ease-out both' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-200">Already have a logo?</p>
                  <p className="text-xs text-gray-500">Upload it to redesign (optional).</p>
                  {isUploadedEditMode && (
                    <p className="text-[11px] text-cyan-300/80 mt-1">Uploaded-logo mode: only color + edit instructions are required.</p>
                  )}
                </div>
                {uploadedImages.length < 3 && (
                  <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    style={{ ...glassBase, border:'1px solid rgba(99,102,241,0.35)', color:'#a5b4fc' }}>
                    Upload logo
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>

              {imgPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imgPreviews.map((src, i) => (
                    <div key={`early-upload-${i}`} className="relative w-14 h-14 rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.1)' }}>
                      <img src={src} alt="uploaded reference" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                        style={{ background:'rgba(0,0,0,0.7)', color:'#f87171' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INDUSTRY */}
          {visibleSteps.includes('industry') && !isUploadedEditMode && (
            <div ref={lastStep === 'industry' ? latestStepRef : industryRef} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-indigo-400/80 font-bold pl-1">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <button key={ind.label} onClick={() => handleIndustrySelect(ind.label)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ ...pillBase(industry===ind.label,'rgba(129,140,248,0.7)','linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.35))'),
                      color: industry===ind.label ? '#a5b4fc' : '#9ca3af' }}>
                    <span>{ind.icon}</span>{ind.label}{ind.hot && <HotBadge />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STYLE */}
          {visibleSteps.includes('style') && !isUploadedEditMode && (
            <div ref={lastStep === 'style' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-fuchsia-400/80 font-bold pl-1">Visual Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s.label} onClick={() => handleStyleSelect(s.label)}
                    className="flex items-center px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                    style={{ ...pillBase(style===s.label,'rgba(232,121,249,0.6)','linear-gradient(135deg,rgba(232,121,249,0.35),rgba(99,102,241,0.3))'),
                      color: style===s.label ? '#f0abfc' : '#9ca3af' }}>
                    {s.label}{s.hot && <HotBadge />}
                  </button>
                ))}
              </div>
              {styleHint && <Hint text={styleHint} />}
            </div>
          )}

          {/* LOGO TYPE */}
          {visibleSteps.includes('logoType') && !isUploadedEditMode && (
            <div ref={lastStep === 'logoType' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-cyan-400/80 font-bold pl-1">Logo Type</label>
              <div className="flex flex-wrap gap-2">
                {LOGO_TYPES.map(lt => (
                  <div key={lt.label} className="relative">
                    <button
                      data-logo-type-tooltip-trigger="true"
                      onClick={() => {
                        handleLogoTypeSelect(lt.label);
                        toggleTooltip(lt.label);
                      }}
                      className="flex flex-col items-center px-5 py-3 rounded-xl transition-all duration-200 min-w-[90px]"
                      style={pillBase(logoType===lt.label,'rgba(34,211,238,0.6)','linear-gradient(135deg,rgba(34,211,238,0.2),rgba(99,102,241,0.2))')}>
                      <span className="text-lg font-black mb-0.5" style={{ color: logoType===lt.label ? '#22d3ee' : '#6b7280' }}>{lt.icon}</span>
                      <span className="text-xs font-bold" style={{ color: logoType===lt.label ? '#67e8f9' : '#9ca3af' }}>
                        {lt.label}{recLogoType===lt.label && <RecBadge />}
                      </span>
                      <span className="text-[10px] mt-0.5" style={{ color:'#4b5563' }}>{lt.desc}</span>
                    </button>

                    {/* Click-triggered tooltip - positioned ABOVE the button */}
                    {activeTooltip === lt.label && (
                      <div
                        data-logo-type-tooltip="true"
                        className="fixed sm:absolute z-[100] rounded-xl p-3 text-left left-1/2 -translate-x-1/2 bottom-4 sm:bottom-[calc(100%+12px)] w-[calc(100vw-1.5rem)] max-w-[22rem] sm:w-64"
                        style={{
                          background: 'rgba(5, 5, 8, 0.98)',
                          border: '1px solid rgba(34,211,238,0.35)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(34,211,238,0.08)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-cyan-400 mb-1">{lt.label}</p>
                            <p className="text-xs text-gray-300 leading-relaxed">{LOGO_TYPE_DETAILS[lt.label]}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveTooltip(null); }}
                            className="text-gray-500 hover:text-gray-300 text-xs flex-shrink-0"
                          >✕</button>
                        </div>
                        <div
                          className="hidden sm:block absolute w-3 h-3 rotate-45"
                          style={{
                            bottom: '-5px',
                            left: '50%',
                            marginLeft: '-6px',
                            background: 'rgba(5, 5, 8, 0.98)',
                            borderRight: '1px solid rgba(34,211,238,0.35)',
                            borderBottom: '1px solid rgba(34,211,238,0.35)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DIMENSION */}
          {visibleSteps.includes('dimension') && !isUploadedEditMode && (
            <div ref={lastStep === 'dimension' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-indigo-400/80 font-bold pl-1">Dimension</label>
              <div className="flex gap-3">
                {DIMENSIONS.map(d => (
                  <button key={d.label} onClick={() => handleDimensionSelect(d.label)}
                    className="flex-1 flex flex-col items-center py-4 rounded-xl transition-all duration-200"
                    style={pillBase(dimension===d.label,'rgba(129,140,248,0.7)','linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.3))')}>
                    <span className="text-2xl mb-1" style={{ color: dimension===d.label ? '#a5b4fc' : '#6b7280' }}>{d.icon}</span>
                    <span className="text-sm font-black" style={{ color: dimension===d.label ? '#a5b4fc' : '#9ca3af' }}>
                      {d.label}{recDimension===d.label && <RecBadge />}
                    </span>
                    <span className="text-xs mt-0.5" style={{ color:'#4b5563' }}>{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* COLOR */}
          {visibleSteps.includes('color') && (
            <div ref={lastStep === 'color' ? latestStepRef : undefined} className="flex flex-col gap-4" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-cyan-400/80 font-bold pl-1">Brand Color</label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {([
                  { value: 'guided', title: 'Choose a palette', desc: 'Preset color families' },
                  { value: 'ai', title: 'Direct the AI Designer', desc: 'Give color direction in words' },
                  { value: 'exact', title: 'Pick exact colors', desc: 'Manual swatches' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleColorModeSelect(opt.value)}
                    className="text-left rounded-xl px-4 py-3 transition-all"
                    style={pillBase(colorMode===opt.value,'rgba(34,211,238,0.6)','linear-gradient(135deg,rgba(34,211,238,0.2),rgba(99,102,241,0.18))')}
                  >
                    <div className="text-sm font-bold" style={{ color: colorMode===opt.value ? '#67e8f9' : '#d1d5db' }}>{opt.title}</div>
                    <div className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              {colorMode === 'exact' && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-3 pl-1">Primary</p>
                    <div className="flex flex-wrap gap-3 items-center">
                      {COLOR_SWATCHES.map(c => (
                        <button key={c.label} onClick={() => handlePrimarySelect(c.label, c.hex)} title={c.label}
                          className="w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0"
                          style={{ background:c.hex, boxShadow:primaryColor===c.label?`0 0 22px ${c.glow}`:'none',
                            transform:primaryColor===c.label?'scale(1.3)':'scale(1)',
                            outline:primaryColor===c.label?`2px solid ${c.hex}`:'2px solid transparent', outlineOffset:'3px' }} />
                      ))}
                      <button onClick={() => customColorRef.current?.click()} title="Custom"
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200"
                        style={{ background:primaryColor==='Custom'?primaryHex:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                          outline:primaryColor==='Custom'?`2px solid ${primaryHex}`:'2px solid transparent', outlineOffset:'3px',
                          transform:primaryColor==='Custom'?'scale(1.3)':'scale(1)' }}>
                        {primaryColor!=='Custom' && <span className="text-white text-xs font-black" style={{ textShadow:'0 0 4px rgba(0,0,0,0.8)' }}>+</span>}
                        <input ref={customColorRef} type="color" className="sr-only" defaultValue="#818cf8"
                          onChange={e => { setColorMode('exact'); setPrimaryColor('Custom'); setPrimaryHex(e.target.value); }} />
                      </button>
                      {primaryColor && (
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ background:primaryHex }} />
                          {primaryColor==='Custom' ? primaryHex : primaryColor}
                        </span>
                      )}
                    </div>
                  </div>

                  {primaryColor && (
                    <div>
                      {!showSecondary ? (
                        <button onClick={() => setShowSecondary(true)}
                          className="text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
                          style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)', color:'#6b7280' }}>
                          + Add Secondary Color
                        </button>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-500 pl-1">Secondary</p>
                            <button onClick={() => { setShowSecondary(false); setSecondaryColor(''); setSecondaryHex(''); setShowTertiary(false); setTertiaryColor(''); setTertiaryHex(''); }}
                              className="text-xs text-gray-600 hover:text-gray-400 transition-colors">✕ remove</button>
                          </div>
                          <div className="flex flex-wrap gap-3 items-center">
                            {COLOR_SWATCHES.map(c => (
                              <button key={c.label} onClick={() => { setSecondaryColor(c.label); setSecondaryHex(c.hex); }} title={c.label}
                                className="w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0"
                                style={{ background:c.hex, boxShadow:secondaryColor===c.label?`0 0 22px ${c.glow}`:'none',
                                  transform:secondaryColor===c.label?'scale(1.3)':'scale(1)',
                                  outline:secondaryColor===c.label?`2px solid ${c.hex}`:'2px solid transparent', outlineOffset:'3px' }} />
                            ))}
                            <button onClick={() => customSecRef.current?.click()} title="Custom"
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background:secondaryColor==='Custom'?secondaryHex:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                                outline:secondaryColor==='Custom'?`2px solid ${secondaryHex}`:'2px solid transparent', outlineOffset:'3px' }}>
                              {secondaryColor!=='Custom' && <span className="text-white text-xs font-black" style={{ textShadow:'0 0 4px rgba(0,0,0,0.8)' }}>+</span>}
                              <input ref={customSecRef} type="color" className="sr-only" defaultValue="#e879f9"
                                onChange={e => { setSecondaryColor('Custom'); setSecondaryHex(e.target.value); }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showSecondary && secondaryColor && (
                    <div>
                      {!showTertiary ? (
                        <button onClick={() => setShowTertiary(true)}
                          className="text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
                          style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)', color:'#6b7280' }}>
                          + Add Third Color
                        </button>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-500 pl-1">Third color</p>
                            <button onClick={() => { setShowTertiary(false); setTertiaryColor(''); setTertiaryHex(''); }}
                              className="text-xs text-gray-600 hover:text-gray-400 transition-colors">✕ remove</button>
                          </div>
                          <div className="flex flex-wrap gap-3 items-center">
                            {COLOR_SWATCHES.map(c => (
                              <button key={`t-${c.label}`} onClick={() => { setTertiaryColor(c.label); setTertiaryHex(c.hex); }} title={c.label}
                                className="w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0"
                                style={{ background:c.hex, boxShadow:tertiaryColor===c.label?`0 0 22px ${c.glow}`:'none',
                                  transform:tertiaryColor===c.label?'scale(1.3)':'scale(1)',
                                  outline:tertiaryColor===c.label?`2px solid ${c.hex}`:'2px solid transparent', outlineOffset:'3px' }} />
                            ))}
                            <button onClick={() => customThirdRef.current?.click()} title="Custom"
                              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ background:tertiaryColor==='Custom'?tertiaryHex:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                                outline:tertiaryColor==='Custom'?`2px solid ${tertiaryHex}`:'2px solid transparent', outlineOffset:'3px' }}>
                              {tertiaryColor!=='Custom' && <span className="text-white text-xs font-black" style={{ textShadow:'0 0 4px rgba(0,0,0,0.8)' }}>+</span>}
                              <input ref={customThirdRef} type="color" className="sr-only" defaultValue="#22d3ee"
                                onChange={e => { setTertiaryColor('Custom'); setTertiaryHex(e.target.value); }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {colorMode === 'guided' && (
                <div className="rounded-2xl p-3" style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-sm text-gray-300 font-semibold">Color palette</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto pr-1">
                    {[...GUIDED_PALETTES].reverse().map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => setGuidedPalette(prev => prev === palette.name ? '' : palette.name)}
                        className="w-full flex items-center justify-between px-2 py-3 rounded-lg transition-all"
                        style={{ background: guidedPalette === palette.name ? 'rgba(34,211,238,0.12)' : 'transparent' }}
                      >
                        <span className="flex flex-col items-start">
                          <span className="text-lg text-gray-200">{palette.name}</span>
                          <span className="text-[10px] text-gray-500">{palette.vibe}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {palette.swatches.map((hex, idx) => (
                            <span
                              key={`${palette.name}-${idx}`}
                              className="w-6 h-6 rounded-[4px]"
                              style={{ background: hex }}
                            />
                          ))}
                          <span className="text-xl ml-1" style={{ color: guidedPalette === palette.name ? '#67e8f9' : '#374151' }}>✓</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 mt-3">
                    <label className="text-xs text-gray-500 pl-1">Palette direction (optional)</label>
                    <textarea
                      value={colorUsageRules}
                      onChange={(e) => setColorUsageRules(e.target.value)}
                      rows={2}
                      placeholder="e.g. keep this palette but reduce saturation and avoid neon"
                      className="w-full rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
                      style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                </div>
              )}

              {colorMode === 'ai' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-500 pl-1">Direct the AI Designer (optional)</label>
                  <textarea
                    value={colorUsageRules}
                    onChange={(e) => setColorUsageRules(e.target.value)}
                    rows={2}
                    placeholder="e.g. Use deep navy + electric cyan, avoid red/orange, keep it premium and modern"
                    className="w-full rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
                    style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              )}

              {!isLocked('color') && (
                <button ref={colorConfirmRef} onClick={handlePrimaryConfirm} className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-all"
                  style={{ ...glassBase, border:'1px solid rgba(34,211,238,0.4)', color:'#22d3ee', textShadow:'0 0 20px rgba(34,211,238,0.5)', boxShadow:'0 0 24px rgba(34,211,238,0.12)' }}>
                  {colorMode === 'exact'
                    ? `Confirm ${exactColorCount} Manual Color${exactColorCount > 1 ? 's' : ''}`
                    : colorMode === 'guided'
                      ? 'Confirm Palette Direction'
                      : colorMode === 'ai'
                        ? 'Confirm AI Designer Direction'
                        : 'Choose color mode'} {isUploadedEditMode ? '→ Edit instructions' : '→'}
                </button>
              )}
            </div>
          )}

          {/* BACKGROUND */}
          {visibleSteps.includes('background') && !isUploadedEditMode && (
            <div ref={lastStep === 'background' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-fuchsia-400/80 font-bold pl-1">Background Style</label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUNDS.map(bg => (
                  <button key={bg.value} onClick={() => handleBackgroundSelect(bg.value)}
                    className="flex flex-col items-center rounded-xl overflow-hidden transition-all duration-200"
                    style={{ ...pillBase(background===bg.value,'rgba(232,121,249,0.6)','linear-gradient(135deg,rgba(232,121,249,0.2),rgba(99,102,241,0.2))'), padding:'10px 10px 8px' }}>
                    <div className="w-full h-12 mb-2 rounded-md overflow-hidden">
                      <BgPreview value={bg.value} primaryHex={primaryHex||'#818cf8'} />
                    </div>
                    <span className="text-xs font-bold" style={{ color:background===bg.value?'#f0abfc':'#9ca3af' }}>
                      {bg.label}{bg.hot && <HotBadge />}{recBg===bg.label && <RecBadge />}
                    </span>
                    <span className="text-[10px] mt-0.5" style={{ color:'#4b5563' }}>{bg.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          {/* TAGLINE */}
          {visibleSteps.includes('tagline') && !isUploadedEditMode && (
            <div ref={lastStep === 'tagline' ? latestStepRef : undefined} className="flex flex-col gap-4" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-fuchsia-400/80 font-bold pl-1">Tagline on the logo?</label>
              <div className="flex gap-3">
                {(['none', 'with'] as const).map(choice => (
                  <button
                    key={choice}
                    onClick={() => handleTaglineChoice(choice)}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold tracking-wide transition-all duration-200"
                    style={{
                      ...pillBase(taglineChoice === choice,
                        choice === 'with' ? 'rgba(232,121,249,0.6)' : 'rgba(99,102,241,0.5)',
                        choice === 'with'
                          ? 'linear-gradient(135deg,rgba(232,121,249,0.25),rgba(99,102,241,0.2))'
                          : 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.2))'),
                      color: taglineChoice === choice ? (choice === 'with' ? '#f0abfc' : '#a5b4fc') : '#9ca3af',
                    }}
                  >
                    {choice === 'none' ? 'No tagline' : 'Yes, add one'}
                  </button>
                ))}
              </div>
              {taglineChoice === 'with' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={taglineText}
                    onChange={e => setTaglineText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && taglineText.trim()) { e.preventDefault(); handleTaglineConfirm(); } }}
                    disabled={isLocked('tagline')}
                    placeholder="e.g. Built for the bold"
                    className="w-full rounded-2xl px-6 py-4 text-white placeholder-gray-600 focus:outline-none transition-all disabled:cursor-not-allowed"
                    style={{ ...glassBase, fontSize:'1rem',
                      border: isLocked('tagline') ? '1px solid rgba(232,121,249,0.4)' : '1px solid rgba(255,255,255,0.08)' }}
                  />
                  {!isLocked('tagline') && (
                    <button
                      onClick={handleTaglineConfirm}
                      className="w-full py-3 rounded-xl text-sm font-bold tracking-widest uppercase transition-opacity duration-200"
                      style={{ ...glassBase, border:'1px solid rgba(232,121,249,0.4)', color:'#f0abfc',
                        textShadow:'0 0 20px rgba(232,121,249,0.5)',
                        opacity: taglineText.trim() ? 1 : 0.3,
                        pointerEvents: taglineText.trim() ? 'auto' : 'none' as any }}
                    >
                      Confirm Tagline →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INSPIRATION IMAGES */}
          {visibleSteps.includes('inspiration') && !isUploadedEditMode && (
            <div ref={lastStep === 'inspiration' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-indigo-400/80 font-bold pl-1">
                Style inspiration <span className="text-gray-600 normal-case tracking-normal font-normal">(optional — up to 3 images)</span>
              </label>
              <div className="flex gap-3 flex-wrap">
                {imgPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.1)' }}>
                    <img src={src} alt="ref" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{ background:'rgba(0,0,0,0.7)', color:'#f87171' }}>✕</button>
                  </div>
                ))}
                {uploadedImages.length < 3 && (
                  <label className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
                    style={{ border:'1px dashed rgba(99,102,241,0.4)', color:'#6b7280' }}>
                    <span className="text-2xl">+</span>
                    <span className="text-xs mt-0.5">Upload</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              <button onClick={() => advanceTo('inspiration', 'description')}
                className="self-start px-6 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all"
                style={{ ...glassBase, border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc' }}>
                {uploadedImages.length > 0 ? `Continue with ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} →` : 'Skip →'}
              </button>
            </div>
          )}

          {visibleSteps.includes('description') && (
            <div ref={lastStep === 'description' ? latestStepRef : undefined} className="flex flex-col gap-3" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
              <label className="text-xs tracking-[0.25em] uppercase text-indigo-400/80 font-bold pl-1">
                {isUploadedEditMode ? 'Edit instructions' : 'Tell us more'} <span className="text-gray-600 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                disabled={isLocked('description')} rows={3} placeholder={isUploadedEditMode ? 'Describe exactly what to edit on the uploaded logo (e.g. keep icon unchanged, redesign only top/bottom text)…' : 'Describe your brand vibe, tagline, or anything special…'}
                className="w-full rounded-2xl px-6 py-4 text-base text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
                style={{ ...glassBase, border:isLocked('description')?'1px solid rgba(99,102,241,0.4)':'1px solid rgba(255,255,255,0.08)' }} />

              {!isLocked('description') && !generating && (
                <div className="capsule-wrap">
                  <button onClick={handleGenerate} className="capsule-btn"
                    title={creditBalance === 0 ? "No credits left" : undefined}>
                    Generate My Logo
                  </button>
                </div>
              )}
              {generating && (
                <div className="capsule-wrap" style={{ animation: 'pulseBeat 1.5s ease-in-out infinite' }}>
                  <div className="capsule-btn text-center" style={{ cursor: 'default' }}>
                    ◈ Generating your logo…
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DONE */}
          {logoRounds.length > 0 && (
            <div ref={el => { doneRef.current = el as HTMLDivElement | null; if (lastStep === 'done') latestStepRef.current = el as HTMLDivElement | null; }} className="rounded-3xl p-4 sm:p-8 text-center"
              style={{ ...glassBase, border:'1px solid rgba(34,211,238,0.2)', boxShadow:'0 0 60px rgba(34,211,238,0.07)', animation:'pSlideIn 0.6s ease-out both' }}>
              <div className="text-5xl mb-4">✦</div>
              <h2 className="text-2xl font-black tracking-wide bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent mb-2">{normalizedBusinessName() || businessName}</h2>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {[
                  industry,
                  style,
                  logoType,
                  dimension,
                  colorMode === 'exact'
                    ? `${exactColorCount || 0} manual color${exactColorCount === 1 ? '' : 's'}`
                    : colorMode === 'guided'
                      ? `Palette: ${guidedPalette || 'Not selected'}`
                      : colorMode === 'ai'
                        ? 'Directed AI designer colors'
                        : '',
                  colorUsageRules ? 'Color rules set' : '',
                  background,
                  taglineChoice === 'with' && taglineText ? `Tagline: ${taglineText}` : taglineChoice === 'none' ? 'No tagline' : ''
                ].filter(Boolean).map(tag => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full"
                    style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)', color:'#9ca3af' }}>{tag}</span>
                ))}
              </div>
              {genError && (
                <p className="text-red-400 text-sm mb-4">⚠ {genError}</p>
              )}


              {/* All logo rounds — previous rounds above, latest at bottom */}
              {logoRounds.map((roundLogos, roundIdx) => {
                const isLatest = roundIdx === logoRounds.length - 1;
                return (
                  <div key={roundIdx} ref={isLatest ? latestRoundRef : undefined} className="w-full">
                    {/* Round label for refinements */}
                    {roundIdx > 0 && (
                      <p className="text-xs text-gray-600 tracking-widest uppercase text-center mb-2 mt-1">Refinement {roundIdx}</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-4">
                      {roundLogos.map((url, i) => {
                        const isPending = !url;
                        const isSelected = isLatest && !isPending && selectedIdxs.has(i);
                        const isLiked = !isPending && likedUrls.has(url);
                        const cardWidthClass = roundLogos.length === 1 ? 'w-full' : 'w-full sm:w-[calc(33.333%-0.5rem)]';
                        const toggleSel = () => {
                          if (!isLatest || isPending) return;
                          setSelectedIdxs(prev => {
                            const next = new Set(prev);
                            if (next.has(i)) {
                              next.delete(i);
                            } else {
                              next.add(i);
                            }
                            return next;
                          });
                        };

                        return (
                          <div key={i} onClick={toggleSel}
                            className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${cardWidthClass}`}
                            style={{
                              ...glassBase,
                              cursor: isLatest && !isPending ? 'pointer' : 'default',
                              border: isSelected ? '1px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.2)' : undefined,
                              opacity: !isLatest ? 0.5 : 1,
                            }}>
                            {isPending ? (
                              <div className="w-full aspect-[16/9] flex flex-col items-center justify-center gap-3 p-3 sm:p-4 bg-white/[0.03]">
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-300 animate-spin" />
                                <p className="text-xs tracking-wide text-gray-500">Generating…</p>
                              </div>
                            ) : (
                              <img src={url} alt={`Logo ${i + 1}`}
                                className="w-full h-auto p-2 sm:p-3 bg-white/5 block" />
                            )}
                            <div className="flex items-center justify-between px-3 py-2"
                              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <button
                                disabled={isPending}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!isPending) toggleLike(url);
                                }}
                                className="flex items-center gap-1.5 text-xs transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: isLiked ? '#f472b6' : '#4b5563' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              </button>
                              {isLatest && roundLogos.length > 1 && (
                                <span className="text-xs" style={{ color: isPending ? '#4b5563' : (isSelected ? '#a5b4fc' : '#374151') }}>
                                  {isPending ? '…' : (isSelected ? '✦' : '○')}
                                </span>
                              )}
                              <button
                                disabled={isPending}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!isPending) downloadLogo(url);
                                }}
                                className="flex items-center gap-1 text-xs transition-all duration-200 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: '#4b5563' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {logoRounds.length === 0 && !genError && (
                <p className="text-gray-500 text-sm mb-6">Your logos will appear here.</p>
              )}

              {/* RESTART BUTTON — after generation */}
              {logoRounds.length > 0 && (
                <div className="flex justify-center mb-4" style={{animation:'pSlideIn 0.5s ease-out both'}}>
                  <button onClick={reset}
                    className="px-6 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
                    style={{...glassBase, border:'1px solid rgba(255,255,255,0.08)', color:'#6b7280'}}>
                    ↺ Start New Logo
                  </button>
                </div>
              )}

              {/* ── REFINEMENT SECTION ── */}
              {logoRounds.length > 0 && (
                <div ref={refineRef} className="w-full text-left mt-2 mb-2 flex flex-col gap-4" style={{ animation:'pSlideIn 0.5s ease-out both' }}>
                  {/* Header row: label + credit badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-[0.2em] uppercase font-bold text-indigo-400/80">Refine selected logos</span>
                    {creditBalance !== null && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: creditBalance > 3 ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)',
                          border: `1px solid ${creditBalance > 3 ? 'rgba(99,102,241,0.35)' : 'rgba(239,68,68,0.4)'}`,
                          color:  creditBalance > 3 ? '#a5b4fc' : '#f87171' }}>
                        {creditBalance === Infinity ? '∞ unlimited' : `${creditBalance} credit${creditBalance !== 1 ? 's' : ''} left`}
                      </span>
                    )}
                  </div>

                  {/* Feedback textarea */}
                  <textarea
                    value={refineFeedback} onChange={e => setRefineFeedback(e.target.value)}
                    rows={2} placeholder="Example: keep the icon, make text bolder, simplify shapes, improve spacing"
                    className="w-full rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
                    style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.08)' }}
                  />

                  {/* Count picker — centered */}
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-gray-500">Next round</span>
                    {([1, 3, 5] as const).map((n) => {
                      const isLocked = !isSignedIn && n > 1;
                      return (
                        <button
                          key={n}
                          onClick={() => {
                            if (isLocked) {
                              setAuthModal('variations');
                            } else {
                              setRefineCount(n);
                            }
                          }}
                          className="relative w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200"
                          style={{
                            ...glassBase,
                            border: refineCount === n && !isLocked ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: refineCount === n && !isLocked ? '#a5b4fc' : isLocked ? '#4b5563' : '#6b7280',
                            cursor: isLocked ? 'pointer' : 'default',
                          }}
                        >
                          {n}
                          {isLocked && (
                            <span
                              className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[7px] font-black border"
                              style={{ background: 'rgba(34,211,238,0.16)', color: '#22d3ee', borderColor: 'rgba(34,211,238,0.45)' }}
                            >
                              +10
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <span className="text-xs text-gray-500">
                      variation{refineCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Refine button — full width */}
                  <div className="capsule-wrap w-full">
                    {isRefining ? (
                      <div className="capsule-btn text-center" style={{ cursor:'default', animation:'pulseBeat 1.5s ease-in-out infinite', color:'#9ca3af' }}>◈ Refining…</div>
                    ) : (() => {
                        const canRefine = !!refineFeedback.trim() && !!creditBalance && creditBalance >= refineCount;
                        const msg = !refineFeedback.trim() ? 'Add one clear direction'
                          : (!creditBalance || creditBalance < refineCount) ? `Need ${refineCount} credit${refineCount > 1 ? 's' : ''} (${creditBalance ?? 0} left)`
                          : 'Refine selected logos →';
                        return (
                          <button onClick={handleRefine} disabled={!canRefine} className="capsule-btn w-full"
                            style={{ color: canRefine ? '#9ca3af' : '#4b5563', cursor: canRefine ? 'pointer' : 'not-allowed' }}>
                            {msg}
                          </button>
                        );
                      })()}
                  </div>

                  {refineError && <p className="text-red-400 text-xs">{refineError}</p>}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {(visibleSteps.includes('done') || logoRounds.length > 0) && (
        <footer className="relative z-10 w-full px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex justify-center">
          <div
            className="text-xs text-gray-600 flex items-center gap-3 whitespace-nowrap overflow-x-auto px-4 py-2 rounded-xl"
            style={{
              ...glassBase,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(5,5,8,0.45)',
            }}
          >
            <button onClick={() => setInfoModal('about')} className="hover:text-gray-400 transition-colors">About</button>
            <span className="text-gray-700">·</span>
            <button onClick={() => setInfoModal('tos')} className="hover:text-gray-400 transition-colors">Terms</button>
            <span className="text-gray-700">·</span>
            <button onClick={() => setInfoModal('privacy')} className="hover:text-gray-400 transition-colors">Privacy</button>
            <span className="text-gray-700">·</span>
            <span>© 2026 CraftYourLogo</span>
          </div>
        </footer>
      )}


      {/* ── REFINE REFERENCE PICKER MODAL ───────────────────────── */}
      {refineSelectionModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
          onClick={() => setRefineSelectionModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 sm:p-7 flex flex-col gap-4"
            style={{ ...glassBase, border: '1px solid rgba(99,102,241,0.34)', boxShadow: '0 0 70px rgba(99,102,241,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-3xl text-center">◈</div>
            <h3 className="text-lg font-black tracking-wide text-center text-white">Pick the logo to refine first</h3>

            <div className="rounded-2xl p-4" style={{ ...glassBase, border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-sm text-gray-300 leading-relaxed">{refineSelectionModal.message}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => {
                  setRefineSelectionModal(null);
                  showToast('Select one or more logos, then click Refine again.', 'info');
                  setTimeout(() => scrollToElCentered(latestRoundRef.current, 96), 80);
                }}
                className="capsule-btn capsule-btn-sm w-full"
                style={{ color: '#a5b4fc' }}
              >
                Select logo(s) to refine
              </button>
              <button
                onClick={() => setRefineSelectionModal(null)}
                className="w-full py-2.5 rounded-xl text-sm"
                style={{ ...glassBase, border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEGAL / ABOUT MODAL ─────────────────────────────────── */}
      {infoModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)' }}
          onClick={() => setInfoModal(null)}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden"
            style={{ ...glassBase, border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 24px 80px rgba(0,0,0,0.55)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm tracking-[0.18em] uppercase font-black text-white">
                {infoModal === 'about' ? 'About CraftYourLogo' : infoModal === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <button onClick={() => setInfoModal(null)} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto text-sm leading-relaxed text-gray-300 space-y-5">
              {infoModal === 'about' && (
                <>
                  <p>
                    CraftYourLogo is an AI-powered logo studio built to make professional brand identity fast, accessible, and affordable.
                    Powered by Google Gemini, it generates unique logo concepts from your business context in minutes.
                  </p>
                  <p>
                    Mission: help entrepreneurs ship their brand identity without waiting for agency timelines or large design budgets.
                  </p>
                  <p>
                    For support, reach out at <a href="mailto:support@craftyourlogo.com" className="text-indigo-300 hover:text-indigo-200 underline">support@craftyourlogo.com</a>.
                  </p>
                </>
              )}

              {infoModal === 'tos' && (
                <>
                  <div><h4 className="text-white font-semibold mb-1">1. Acceptance</h4><p>By using CraftYourLogo, you agree to these terms.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">2. Service</h4><p>Free users get limited credits. Premium users get unlimited generations and advanced download formats after payment.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">3. Payments</h4><p>Premium upgrade is a one-time €9.99 payment processed securely via Stripe.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">4. Usage Rights</h4><p>Generated logos are available for personal and commercial use. You are responsible for trademark checks and legal use.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">5. Refunds</h4><p>Due to digital delivery, refunds are generally not provided after premium activation, except for critical technical failures.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">6. Liability</h4><p>Our liability is limited to the amount paid for premium service.</p></div>
                </>
              )}

              {infoModal === 'privacy' && (
                <>
                  <div><h4 className="text-white font-semibold mb-1">Data Collected</h4><p>We collect account info, usage data, and generation prompts required to operate and improve the service.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">How Data Is Used</h4><p>To deliver logo generation, process payments, maintain your account, and improve product quality.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">Sharing</h4><p>We never sell personal data. We only share with essential processors (e.g., Clerk, Stripe, Google) or when legally required.</p></div>
                  <div><h4 className="text-white font-semibold mb-1">Your Rights</h4><p>You may request access, correction, deletion, or export of your data under applicable laws (including GDPR).</p></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>

      {/* ── TOASTS ───────────────────────────────────────────────── */}
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-auto px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-xl flex items-center gap-3"
            style={{
              animation: 'pSlideIn 0.3s ease-out both',
              background: t.type === 'success' ? 'rgba(16,185,129,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : t.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
              border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,0.4)' : t.type === 'error' ? 'rgba(239,68,68,0.4)' : t.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.4)'}`,
              color: t.type === 'success' ? '#6ee7b7' : t.type === 'error' ? '#fca5a5' : t.type === 'warning' ? '#fcd34d' : '#a5b4fc',
              backdropFilter: 'blur(12px)',
            }}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : '◈'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── STRIPE PAYMENT MODAL ────────────────────────────────── */}
      {stripeSecret && (
        <Suspense fallback={null}>
          <StripeCheckoutModal
            clientSecret={stripeSecret}
            error={stripeError}
            onClose={() => { setStripeSecret(null); setStripeError(''); }}
            onSuccess={async () => {
              trackGaEvent('payment_success', {
                value: 9.99,
                currency: 'EUR',
                plan: 'premium',
                payment_intent_id: paymentIntentId || undefined,
              });
              setStripeSecret(null);
              setAuthModal(null);
              await updateUserSubscription('premium', { paymentIntentId: paymentIntentId || undefined });
              showToast('Welcome to Premium! Unlimited generations unlocked ✦', 'success');
            }}
            onError={(msg) => setStripeError(msg)}
          />
        </Suspense>
      )}

      {/* ── DOWNLOAD MODAL ──────────────────────────────────────── */}
      {downloadModal && (
        <Suspense fallback={null}>
          <DownloadModal
            isOpen={!!downloadModal}
            onClose={() => setDownloadModal(null)}
            logo={downloadModal}
            isPremiumUser={isPremiumUser()}
            businessName={businessName}
            onSave={() => {}}
          />
        </Suspense>
      )}

      {/* ── SAVED COLLECTION PANEL ──────────────────────────────── */}
      {showCollection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowCollection(false)}>
          <div className="w-full max-w-lg rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh]"
            style={{ ...glassBase, border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black tracking-widest uppercase text-white">Saved Logos ({savedLogos.length})</span>
              <button onClick={() => setShowCollection(false)} className="text-gray-600 hover:text-gray-400">✕</button>
            </div>
            {savedLogos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No saved logos yet. Hit ♡ on any logo.</p>
            ) : (
              <div className="overflow-y-auto flex flex-wrap gap-3 justify-center">
                {savedLogos.map((logo: any) => (
                  <div key={logo.id} className="relative rounded-2xl overflow-hidden" style={{ width:'calc(33.333% - 0.5rem)', ...glassBase, border:'1px solid rgba(255,255,255,0.08)' }}>
                    <img src={logo.url || logo.logo_url} alt="saved" className="w-full h-auto p-3 bg-white/5 block" />
                    <div className="flex items-center justify-between px-2 py-1.5 gap-2" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        onClick={() => resumeFromSavedLogo(logo)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                        style={{ ...glassBase, border: '1px solid rgba(99,102,241,0.28)', color:'#a5b4fc' }}
                      >
                        Edit
                      </button>
                      <div className="flex items-center gap-2 ml-auto">
                        <button onClick={() => downloadLogo(logo.url || logo.logo_url)}
                          className="text-xs hover:text-cyan-400 transition-colors" style={{ color:'#4b5563' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        <button onClick={async () => { await removeLogoFromDB(logo.id); showToast('Removed from collection', 'info'); }}
                          className="text-xs hover:text-red-400 transition-colors" style={{ color:'#4b5563' }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FREE DOWNLOAD INFO MODAL (ANON) ─────────────────────── */}
      {freeDownloadUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setFreeDownloadUrl(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-8 flex flex-col gap-5"
            style={{ ...glassBase, border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 60px rgba(34,211,238,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-3xl text-center">⬇️</div>
            <h3 className="text-lg font-black tracking-wide text-center text-white">Free download: PNG only</h3>
            <p className="text-sm text-gray-400 text-center leading-relaxed">
              You can continue with a standard PNG now, but you’ll miss premium export tools.
            </p>

            <div className="rounded-2xl p-4" style={{ ...glassBase, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs tracking-widest uppercase text-gray-500 mb-2">Missing in free download</p>
              <ul className="text-sm text-gray-300 space-y-1.5">
                <li>• SVG vector export</li>
                <li>• 8K ultra-HD files</li>
                <li>• Background removal</li>
                <li>• ICO favicon package</li>
                <li>• Full format bundle</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const url = freeDownloadUrl;
                  setFreeDownloadUrl(null);
                  if (url) await triggerPngDownload(url);
                }}
                className="w-full py-3 text-sm rounded-xl"
                style={{ ...glassBase, border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af' }}
              >
                Continue with free PNG
              </button>

              <SignUpButton mode="modal">
                <button className="capsule-btn capsule-btn-sm w-full" style={{ color: '#22d3ee' }}>
                  Create free account (+10 credits) →
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Already have an account? Sign in
                </button>
              </SignInButton>
            </div>

            <button onClick={() => setFreeDownloadUrl(null)} className="absolute top-4 right-5 text-gray-600 hover:text-gray-400 text-lg">✕</button>
          </div>
        </div>
      )}

      {/* ── REFINE TUTORIAL OVERLAY ───────────────────────────────── */}
      {shouldRenderTutorial && (
        <div className="fixed inset-0 z-[210] pointer-events-none">
          <div
            className="absolute rounded-2xl transition-all duration-200"
            style={{
              top: tutorialHighlight?.top ?? 24,
              left: tutorialHighlight?.left ?? 24,
              width: tutorialHighlight?.width ?? Math.max(280, viewportW - 48),
              height: tutorialHighlight?.height ?? 160,
              border: tutorialHighlight ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(34,211,238,0.22)',
              boxShadow: '0 0 0 9999px rgba(2,6,23,0.72), 0 0 24px rgba(34,211,238,0.16)',
              background: 'transparent',
            }}
          />

          <div
            className="absolute rounded-2xl p-5 pointer-events-auto"
            style={{
              width: tutorialCardWidth,
              top: tutorialCardTop,
              left: tutorialCardLeft,
              background: 'rgba(5,5,8,0.92)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 mb-2">
              Quick tutorial · step {tutorialStepIndex + 1}/{tutorialSteps.length}
            </p>
            <h4 className="text-xl font-bold text-white mb-2">{activeTutorialStep.title}</h4>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">{activeTutorialStep.description}</p>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={closeTutorial}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:bg-white/10"
                style={{
                  color: '#9ca3af',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Skip
              </button>

              <button
                onClick={nextTutorialStep}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-90"
                style={{
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  border: 'none',
                }}
              >
                {tutorialStepIndex === tutorialSteps.length - 1 ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ────────────────────────────────────────────── */}
      {authModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setAuthModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-8 flex flex-col gap-5"
            style={{ ...glassBase, border: authModal === 'upgrade' ? '1px solid rgba(232,121,249,0.3)' : '1px solid rgba(34,211,238,0.25)', boxShadow: authModal === 'upgrade' ? '0 0 60px rgba(232,121,249,0.1)' : '0 0 60px rgba(34,211,238,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            {authModal === 'save' ? (
              <>
                <div className="text-3xl text-center">♡</div>
                <h3 className="text-lg font-black tracking-wide text-center text-white">Save your logos</h3>
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Create a free account to save logos to your collection, and unlock <span className="text-cyan-400 font-semibold">+10 more free credits</span>.
                </p>
                <div className="flex flex-col gap-3">
                  <SignUpButton mode="modal">
                    <button className="capsule-btn capsule-btn-sm w-full" style={{ color: '#22d3ee' }}>
                      Create free account (+10 credits) →
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      Already have an account? Sign in
                    </button>
                  </SignInButton>
                </div>
              </>
            ) : authModal === 'variations' ? (
              <>
                <div className="text-3xl text-center">◈</div>
                <h3 className="text-lg font-black tracking-wide text-center text-white">Unlock More Refinements</h3>
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Sign in to unlock <span className="text-cyan-400 font-semibold">+10 more free credits</span> and access <span className="text-cyan-400 font-semibold">3 & 5 variation refinements</span>.
                </p>
                <div className="flex flex-col gap-3">
                  <SignUpButton mode="modal">
                    <button className="capsule-btn capsule-btn-sm w-full" style={{ color: '#22d3ee' }}>
                      Create free account (+10 credits) →
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      Already have an account? Sign in
                    </button>
                  </SignInButton>
                  <button
                    onClick={() => setAuthModal(null)}
                    className="w-full py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Continue with 1 variation
                  </button>
                </div>
              </>
            ) : !isSignedIn ? (
              <>
                <div className="text-3xl text-center">⌛</div>
                <h3 className="text-lg font-black tracking-wide text-center text-white">You used your {ANON_CREDITS_LIMIT} guest credits</h3>
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Pick your path to continue.
                </p>

                <div className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{ ...glassBase, border: '1px solid rgba(34,211,238,0.22)' }}>
                  <p className="text-xs tracking-widest uppercase text-cyan-400/90">Option 1 · Continue Free</p>
                  <SignUpButton mode="modal">
                    <button className="capsule-btn capsule-btn-sm w-full" style={{ color: '#22d3ee' }}>
                      Continue free (+10 credits) →
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      Already have an account? Sign in
                    </button>
                  </SignInButton>
                </div>

                <div className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{ ...glassBase, border: '1px solid rgba(232,121,249,0.22)' }}>
                  <p className="text-xs tracking-widest uppercase text-fuchsia-300/90">Option 2 · Go Premium</p>
                  <SignUpButton mode="modal">
                    <button className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                      style={{ ...glassBase, border: '1px solid rgba(232,121,249,0.35)', color: '#f0abfc' }}>
                      Go premium now (€9.99) →
                    </button>
                  </SignUpButton>
                  <p className="text-[11px] text-gray-500 text-center">Sign in required first · secure Stripe checkout</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl text-center">✦</div>
                <h3 className="text-lg font-black tracking-wide text-center text-white">You're out of free credits</h3>
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  Upgrade to unlock unlimited generations, HD downloads, SVG exports, and background tools.
                </p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tosAccepted}
                      onChange={(e) => setTosAccepted(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-400"
                    />
                    <span className="text-xs text-gray-400">
                      I agree to the <span className="text-indigo-400 underline cursor-pointer">Terms of Service</span>{' '}
                      and understand payments are non-refundable
                    </span>
                  </label>
                  <div className="capsule-wrap w-full">
                    <button
                      className="capsule-btn capsule-btn-sm w-full"
                      onClick={handlePaymentUpgrade}
                      style={{ color: stripeLoading ? '#4b5563' : '#9ca3af', cursor: stripeLoading ? 'wait' : 'pointer' }}
                    >
                      {stripeLoading ? '◈ Preparing payment…' : 'Upgrade — €9.99'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 text-center -mt-1">Secure Stripe checkout · one-time payment · immediate unlock</p>
                  {stripeError && <p className="text-red-400 text-xs text-center">{stripeError}</p>}
                  <SignInButton mode="modal">
                    <button className="w-full py-3 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      Sign in to existing account
                    </button>
                  </SignInButton>
                </div>
              </>
            )}
            <button onClick={() => setAuthModal(null)} className="absolute top-4 right-5 text-gray-600 hover:text-gray-400 text-lg">✕</button>
          </div>
        </div>
      )}

      <style>{`
        html { overflow-y: overlay; }
        ::-webkit-scrollbar { width: 5px; background: transparent; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        .capsule-wrap {
          position: relative;
          width: 100%;
        }
        .capsule-wrap::after {
          content: '';
          position: absolute;
          bottom: -7px;
          left: 15%; right: 15%;
          height: 28px;
          background: linear-gradient(90deg, #22d3ee 0%, #6366f1 100%);
          border-radius: 50%;
          filter: blur(6px);
          opacity: 0.20;
          pointer-events: none;
          transition: opacity 0.45s ease, filter 0.45s ease, left 0.45s ease, right 0.45s ease;
        }
        .capsule-wrap:hover::after {
          opacity: 0.34;
          filter: blur(20px);
          left: 4%; right: 4%;
        }
        .capsule-btn {
          position: relative;
          width: 100%; border: none; cursor: pointer;
          background: rgba(5,5,8,0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          color: #9ca3af;
          padding: 1.4rem;
          font-size: 1.25rem; font-weight: 900;
          letter-spacing: 0.3em; text-transform: uppercase;
          transition: border-color 0.35s ease;
          outline: none;
        }
        .capsule-btn:hover { border-color: rgba(255,255,255,0.22); }
        .capsule-btn:focus-visible { outline: 1px solid rgba(192,38,211,0.45); outline-offset: 3px; }
        .icon-btn {
          position: relative; width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(5,5,8,0.35);
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          transition: border-color 0.2s ease, background 0.2s ease;
          cursor: pointer;
        }
        .icon-btn:hover {
          background: rgba(5,5,8,0.55);
          border-color: rgba(255,255,255,0.22);
        }
        /* Suppress Clerk UserButton hover shiver */
        .cl-userButtonTrigger { transition: none !important; transform: none !important; }
        .cl-userButtonTrigger:hover { transform: none !important; box-shadow: none !important; }
        .cl-userButtonAvatarBox { transition: none !important; }
        .capsule-btn-sm { font-size: 0.8rem !important; font-weight: 700 !important; letter-spacing: 0.08em !important; padding: 0.7rem 1.2rem !important; }
        .capsule-wrap:has(.capsule-btn-sm)::after { opacity: 0.12; filter: blur(10px); }
        .capsule-wrap:has(.capsule-btn-sm):hover::after { opacity: 0.35; filter: blur(20px); }
        @keyframes pSlideIn { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseBeat { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

      `}</style>
    </div>
  );
};

export default StudioDesignDemoHeroProgressive;
