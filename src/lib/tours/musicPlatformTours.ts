// src/lib/tours/musicPlatformTours.ts

/**
 * Music Platform Tours Configuration
 * 
 * This file contains all tour definitions for the music platform.
 * Each tour is an object with a unique ID and array of steps.
 * 
 * To add a new tour:
 * 1. Create a new tour object with unique 'tour' ID
 * 2. Add steps array with proper selectors
 * 3. Add to musicPlatformTours export array
 * 
 * Step Properties:
 * - icon: Emoji or icon
 * - title: Step title
 * - content: Description text
 * - selector: CSS selector for target element
 * - position: 'top' | 'bottom' | 'left' | 'right'
 * - side: Same as position
 * - showControls: Enable Next/Previous buttons
 * - showSkip: Enable Skip button
 */

// Welcome onboarding tour - First-time user experience
export const welcomeOnboardingTour = {
  tour: 'welcome-onboarding',
  steps: [
    {
      icon: '🎵',
      title: 'Welcome to Rec!',
      content: 'Welcome to your music discovery platform. Let\'s show you around!',
      selector: '#test-search-bar',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🔍', 
      title: 'Search for Music',
      content: 'Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music.',
      selector: '#test-search-bar',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '📚',
      title: 'Build Your Collection',
      content: 'Click here to manage your music collection. Organize your favorite albums and tracks.',
      selector: '#test-collections-btn',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '👤',
      title: 'Your Profile',
      content: 'Access your profile and customize your music experience.',
      selector: '#test-profile-menu',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
  ],
};

// Navigation basics tour - Essential navigation features
export const navigationBasicsTour = {
  tour: 'navigation-basics',
  steps: [
    {
      icon: '🧭',
      title: 'Navigation Basics',
      content: 'Learn how to navigate around the platform efficiently.',
      selector: '#test-search-bar',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🔍',
      title: 'Advanced Search',
      content: 'Discover advanced search features and filters.',
      selector: '#test-search-bar',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
  ],
};

// Collection building tour - How to manage collections
export const collectionBuildingTour = {
  tour: 'collection-building',
  steps: [
    {
      icon: '📚',
      title: 'Building Collections',
      content: 'Learn how to create and manage your music collections.',
      selector: '#test-collections-btn',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '⭐',
      title: 'Rating System',
      content: 'Rate your favorite albums and tracks.',
      selector: '#test-collections-btn',
      position: 'bottom' as const,
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
  ],
};

/**
 * Export all tours as an array
 * 
 * This array is used by the NextStep component to load all available tours.
 * Add new tours to this array after defining them above.
 */
export const musicPlatformTours = [
  welcomeOnboardingTour,
  navigationBasicsTour,
  collectionBuildingTour,
]; 