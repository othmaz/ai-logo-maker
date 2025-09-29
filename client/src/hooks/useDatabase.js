import { useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

export function useDatabase() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache for logos to avoid redundant API calls
  const [logoCache, setLogoCache] = useState(null);
  const [logoCacheTime, setLogoCacheTime] = useState(0);

  // Helper to make API calls
  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      setError(null);
      const response = await fetch(`/api/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // User Management
  const syncUser = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    try {
      const result = await apiCall('users/sync', {
        method: 'POST',
        body: JSON.stringify({
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress
        })
      });
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user, apiCall]);

  const getUserProfile = useCallback(async () => {
    if (!user) return null;

    return await apiCall(`users/profile?clerkUserId=${user.id}`);
  }, [user, apiCall]);

  const updateSubscription = useCallback(async (subscriptionStatus) => {
    if (!user) return null;

    return await apiCall('users/subscription', {
      method: 'PUT',
      body: JSON.stringify({
        clerkUserId: user.id,
        status: subscriptionStatus
      })
    });
  }, [user, apiCall]);

  // Logo Management
  const getSavedLogos = useCallback(async (forceRefresh = false) => {
    if (!user) return [];

    // Return cached data if it's fresh (less than 30 seconds old) and not forcing refresh
    const now = Date.now();
    const cacheAge = now - logoCacheTime;
    if (!forceRefresh && logoCache && cacheAge < 30000) {
      return logoCache;
    }

    const result = await apiCall(`logos/saved?clerkUserId=${user.id}`);
    const logos = result.logos || [];

    // Update cache
    setLogoCache(logos);
    setLogoCacheTime(now);

    return logos;
  }, [user, apiCall, logoCache, logoCacheTime]);

  const saveLogo = useCallback(async (logoData) => {
    if (!user) return null;

    const result = await apiCall('logos/save', {
      method: 'POST',
      body: JSON.stringify({
        clerkUserId: user.id,
        logo: {
          url: logoData.url,
          prompt: logoData.prompt || '',
          is_premium: logoData.is_premium || false,
          file_format: logoData.file_format || 'png'
        }
      })
    });

    // Invalidate cache when saving a new logo
    setLogoCache(null);
    setLogoCacheTime(0);

    return result;
  }, [user, apiCall]);

  const removeLogo = useCallback(async (logoId) => {
    if (!user) return null;

    const result = await apiCall(`logos/${logoId}?clerkUserId=${user.id}`, {
      method: 'DELETE'
    });

    // Invalidate cache when removing a logo
    setLogoCache(null);
    setLogoCacheTime(0);

    return result;
  }, [user, apiCall]);

  const clearAllLogos = useCallback(async () => {
    if (!user) return null;

    const result = await apiCall(`logos/clear?clerkUserId=${user.id}`, {
      method: 'DELETE'
    });

    // Invalidate cache when clearing all logos
    setLogoCache(null);
    setLogoCacheTime(0);

    return result;
  }, [user, apiCall]);

  // Generation Tracking
  const trackGeneration = useCallback(async (prompt, logosGenerated = 1, isPremium = false) => {
    if (!user) return null;

    return await apiCall('generations/track', {
      method: 'POST',
      body: JSON.stringify({
        clerkUserId: user.id,
        prompt,
        logosGenerated,
        isPremium
      })
    });
  }, [user, apiCall]);

  const getUsageStats = useCallback(async () => {
    if (!user) return null;

    return await apiCall(`generations/usage?clerkUserId=${user.id}`);
  }, [user, apiCall]);

  const incrementUsage = useCallback(async (count = 1) => {
    if (!user) return null;

    return await apiCall('generations/increment', {
      method: 'POST',
      body: JSON.stringify({
        clerkUserId: user.id,
        by: count
      })
    });
  }, [user, apiCall]);

  // Analytics
  const trackAnalytics = useCallback(async (action, metadata = {}) => {
    if (!user) return null;

    return await apiCall('analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        event: action,        // Server expects "event", not "action"
        clerkUserId: user.id,
        meta: metadata        // Server expects "meta", not "metadata"
      })
    });
  }, [user, apiCall]);

  const getDashboardAnalytics = useCallback(async () => {
    if (!user) return null;

    return await apiCall(`analytics/dashboard?clerkUserId=${user.id}`);
  }, [user, apiCall]);

  // Migration Helper
  const migrateFromLocalStorage = useCallback(async () => {
    if (!user) return null;

    // Get localStorage data
    const localStorageData = {
      savedLogos: JSON.parse(localStorage.getItem('savedLogos') || '[]'),
      generationsUsed: parseInt(localStorage.getItem('generationsUsed') || '0')
    };

    // Only migrate if there's data to migrate
    if (localStorageData.savedLogos.length === 0 && localStorageData.generationsUsed === 0) {
      return { success: true, message: 'No data to migrate' };
    }

    setIsLoading(true);
    try {
      const result = await apiCall('users/migrate', {
        method: 'POST',
        body: JSON.stringify({
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          localStorageData
        })
      });

      // Clear localStorage after successful migration
      if (result.success) {
        localStorage.removeItem('savedLogos');
        localStorage.removeItem('generationsUsed');
        console.log('✅ Migration completed, localStorage cleared');
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user, apiCall]);

  return {
    // State
    isLoading,
    error,

    // User Management
    syncUser,
    getUserProfile,
    updateSubscription,

    // Logo Management
    getSavedLogos,
    saveLogo,
    removeLogo,
    clearAllLogos,

    // Generation Tracking
    trackGeneration,
    getUsageStats,
    incrementUsage,

    // Analytics
    trackAnalytics,
    getDashboardAnalytics,

    // Migration
    migrateFromLocalStorage
  };
}