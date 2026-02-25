// Google Analytics & Ads Event Tracking

type GtagArg = string | number | boolean | Record<string, unknown> | undefined

declare global {
  interface Window {
    gtag: (...args: GtagArg[]) => void;
    dataLayer: unknown[];
  }
}

// Track Purchase Conversion (€9.99 Premium Upgrade)
export const trackPurchase = (transactionId: string, value: number = 9.99) => {
  if (typeof window.gtag !== 'function') return;

  // Google Analytics 4 e-commerce event
  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: 'EUR',
    items: [{
      item_id: 'premium_upgrade',
      item_name: 'Premium Logo Maker Access',
      item_category: 'Subscription',
      price: value,
      quantity: 1
    }]
  });

  // Also track as a conversion for Google Ads
  window.gtag('event', 'conversion', {
    send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // You'll replace this from Google Ads
    value: value,
    currency: 'EUR',
    transaction_id: transactionId
  });

  console.log('📊 Purchase tracked:', { transactionId, value });
};

// Track Sign Up Conversion
export const trackSignUp = (userId: string, email?: string) => {
  if (typeof window.gtag !== 'function') {
    console.warn('⚠️ gtag not available - Google Analytics not loaded');
    return;
  }

  console.log('📊 Sending sign_up event to GA4...', { userId, email });

  // Small delay to ensure GA4 is fully initialized
  setTimeout(() => {
    // Send standard GA4 sign_up event (will show in GA4 real-time)
    window.gtag('event', 'sign_up', {
      method: 'clerk',
      user_id: userId,
      email: email
    });

    // Send custom conversion event for Google Ads
    window.gtag('event', 'ads_conversion_sign_up', {
      user_id: userId,
      email: email
    });

    console.log('✅ Sign up events sent to gtag');

    // Debug: Check dataLayer
    if (window.dataLayer) {
      console.log('📊 DataLayer after sign_up:', window.dataLayer.slice(-5));
    }
  }, 500);
};

// Track Logo Generation
export const trackLogoGeneration = (prompt: string, isPremium: boolean = false) => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'generate_logo', {
    prompt: prompt,
    is_premium: isPremium,
    event_category: 'engagement',
    event_label: isPremium ? 'premium_generation' : 'free_generation'
  });

  console.log('📊 Logo generation tracked:', { prompt, isPremium });
};

// Track Logo Download
export const trackLogoDownload = (format: string, isPremium: boolean = false) => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'download_logo', {
    format: format,
    is_premium: isPremium,
    event_category: 'engagement',
    event_label: `${format}_download`
  });

  console.log('📊 Logo download tracked:', { format, isPremium });
};

// Track Page Views (automatically done by gtag, but you can manually track specific pages)
export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle
  });

  console.log('📊 Page view tracked:', { pagePath, pageTitle });
};

// Track Add to Cart (when user clicks upgrade button)
export const trackAddToCart = () => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'add_to_cart', {
    currency: 'EUR',
    value: 9.99,
    items: [{
      item_id: 'premium_upgrade',
      item_name: 'Premium Logo Maker Access',
      price: 9.99,
      quantity: 1
    }]
  });

  console.log('📊 Add to cart tracked');
};

// Track Begin Checkout (when payment modal opens)
export const trackBeginCheckout = () => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'begin_checkout', {
    currency: 'EUR',
    value: 9.99,
    items: [{
      item_id: 'premium_upgrade',
      item_name: 'Premium Logo Maker Access',
      price: 9.99,
      quantity: 1
    }]
  });

  console.log('📊 Begin checkout tracked');
};

// Enhanced Conversions - Send user data for better attribution
export const setUserProperties = (userId: string, email?: string, firstName?: string) => {
  if (typeof window.gtag !== 'function') return;

  window.gtag('set', 'user_properties', {
    user_id: userId,
    email: email,
    first_name: firstName
  });

  console.log('📊 User properties set:', { userId, email });
};
