import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/apiServices';

/**
 * Hook to automatically refresh user profile data
 * DISABLED by default to prevent rate limiting issues
 * Only use this hook when you specifically need auto-refresh functionality
 */
export function useRefreshUser(enabled: boolean = false, interval: number = 60000) {
  const { updateUser, isAuthenticated } = useAuth();
  const lastRefreshTime = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || !enabled) return;

    // Prevent refresh if less than 10 seconds since last refresh
    const now = Date.now();
    if (now - lastRefreshTime.current < 10000) {
      console.log('⏭️ Skipping refresh - too soon since last refresh');
      return;
    }

    try {
      lastRefreshTime.current = now;
      const response = await ApiService.getProfile();
      
      if (response.success && (response.data || response.user)) {
        const userData = response.data || response.user;
        
        // Parse interests safely
        let parsedInterests: string[] = [];
        if (Array.isArray(userData.interests)) {
          parsedInterests = userData.interests;
        } else if (typeof userData.interests === 'string' && userData.interests.trim()) {
          try {
            const parsed = JSON.parse(userData.interests);
            parsedInterests = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedInterests = [];
          }
        }

        // Update user with fresh data
        updateUser({
          ...userData,
          interests: parsedInterests,
        });

        console.log('✅ User profile refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, [isAuthenticated, updateUser, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Refresh on mount (with delay to avoid conflicts with initial auth load)
    refreshTimeoutRef.current = setTimeout(() => {
      refreshProfile();
    }, 2000); // Wait 2 seconds before first refresh

    // Set up interval for periodic refresh
    const intervalId = setInterval(refreshProfile, interval);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      clearInterval(intervalId);
    };
  }, [refreshProfile, interval, enabled]);

  // Return the refresh function so it can be called manually
  return { refreshProfile };
}

/**
 * Usage examples:
 * 
 * // RECOMMENDED: Don't use auto-refresh (default)
 * const { refreshProfile } = useRefreshUser();
 * // Call refreshProfile() manually when needed
 * 
 * // Enable auto-refresh every 60 seconds (use sparingly!)
 * useRefreshUser(true, 60000);
 * 
 * // Manual refresh only (best practice)
 * const { refreshProfile } = useRefreshUser(false);
 * // Call refreshProfile() after updates
 */