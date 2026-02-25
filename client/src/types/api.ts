// Types for API responses
export interface ApiResult {
  success: boolean
  error?: string
  [key: string]: unknown
}

export interface ApiError {
  message?: string
  [key: string]: unknown
}

// Extend Window for debug utilities
declare global {
  interface Window {
    debugUsageLimits?: {
      setAnonymousUsage: (count: number) => void
      setSignedInUsage: (count: number) => void
      recheckUsage: () => void
      resetUsage: () => void
      showCurrentState: () => void
    }
    gtag?: (...args: unknown[]) => void
  }
}
