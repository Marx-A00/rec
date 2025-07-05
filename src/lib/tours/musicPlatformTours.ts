// src/lib/tours/musicPlatformTours.ts

// Welcome onboarding tour
export const welcomeOnboardingTour = {
  tour: 'welcome-onboarding',
  steps: [
    {
      title: 'Welcome to Rec! 🎵',
      content: 'Welcome to your music discovery platform. Let\'s show you around! Use Tab to navigate, Enter to continue, Escape to close.',
      selector: '#test-search-bar',
      position: 'bottom',
      'aria-label': 'Welcome step of onboarding tour',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Search for Music',
      content: 'Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music.',
      selector: '#test-search-bar',
      position: 'bottom',
      'aria-label': 'Search feature explanation',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Build Your Collection',
      content: 'Click here to manage your music collection. Organize your favorite albums into collections.',
      selector: '#test-collections-btn',
      position: 'bottom',
      'aria-label': 'Collection management explanation',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Your Profile',
      content: 'Access your profile and settings from here. Customize your music persona and privacy settings.',
      selector: '#test-profile-menu',
      position: 'bottom',
      'aria-label': 'Profile menu explanation',
      'aria-describedby': 'tour-step-content',
    },
  ],
};

// Navigation basics tour
export const navigationBasicsTour = {
  tour: 'navigation-basics',
  steps: [
    {
      title: 'Navigation Basics',
      content: 'Let\'s learn how to navigate around the platform efficiently. Use keyboard shortcuts for faster navigation.',
      selector: '#test-search-bar',
      position: 'bottom',
      'aria-label': 'Navigation basics introduction',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Search Features',
      content: 'The search bar is your gateway to discovering new music. Search for albums, artists, and users.',
      selector: '#test-search-bar',
      position: 'bottom',
      'aria-label': 'Search functionality explanation',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Collections',
      content: 'Organize your favorite albums into collections. Create themed playlists and share them with others.',
      selector: '#test-collections-btn',
      position: 'bottom',
      'aria-label': 'Collections feature explanation',
      'aria-describedby': 'tour-step-content',
    },
  ],
};

// Collection building tour
export const collectionBuildingTour = {
  tour: 'collection-building',
  steps: [
    {
      title: 'Building Collections',
      content: 'Learn how to build and organize your music collections effectively. Create your musical identity.',
      selector: '#test-collections-btn',
      position: 'bottom',
      'aria-label': 'Collection building introduction',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Find Albums',
      content: 'Search for albums you want to add to your collection. Discover new music through recommendations.',
      selector: '#test-search-bar',
      position: 'bottom',
      'aria-label': 'Album discovery explanation',
      'aria-describedby': 'tour-step-content',
    },
    {
      title: 'Organize Everything',
      content: 'Keep your music organized in your profile. Set up privacy controls and share your taste with the community.',
      selector: '#test-profile-menu',
      position: 'bottom',
      'aria-label': 'Music organization explanation',
      'aria-describedby': 'tour-step-content',
    },
  ],
};

// Export all tours as an array
export const musicPlatformTours = [
  welcomeOnboardingTour,
  navigationBasicsTour,
  collectionBuildingTour,
]; 