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
      // Add a custom delay to help with detection
      blockKeyboardControl: false,
    },
    {
      icon: '🔍', 
      title: 'Search for Music',
      content: 'Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music. Click Next and I\'ll show you by searching for the legendary electronic duo Daft Punk!',
      selector: '#main-search-bar, [cmdk-input], input[placeholder*="Search albums"], .cmdk-input',
      side: 'bottom' as const, // Show below search bar (safer positioning)
      showControls: true,
      showSkip: true,
      // TourStateManager will handle dynamic navigation to Daft Punk artist page
    },
    {
      icon: '🤖',
      title: 'Welcome to Artist Pages',
      content: 'Fantastic! This is an artist page where you can explore everything about an artist. Here you can see their biography, discography, collaborations, and discover similar artists. This is where you dive deep into an artist\'s world!',
      selector: '#artist-page-header', // Target the artist page header
      side: 'bottom' as const, // Show below the header
      showControls: true,
      showSkip: true,
      prevRoute: '/browse', // Navigate back to browse when Previous is clicked
    },
    {
      icon: '💿',
      title: 'Explore Albums',
      content: 'Now let\'s explore Daft Punk\'s legendary discography! I\'ll show you how to interact with albums. Click Next and I\'ll demonstrate by opening the iconic "Random Access Memories" album details.',
      selector: '#artist-discography, .artist-albums, [data-testid="artist-albums"]', // Target the discography section
      side: 'bottom' as const, // Show below the discography
      showControls: true,
      showSkip: true,
      nextRoute: '/albums/556257', // Navigate to Random Access Memories album page
      // Custom card will handle finding and clicking Random Access Memories
    },
    {
      icon: '🎵',
      title: 'Album Details & Interactions',
      content: 'Perfect! This is a dedicated album page where you can explore everything about this album. Here you can see detailed information, track listings, reviews, add to your collection, and discover what others are saying about it. These interactions are the heart of music discovery!',
      selector: 'h1, .text-3xl, .album-header, main', // Target the album page header or main content
      side: 'bottom' as const, // Show below the album header
      showControls: true,
      showSkip: true,
      // This step appears on the album page after navigation from artist page
    },
    {
      icon: '👤',
      title: 'Explore Your Profile',
      content: 'Now let\'s explore your personal music profile! This is where you can showcase your music taste, connect with other music lovers, and track your listening journey. Click Next and I\'ll take you to your profile page.',
      selector: 'nav, .sidebar, aside, header', // Target navigation elements that exist on album page
      side: 'bottom' as const, // Show below navigation
      showControls: true,
      showSkip: true,
      nextRoute: '/profile', // Navigate to user's profile page when Next is clicked
    },
    {
      icon: '✨',
      title: 'Welcome to Your Profile!',
      content: 'Amazing! This is your personal music profile page. Here you can see your recommendations, followers, music stats, create collages, manage your collections, and showcase your unique music taste to the community. This is your musical identity hub!',
      selector: 'h1.text-4xl.font-bold.mb-2, .text-4xl.font-bold, h1', // Target the user's name heading which is stable
      side: 'bottom' as const, // Show below the user's name for stable positioning
      showControls: true,
      showSkip: true,
      // This is the final step of the tour
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
]; 