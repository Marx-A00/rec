// src/types/tours.ts
export interface MusicPlatformStep {
  id: string;
  title: string;
  content: string;
  selector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: string;
  metadata?: {
    category:
      | 'navigation'
      | 'discovery'
      | 'social'
      | 'collection'
      | 'recommendation'
      | 'profile';
    duration?: number; // Estimated seconds to complete
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    actionRequired?: boolean; // Does user need to perform an action?
    prerequisite?: string[]; // Required elements to be present
  };
  // NextStep specific properties
  nextButton?: {
    text: string;
    action?: () => void;
  };
  prevButton?: {
    text: string;
    action?: () => void;
  };
  skipButton?: {
    text: string;
    action?: () => void;
  };
  waitForElement?: string; // Wait for element to be present before showing step
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: string;
  };
}

export interface MusicPlatformTour {
  tour: string;
  title: string;
  description: string;
  steps: MusicPlatformStep[];
  metadata: {
    category:
      | 'onboarding'
      | 'feature-discovery'
      | 'advanced'
      | 'social'
      | 'collection';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number; // Total time in minutes
    targetUser: 'new' | 'returning' | 'power' | 'all';
    prerequisites?: string[]; // Required tours or features
    triggers?: {
      onFirstVisit?: boolean;
      onFeatureAccess?: string[];
      onUserAction?: string[];
      afterDays?: number;
    };
  };
  // Tour-level configuration
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
  };
  accessibility?: {
    announceSteps: boolean;
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
  };
}

// Tour recommendation system types
export interface TourRecommendation {
  tourId: string;
  priority: number; // 1-10, higher = more important
  reason:
    | 'first_visit'
    | 'feature_usage'
    | 'user_behavior'
    | 'time_based'
    | 'incomplete_tour';
  context?: {
    userActivity?: string[];
    sessionData?: Record<string, any>;
    previousTours?: string[];
  };
}

export interface TourRecommendationEngine {
  getRecommendedTours: (
    userId?: string,
    context?: any
  ) => Promise<TourRecommendation[]>;
  trackTourCompletion: (
    userId: string,
    tourId: string,
    completed: boolean
  ) => void;
  trackUserActivity: (
    userId: string,
    activity: string,
    metadata?: Record<string, any>
  ) => void;
  updateUserPreferences: (userId: string, preferences: any) => void;
}

// Tour progress and analytics
export interface TourProgress {
  tourId: string;
  userId?: string;
  startedAt: Date;
  completedAt?: Date;
  skippedAt?: Date;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  timeSpent: number; // in seconds
  interactions: {
    stepId: string;
    action: 'view' | 'next' | 'prev' | 'skip' | 'complete';
    timestamp: Date;
    metadata?: Record<string, any>;
  }[];
}

// Smart tour selector types
export interface UserContext {
  isFirstVisit: boolean;
  hasCompletedOnboarding: boolean;
  profileCompleteness: number; // 0-100%
  collectionSize: number;
  recommendationsMade: number;
  socialConnections: number;
  lastActiveDate: Date;
  preferredFeatures: string[];
  skipRequestedTours: string[];
  completedTours: string[];
}

export interface TourTrigger {
  type:
    | 'page_visit'
    | 'feature_access'
    | 'user_action'
    | 'time_based'
    | 'onboarding_incomplete';
  value: string | number;
  metadata?: Record<string, any>;
}

// Category definitions for step organization
export type StepCategory =
  | 'navigation' // Sidebar, search, basic navigation
  | 'discovery' // Browse, find new music/users
  | 'collection' // Adding albums, managing collection
  | 'recommendation' // Creating and sharing recommendations
  | 'social' // Following, social feed, community
  | 'profile'; // Profile setup, settings, personalization

export type TourCategory =
  | 'onboarding' // First-time user experience
  | 'feature-discovery' // Learn about specific features
  | 'advanced' // Power user features
  | 'social' // Community and social features
  | 'collection'; // Collection management focus

// Tour configuration constants
export const TOUR_THEMES = {
  default: {
    primaryColor: '#f5f5dc', // cosmic-latte
    backgroundColor: '#18181b', // zinc-900
    textColor: '#ffffff',
    borderRadius: '8px',
  },
  music: {
    primaryColor: '#10b981', // emerald-500 (emeraled-green)
    backgroundColor: '#1f2937', // gray-800
    textColor: '#f9fafb',
    borderRadius: '12px',
  },
  social: {
    primaryColor: '#6366f1', // indigo-500
    backgroundColor: '#1e1b4b', // indigo-900
    textColor: '#e0e7ff',
    borderRadius: '16px',
  },
} as const;
