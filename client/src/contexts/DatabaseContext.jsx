import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useDatabase } from '../hooks/useDatabase';

const DatabaseContext = createContext(null);

export const useDbContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDbContext must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  const { isSignedIn, user } = useUser();
  const db = useDatabase();

  // State
  const [savedLogos, setSavedLogos] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);
  const [isLoadingLogos, setIsLoadingLogos] = useState(false);

  // Initialize user data when they sign in
  useEffect(() => {
    const initializeUser = async () => {
      if (!isSignedIn || !user || isInitialized) return;

      try {
        console.log('🔄 Initializing user database...');

        // 1. Sync user with database
        await db.syncUser();

        // 2. Get user profile
        const profile = await db.getUserProfile();
        setUserProfile(profile);

        // 3. Check if we need to migrate from localStorage
        const localStorageData = {
          savedLogos: JSON.parse(localStorage.getItem('savedLogos') || '[]'),
          generationsUsed: parseInt(localStorage.getItem('generationsUsed') || '0')
        };

        const hasLocalData = localStorageData.savedLogos.length > 0 || localStorageData.generationsUsed > 0;

        if (hasLocalData && !isMigrated) {
          console.log('🔄 Migrating localStorage data...');
          const migrationResult = await db.migrateFromLocalStorage();
          if (migrationResult.success) {
            setIsMigrated(true);
            console.log('✅ Migration completed');
          }
        }

        // 4. Load saved logos from database in parallel with initialization
        refreshSavedLogos(); // Don't await - load in background

        setIsInitialized(true);
        console.log('✅ User database initialized');

      } catch (error) {
        console.error('❌ User initialization failed:', error);
      }
    };

    initializeUser();
  }, [isSignedIn, user, db, isInitialized, isMigrated]);

  // Refresh saved logos from database
  const refreshSavedLogos = async () => {
    if (!isSignedIn) {
      setSavedLogos([]);
      setIsLoadingLogos(false);
      return;
    }

    setIsLoadingLogos(true);
    try {
      const logos = await db.getSavedLogos();
      setSavedLogos(logos);
    } catch (error) {
      console.error('Failed to refresh saved logos:', error);
    } finally {
      setIsLoadingLogos(false);
    }
  };

  // Refresh user profile
  const refreshUserProfile = async () => {
    if (!isSignedIn) {
      setUserProfile(null);
      return;
    }

    try {
      const profile = await db.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  // Payment and subscription management
  const updateUserSubscription = async (status = 'premium') => {
    try {
      await db.updateSubscription(status);
      await refreshUserProfile(); // Refresh to get updated subscription status
      return { success: true };
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return { success: false, error: error.message };
    }
  };

  // Helper to check if user is premium
  const isPremiumUser = () => {
    return isSignedIn && userProfile?.subscription_status === 'premium';
  };

  // Enhanced logo management functions
  const saveLogoToDB = async (logoData) => {
    try {
      const saveResult = await db.saveLogo(logoData);

      if (saveResult === null) {
        return { success: false, error: 'User not signed in' };
      }

      // Optimistic UI update - immediately add logo to local state
      const optimisticLogo = {
        id: saveResult.logoId || Date.now().toString(), // Use returned ID or fallback
        ...logoData,
        created_at: new Date().toISOString()
      };
      setSavedLogos(prev => [...prev, optimisticLogo]);

      // Track analytics in background (don't await)
      db.trackAnalytics('save', {
        logoId: logoData.id,
        prompt: logoData.prompt
      }).catch(err => console.warn('Analytics tracking failed:', err));

      return { success: true };
    } catch (error) {
      console.error('Failed to save logo:', error);
      // Refresh on error to ensure consistency
      await refreshSavedLogos();
      return { success: false, error: error.message };
    }
  };

  const removeLogoFromDB = async (logoId) => {
    try {
      // Optimistic UI update - immediately remove from local state
      setSavedLogos(prev => prev.filter(logo => logo.id !== logoId));

      await db.removeLogo(logoId);

      // Track analytics in background (don't await)
      db.trackAnalytics('delete', { logoId }).catch(err =>
        console.warn('Analytics tracking failed:', err)
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to remove logo:', error);
      // Refresh on error to ensure consistency
      await refreshSavedLogos();
      return { success: false, error: error.message };
    }
  };

  const clearAllLogosFromDB = async () => {
    try {
      await db.clearAllLogos();
      await refreshSavedLogos();

      // Track analytics
      await db.trackAnalytics('clear_all', { count: savedLogos.length });

      return { success: true };
    } catch (error) {
      console.error('Failed to clear all logos:', error);
      return { success: false, error: error.message };
    }
  };

  // Generation tracking
  const trackLogoGeneration = async (prompt, count = 1, isPremium = false) => {
    if (!isSignedIn) return;

    try {
      await db.trackGeneration(prompt, count, isPremium);
      await db.incrementUsage(count);
      await refreshUserProfile(); // Refresh to get updated usage

      // Track analytics
      await db.trackAnalytics('generate', {
        prompt,
        count,
        isPremium
      });
    } catch (error) {
      console.error('Failed to track generation:', error);
    }
  };

  // Reset state when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      setSavedLogos([]);
      setUserProfile(null);
      setIsInitialized(false);
      setIsMigrated(false);
    }
  }, [isSignedIn]);

  const value = {
    // State
    savedLogos,
    userProfile,
    isInitialized,
    isMigrated,
    isLoading: db.isLoading,
    isLoadingLogos,
    error: db.error,

    // Logo Management
    saveLogoToDB,
    removeLogoFromDB,
    clearAllLogosFromDB,
    refreshSavedLogos,

    // User Management
    refreshUserProfile,
    updateUserSubscription,
    updateSubscription: db.updateSubscription,
    isPremiumUser,

    // Generation Tracking
    trackLogoGeneration,
    getUsageStats: db.getUsageStats,

    // Analytics
    trackAnalytics: db.trackAnalytics,
    getDashboardAnalytics: db.getDashboardAnalytics,

    // Direct database access
    db
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};