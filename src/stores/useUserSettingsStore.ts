import { create } from 'zustand';

// Mirror of UserSettings from GraphQL schema
interface UserSettings {
  id: string;
  userId: string;

  // Dashboard customization
  dashboardLayout?: Record<string, unknown> | null;

  // Display preferences
  theme: string;
  language: string;

  // Privacy settings
  profileVisibility: string;
  showRecentActivity: boolean;
  showCollections: boolean;
  showListenLaterInFeed: boolean;
  showCollectionAddsInFeed: boolean;

  // Onboarding
  showOnboardingTour: boolean;

  // Notification preferences
  emailNotifications: boolean;
  recommendationAlerts: boolean;
  followAlerts: boolean;

  // Music preferences
  defaultCollectionView: string;
  autoplayPreviews: boolean;

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UserSettingsState {
  // The current user settings (null if not loaded)
  settings: UserSettings | null;

  // Loading state
  isLoading: boolean;

  // Actions
  setSettings: (settings: UserSettings) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  clearSettings: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(set => ({
  settings: null,
  isLoading: false,

  setSettings: settings => set({ settings, isLoading: false }),

  updateSettings: partial =>
    set(state => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
    })),

  clearSettings: () => set({ settings: null, isLoading: false }),

  setLoading: loading => set({ isLoading: loading }),
}));
