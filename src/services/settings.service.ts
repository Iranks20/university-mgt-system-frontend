import api from '@/lib/api';

export interface PerformanceThresholds {
  student: {
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
  lecturer: {
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
  attendance: {
    present: number; // Threshold for "Present" status
    atRisk: number; // Threshold for "At Risk" status
  };
}

// Default thresholds (fallback if API fails)
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  student: {
    excellent: 80,
    good: 70,
    warning: 60,
    critical: 50,
  },
  lecturer: {
    excellent: 90,
    good: 80,
    warning: 70,
    critical: 60,
  },
  attendance: {
    present: 75,
    atRisk: 0,
  },
};

let cachedThresholds: PerformanceThresholds | null = null;
let thresholdsPromise: Promise<PerformanceThresholds> | null = null;

export const settingsService = {
  /**
   * Get performance thresholds from backend API
   * Uses caching to avoid multiple API calls
   */
  getPerformanceThresholds: async (): Promise<PerformanceThresholds> => {
    // Return cached thresholds if available
    if (cachedThresholds) {
      return cachedThresholds;
    }

    // Return existing promise if already fetching
    if (thresholdsPromise) {
      return thresholdsPromise;
    }

    // Fetch thresholds from API
    thresholdsPromise = (async () => {
      try {
        const response = await api.get<PerformanceThresholds | { data: PerformanceThresholds }>('/settings/performance-thresholds');
        const data = (response as { data?: PerformanceThresholds })?.data ?? (response as PerformanceThresholds);
        cachedThresholds = data && typeof data === 'object' && 'attendance' in data ? data : DEFAULT_THRESHOLDS;
        return cachedThresholds;
      } catch (error) {
        console.warn('Error fetching performance thresholds from API, using defaults:', error);
        // Use default thresholds if API fails
        cachedThresholds = DEFAULT_THRESHOLDS;
        return DEFAULT_THRESHOLDS;
      } finally {
        thresholdsPromise = null;
      }
    })();

    return thresholdsPromise;
  },

  /**
   * Clear cached thresholds (useful for testing or when settings are updated)
   */
  clearCache: () => {
    cachedThresholds = null;
    thresholdsPromise = null;
  },

  /**
   * Get default thresholds (for fallback)
   */
  getDefaultThresholds: (): PerformanceThresholds => {
    return DEFAULT_THRESHOLDS;
  },
};
