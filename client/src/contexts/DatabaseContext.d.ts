// Logo type for saved logos
export interface SavedLogo {
  id: string
  url: string
  prompt?: string
  is_premium?: boolean
  file_format?: string
  created_at?: string
}

// User profile from database
export interface UserProfile {
  id: string
  clerk_user_id: string
  email?: string
  subscription_status: 'free' | 'premium'
  credits_used: number
  credits_limit: number
  created_at?: string
}

// API result type
export interface ApiResult {
  success: boolean
  error?: string
  [key: string]: unknown
}

// Database context type definitions
export interface DatabaseContextType {
  savedLogos: SavedLogo[]
  userProfile: UserProfile | null
  isInitialized: boolean
  isMigrated: boolean
  isLoading: boolean
  isLoadingLogos: boolean
  error: Error | null
  saveLogoToDB: (logoData: Omit<SavedLogo, 'id' | 'created_at'>) => Promise<ApiResult>
  removeLogoFromDB: (id: string) => Promise<ApiResult>
  clearAllLogosFromDB: () => Promise<ApiResult>
  refreshSavedLogos: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  updateUserSubscription: (status?: string) => Promise<ApiResult>
  updateSubscription: (data: { status: string }) => Promise<ApiResult>
  isPremiumUser: () => boolean
  trackLogoGeneration: (prompt: string, count?: number, isPremium?: boolean) => Promise<void>
  getUsageStats: () => Promise<{ credits_used: number; credits_limit: number; subscription_status: string }>
  trackAnalytics: (event: string, data: Record<string, unknown>) => Promise<void>
  getDashboardAnalytics: () => Promise<{ events: Array<{ action: string; count: number }> }>
  db: null // Database client not exposed directly
}

export function useDbContext(): DatabaseContextType
export const DatabaseProvider: React.ComponentType<{ children: React.ReactNode }>
