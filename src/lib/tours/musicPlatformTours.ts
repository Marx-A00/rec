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
 * - side: 'top' | 'bottom' | 'left' | 'right'
 * - showControls: Enable Next/Previous buttons
 * - showSkip: Enable Skip button
 * 
 * POSITIONING GUIDELINES:
 * - 'bottom': Card appears below target (best for top elements like headers)
 * - 'top': Card appears above target (best for bottom elements like footers)
 * - 'right': Card appears to the right (best for left-side elements)
 * - 'left': Card appears to the left (best for right-side elements)
 * 
 * RESPONSIVE POSITIONING TIPS:
 * - Use 'bottom' for header elements (search bar, nav)
 * - Use 'right' for left-side elements (avatar, sidebar items)
 * - Use 'left' for right-side elements (buttons, menus)
 * - Avoid 'top' positioning on mobile (can go above screen)
 */

/**
 * Positioning Helper Function
 * Use this to determine the best side based on element position
 */
export function getBestPositioning(elementSelector: string): 'top' | 'bottom' | 'left' | 'right' {
  if (typeof window === 'undefined') return 'bottom';
  
  const element = document.querySelector(elementSelector);
  if (!element) return 'bottom';
  
  const rect = element.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  
  // Determine best position based on element location
  const isInTopHalf = rect.top < viewport.height / 2;
  const isInLeftHalf = rect.left < viewport.width / 2;
  
  // Priority: bottom > right > left > top (top can go off-screen on mobile)
  if (isInTopHalf && rect.bottom + 200 < viewport.height) {
    return 'bottom'; // Plenty of space below
  } else if (isInLeftHalf && rect.right + 300 < viewport.width) {
    return 'right'; // Space to the right
  } else if (!isInLeftHalf && rect.left - 300 > 0) {
    return 'left'; // Space to the left
  } else if (!isInTopHalf) {
    return 'top'; // Last resort: above
  }
  
  return 'bottom'; // Default fallback
}

// Welcome onboarding tour - First-time user experience
export const welcomeOnboardingTour = {
  tour: 'welcome-onboarding',
  steps: [
    {
      icon: '🎵',
      title: 'Welcome to Rec!',
      content: 'Discover amazing music through community recommendations. Let\'s show you how it works!',
      selector: 'body', // Portal will handle positioning
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🎤',
      title: 'Share Your Music Taste',
      content: 'Click this button to create your first recommendation! Share albums you love and discover what others are listening to.',
      selector: '#create-recommendation-button',
      side: 'right' as const, // Show to the right of the button
      showControls: true,
      showSkip: true,
    },
    {
      icon: '✨',
      title: 'Create Your First Recommendation',
      content: 'Great! Now you can search for an album and add your personal recommendation. This is how you share your music taste with the community.',
      selector: '#recommendation-drawer', // Target the drawer itself
      side: 'right' as const, // Show to the right inside the drawer
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🎯',
      title: 'Demo Recommendation',
      content: 'check this shit out cuh',
      selector: '#recommendation-search-input', // Target the search input again
      side: 'top' as const, // Show above the search bar so it doesn't block results below
      showControls: true,
      showSkip: true,
    },
    {
      icon: '⭐',
      title: 'Rate the Similarity',
      content: 'Use the rating dial to score how similar the albums are! Drag the dial or click to set a rating from 1-10. This helps other users understand your recommendation.',
      selector: '#similarity-rating-dial', // Target the rating component
      side: 'left' as const, // Show to the left of the rating dial
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🚀',
      title: 'Submit Your Recommendation',
      content: 'Hit this green button cuh',
      selector: '#submit-recommendation-button', // Target the submit button
      side: 'left' as const, // Show above the submit button
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🌟',
      title: 'Discover New Music',
      content: 'Amazing! Now that you know how to recommend music, explore what others are sharing. Click Next to go to the Browse & Discover page!',
      selector: '#discover-nav-button', // Target the discover nav button
      side: 'right' as const, // Show to the right of the nav button
      showControls: true,
      showSkip: true,
      nextRoute: '/browse', // Navigate to browse page when Next is clicked
    },
    {
      icon: '🎵',
      title: 'Welcome to Discovery',
      content: 'Perfect! This is where the magic happens. Browse through trending albums, discover new artists, and explore recommendations from other music lovers. Everything is organized to help you find your next favorite album!',
      selector: '#browse-page-header', // Target the browse page header - NextStep will wait for it to appear
      side: 'bottom' as const, // Show below the header
      showControls: true,
      showSkip: true,
      prevRoute: '/', // Navigate back to home when Previous is clicked
    },
    {
      icon: '🔍', 
      title: 'Search for Music',
      content: 'Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music.',
      selector: '#main-search-bar',
      side: 'bottom' as const, // Show below search bar (safer positioning)
      showControls: true,
      showSkip: true,
    },
    {
      icon: '📚',
      title: 'Build Your Collection',
      content: 'This is your personal collection section. Here you can organize your favorite albums and tracks.',
      selector: '#collections-section',
      side: 'bottom' as const, // Show to the right of collections (better for mobile)
      showControls: true,
      showSkip: true,
    },
    {
      icon: '👤',
      title: 'Your Profile',
      content: 'Click your avatar to access your profile and customize your music experience.',
      selector: '#user-profile-menu',
      side: 'bottom' as const, // Show below avatar (safe for top-left element)
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
      selector: '#main-search-bar',
      side: 'bottom' as const,
      showControls: true,
      showSkip: true,
    },
    {
      icon: '🔍',
      title: 'Advanced Search',
      content: 'Discover advanced search features and filters to find exactly what you\'re looking for.',
      selector: '#main-search-bar',
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
      content: 'Learn how to create and manage your music collections to organize your favorite albums.',
      selector: '#collections-section',
      side: 'right' as const, // Better positioning for collection section
      showControls: true,
      showSkip: true,
    },
    {
      icon: '⭐',
      title: 'Rating System',
      content: 'Rate your favorite albums and tracks to build a personalized music profile.',
      selector: '#collections-section',
      side: 'bottom' as const, // Show below for second step
      showControls: true,
      showSkip: true,
    },
  ],
};

// Discovery page tour - Simple single-step tour for browse page
export const discoveryPageTour = {
  tour: 'discovery-page',
  steps: [
    {
      icon: '🎵',
      title: 'Welcome to Discovery',
      content: 'Perfect! This is where the magic happens. Browse through trending albums, discover new artists, and explore recommendations from other music lovers. Everything is organized to help you find your next favorite album!',
      selector: '#browse-page-header',
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
  discoveryPageTour,
]; 