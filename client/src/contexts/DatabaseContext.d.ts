export interface DatabaseContextType {
  savedLogos: any[]
  userProfile: any
  isInitialized: boolean
  isMigrated: boolean
  isLoading: boolean
  isLoadingLogos: boolean
  error: any
  saveLogoToDB: (logoData: any) => Promise<any>
  removeLogoFromDB: (id: string) => Promise<any>
  clearAllLogosFromDB: () => Promise<any>
  refreshSavedLogos: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  updateUserSubscription: (status?: string) => Promise<any>
  updateSubscription: (data: any) => Promise<any>
  isPremiumUser: () => boolean
  trackLogoGeneration: (prompt: string, count?: number, isPremium?: boolean) => Promise<void>
  getUsageStats: () => Promise<any>
  trackAnalytics: (event: string, data: any) => Promise<void>
  getDashboardAnalytics: () => Promise<any>
  db: any
}

export function useDbContext(): DatabaseContextType
export const DatabaseProvider: React.ComponentType<{ children: React.ReactNode }>