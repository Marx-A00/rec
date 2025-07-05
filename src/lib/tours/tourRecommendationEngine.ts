// src/lib/tours/tourRecommendationEngine.ts
import { 
  TourRecommendation, 
  TourRecommendationEngine, 
  UserContext, 
  TourTrigger,
  TourProgress 
} from '@/types/tours';
import { musicPlatformTours } from './musicPlatformTours';

export class SmartTourRecommendationEngine implements TourRecommendationEngine {
  private userProfiles: Map<string, UserContext> = new Map();
  private tourProgress: Map<string, TourProgress[]> = new Map();
  private userActivity: Map<string, Array<{ activity: string; timestamp: Date; metadata?: any }>> = new Map();

  /**
   * Get recommended tours based on user context and behavior
   */
  async getRecommendedTours(userId?: string, context?: any): Promise<TourRecommendation[]> {
    const userContext = userId ? this.getUserContext(userId) : this.createDefaultContext(context);
    const recommendations: TourRecommendation[] = [];

    // 1. First-time user onboarding (highest priority)
    if (userContext.isFirstVisit && !userContext.hasCompletedOnboarding) {
      recommendations.push({
        tourId: 'welcome-onboarding',
        priority: 10,
        reason: 'first_visit',
        context: { userActivity: ['first_visit'] },
      });
    }

    // 2. Navigation basics for new users who seem lost
    if (this.userNeedsNavigationHelp(userContext, userId)) {
      recommendations.push({
        tourId: 'navigation-basics',
        priority: 9,
        reason: 'user_behavior',
        context: { userActivity: this.getRecentActivity(userId, ['search_failed', 'page_confusion']).map(a => a.activity) },
      });
    }

    // 3. Collection building for users discovering albums
    if (this.shouldRecommendCollectionTour(userContext, userId)) {
      recommendations.push({
        tourId: 'collection-building',
        priority: 8,
        reason: 'feature_usage',
        context: { userActivity: this.getRecentActivity(userId, ['album_view', 'browse_albums']).map(a => a.activity) },
      });
    }

    // 4. Recommendation system for engaged users
    if (this.shouldRecommendRecommendationTour(userContext, userId)) {
      recommendations.push({
        tourId: 'recommendation-system',
        priority: 7,
        reason: 'user_behavior',
        context: { userActivity: this.getRecentActivity(userId, ['album_interest', 'collection_growth']).map(a => a.activity) },
      });
    }

    // 5. Social features for users with collections
    if (this.shouldRecommendSocialTour(userContext, userId)) {
      recommendations.push({
        tourId: 'social-features',
        priority: 6,
        reason: 'time_based',
        context: { 
          userActivity: this.getRecentActivity(userId, ['profile_view', 'user_discovery']).map(a => a.activity),
          sessionData: { daysSinceRegistration: this.getDaysSinceRegistration(userId) },
        },
      });
    }

    // 6. Discovery browse for users ready to explore
    if (this.shouldRecommendDiscoveryTour(userContext, userId)) {
      recommendations.push({
        tourId: 'discovery-browse',
        priority: 5,
        reason: 'feature_usage',
        context: { userActivity: this.getRecentActivity(userId, ['browse_access', 'search_usage']).map(a => a.activity) },
      });
    }

    // 7. Profile setup for established users
    if (this.shouldRecommendProfileTour(userContext, userId)) {
      recommendations.push({
        tourId: 'profile-setup',
        priority: 4,
        reason: 'user_behavior',
        context: { 
          userActivity: this.getRecentActivity(userId, ['profile_incomplete']).map(a => a.activity),
          sessionData: { profileCompleteness: userContext.profileCompleteness },
        },
      });
    }

    // 8. Incomplete tours (medium priority)
    const incompleteTours = this.getIncompleteTours(userId);
    incompleteTours.forEach(tourId => {
      if (!recommendations.find(r => r.tourId === tourId)) {
        recommendations.push({
          tourId,
          priority: 3,
          reason: 'incomplete_tour',
          context: { previousTours: userContext.completedTours },
        });
      }
    });

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3); // Limit to top 3 recommendations
  }

  /**
   * Track tour completion
   */
  trackTourCompletion(userId: string, tourId: string, completed: boolean): void {
    const userContext = this.getUserContext(userId);
    
    if (completed) {
      if (!userContext.completedTours.includes(tourId)) {
        userContext.completedTours.push(tourId);
      }
      
      // Special handling for onboarding completion
      if (tourId === 'welcome-onboarding') {
        userContext.hasCompletedOnboarding = true;
      }
    } else {
      // Track skipped/incomplete tours
      if (!userContext.skipRequestedTours.includes(tourId)) {
        userContext.skipRequestedTours.push(tourId);
      }
    }

    this.userProfiles.set(userId, userContext);
  }

  /**
   * Track user activity for smarter recommendations
   */
  trackUserActivity(userId: string, activity: string, metadata?: Record<string, any>): void {
    const activities = this.userActivity.get(userId) || [];
    activities.push({
      activity,
      timestamp: new Date(),
      metadata,
    });

    // Keep only last 50 activities to prevent memory bloat
    if (activities.length > 50) {
      activities.splice(0, activities.length - 50);
    }

    this.userActivity.set(userId, activities);

    // Update user context based on activity
    this.updateUserContextFromActivity(userId, activity, metadata);
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: any): void {
    const userContext = this.getUserContext(userId);
    userContext.preferredFeatures = preferences.preferredFeatures || userContext.preferredFeatures;
    userContext.skipRequestedTours = preferences.skipRequestedTours || userContext.skipRequestedTours;
    this.userProfiles.set(userId, userContext);
  }

  /**
   * Get user context or create default
   */
  private getUserContext(userId: string): UserContext {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, this.createDefaultUserContext());
    }
    return this.userProfiles.get(userId)!;
  }

  /**
   * Create default user context
   */
  private createDefaultUserContext(): UserContext {
    return {
      isFirstVisit: true,
      hasCompletedOnboarding: false,
      profileCompleteness: 0,
      collectionSize: 0,
      recommendationsMade: 0,
      socialConnections: 0,
      lastActiveDate: new Date(),
      preferredFeatures: [],
      skipRequestedTours: [],
      completedTours: [],
    };
  }

  /**
   * Create context from provided data
   */
  private createDefaultContext(context?: any): UserContext {
    const defaultContext = this.createDefaultUserContext();
    if (context) {
      return { ...defaultContext, ...context };
    }
    return defaultContext;
  }

  /**
   * Check if user needs navigation help
   */
  private userNeedsNavigationHelp(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('navigation-basics')) return false;
    
    const recentActivity = this.getRecentActivity(userId, ['search_failed', 'page_confusion', 'navigation_struggle']);
    return recentActivity.length >= 2 || !userContext.hasCompletedOnboarding;
  }

  /**
   * Check if user should see collection tour
   */
  private shouldRecommendCollectionTour(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('collection-building')) return false;
    
    const albumViews = this.getRecentActivity(userId, ['album_view', 'browse_albums']);
    return albumViews.length >= 3 && userContext.collectionSize < 5;
  }

  /**
   * Check if user should see recommendation tour
   */
  private shouldRecommendRecommendationTour(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('recommendation-system')) return false;
    
    return userContext.collectionSize >= 3 && userContext.recommendationsMade === 0;
  }

  /**
   * Check if user should see social tour
   */
  private shouldRecommendSocialTour(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('social-features')) return false;
    
    const daysSinceRegistration = this.getDaysSinceRegistration(userId);
    return daysSinceRegistration >= 3 && userContext.socialConnections === 0 && userContext.recommendationsMade >= 1;
  }

  /**
   * Check if user should see discovery tour
   */
  private shouldRecommendDiscoveryTour(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('discovery-browse')) return false;
    
    const browseActivity = this.getRecentActivity(userId, ['browse_access']);
    return browseActivity.length >= 2 || userContext.preferredFeatures.includes('discovery');
  }

  /**
   * Check if user should see profile tour
   */
  private shouldRecommendProfileTour(userContext: UserContext, userId?: string): boolean {
    if (userContext.completedTours.includes('profile-setup')) return false;
    
    return userContext.profileCompleteness < 50 && userContext.collectionSize >= 5;
  }

  /**
   * Get recent user activity by type
   */
  private getRecentActivity(userId?: string, activityTypes?: string[]): Array<{ activity: string; timestamp: Date; metadata?: any }> {
    if (!userId) return [];
    
    const activities = this.userActivity.get(userId) || [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return activities
      .filter(a => a.timestamp > oneDayAgo)
      .filter(a => !activityTypes || activityTypes.includes(a.activity));
  }

  /**
   * Get incomplete tours for user
   */
  private getIncompleteTours(userId?: string): string[] {
    if (!userId) return [];
    
    const userProgress = this.tourProgress.get(userId) || [];
    return userProgress
      .filter(progress => !progress.completedAt && !progress.skippedAt)
      .map(progress => progress.tourId);
  }

  /**
   * Update user context based on activity
   */
  private updateUserContextFromActivity(userId: string, activity: string, metadata?: any): void {
    const userContext = this.getUserContext(userId);

    switch (activity) {
      case 'first_visit':
        userContext.isFirstVisit = true;
        break;
      case 'album_added_to_collection':
        userContext.collectionSize++;
        break;
      case 'recommendation_created':
        userContext.recommendationsMade++;
        break;
      case 'user_followed':
        userContext.socialConnections++;
        break;
      case 'profile_updated':
        userContext.profileCompleteness = Math.min(100, userContext.profileCompleteness + 20);
        break;
      case 'onboarding_completed':
        userContext.hasCompletedOnboarding = true;
        userContext.isFirstVisit = false;
        break;
    }

    userContext.lastActiveDate = new Date();
    this.userProfiles.set(userId, userContext);
  }

  /**
   * Get days since user registration
   */
  private getDaysSinceRegistration(userId?: string): number {
    if (!userId) return 0;
    
    const userContext = this.getUserContext(userId);
    const now = new Date();
    const registrationDate = userContext.lastActiveDate; // Simplified - would be actual registration date
    return Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Singleton instance
export const tourRecommendationEngine = new SmartTourRecommendationEngine();

// Helper functions for easy usage
export const getTourRecommendations = (userId?: string, context?: any) => {
  return tourRecommendationEngine.getRecommendedTours(userId, context);
};

export const trackTourCompletion = (userId: string, tourId: string, completed: boolean) => {
  tourRecommendationEngine.trackTourCompletion(userId, tourId, completed);
};

export const trackUserActivity = (userId: string, activity: string, metadata?: any) => {
  tourRecommendationEngine.trackUserActivity(userId, activity, metadata);
};

// Activity type constants for consistent tracking
export const ACTIVITY_TYPES = {
  // Navigation
  FIRST_VISIT: 'first_visit',
  SEARCH_USED: 'search_used',
  SEARCH_FAILED: 'search_failed',
  PAGE_CONFUSION: 'page_confusion',
  NAVIGATION_STRUGGLE: 'navigation_struggle',
  
  // Discovery
  ALBUM_VIEW: 'album_view',
  BROWSE_ALBUMS: 'browse_albums',
  BROWSE_ACCESS: 'browse_access',
  ARTIST_VIEW: 'artist_view',
  
  // Collection
  ALBUM_ADDED_TO_COLLECTION: 'album_added_to_collection',
  COLLECTION_CREATED: 'collection_created',
  COLLECTION_VIEWED: 'collection_viewed',
  
  // Recommendations
  RECOMMENDATION_CREATED: 'recommendation_created',
  RECOMMENDATION_VIEWED: 'recommendation_viewed',
  ALBUM_INTEREST: 'album_interest',
  
  // Social
  USER_FOLLOWED: 'user_followed',
  PROFILE_VIEW: 'profile_view',
  USER_DISCOVERY: 'user_discovery',
  SOCIAL_FEED_VIEW: 'social_feed_view',
  
  // Profile
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  SETTINGS_ACCESS: 'settings_access',
  
  // Tours
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TOUR_SKIPPED: 'tour_skipped',
  TOUR_COMPLETED: 'tour_completed',
} as const; 