import { Config, DriveStep } from 'driver.js';
import { driver } from 'driver.js';

/**
 * Driver.js Tour Configuration
 *
 * All 14 tour steps from the original welcomeOnboardingTour,
 * preserving exact content, icons, and navigation flow.
 */

export const tourSteps: DriveStep[] = [
  {
    element: 'body',
    popover: {
      title: '🎵 Welcome to Rec!',
      description: "Discover amazing music through community recommendations. Let's show you how it works!",
      side: 'over', // Center overlay for welcome modal
      align: 'center'
    }
  },
  {
    element: '#create-recommendation-button',
    popover: {
      title: '🎤 Share Your Music Taste',
      description: 'Click this button to create your first recommendation! Share albums you love and discover what others are listening to.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '#recommendation-drawer',
    popover: {
      title: '✨ Create Your First Recommendation',
      description: 'Great! Now you can search for an album and add your personal recommendation. This is how you share your music taste with the community.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '#recommendation-search-input',
    popover: {
      title: '🎯 Demo Recommendation',
      description: 'check this shit out cuh',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#similarity-rating-dial',
    popover: {
      title: '⭐ Rate the Similarity',
      description: 'Use the rating dial to score how similar the albums are! Drag the dial or click to set a rating from 1-10. This helps other users understand your recommendation.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '#submit-recommendation-button',
    popover: {
      title: '🚀 Submit Your Recommendation',
      description: 'Hit this green button cuh',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '#discover-nav-button',
    popover: {
      title: '🌟 Discover New Music',
      description: 'Amazing! Now that you know how to recommend music, explore what others are sharing. Click Next to go to the Browse & Discover page!',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '#browse-page-header',
    popover: {
      title: '🎵 Welcome to Discovery',
      description: 'Perfect! This is where the magic happens. Browse through trending albums, discover new artists, and explore recommendations from other music lovers. Everything is organized to help you find your next favorite album!',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#main-search-bar',
    popover: {
      title: '🔍 Search for Music',
      description: "Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music. Click Next and I'll show you by searching for the legendary electronic duo Daft Punk!",
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '#artist-page-header',
    popover: {
      title: '🤖 Welcome to Artist Pages',
      description: "Fantastic! This is an artist page where you can explore everything about an artist. Here you can see their biography, discography, collaborations, and discover similar artists. This is where you dive deep into an artist's world!",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#artist-discography',
    popover: {
      title: '💿 Explore Albums',
      description: "Now let's explore Daft Punk's legendary discography! I'll show you how to interact with albums. Click Next and I'll demonstrate by opening the iconic \"Random Access Memories\" album details.",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: 'h1',
    popover: {
      title: '🎵 Album Details & Interactions',
      description: 'Perfect! This is a dedicated album page where you can explore everything about this album. Here you can see detailed information, track listings, reviews, add to your collection, and discover what others are saying about it. These interactions are the heart of music discovery!',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: 'nav',
    popover: {
      title: '👤 Explore Your Profile',
      description: "Now let's explore your personal music profile! This is where you can showcase your music taste, connect with other music lovers, and track your listening journey. Click Next and I'll take you to your profile page.",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: 'h1',
    popover: {
      title: '✨ Welcome to Your Profile!',
      description: 'Amazing! This is your personal music profile page. Here you can see your recommendations, followers, music stats, create collages, manage your collections, and showcase your unique music taste to the community. This is your musical identity hub!',
      side: 'bottom',
      align: 'start'
    }
  }
];

export const driverConfig: Config = {
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  progressText: 'Step {{current}} of {{total}}',
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Finish Tour 🎉',

  // Smooth animations
  animate: true,

  // Allow close via X button, ESC key, or clicking overlay
  allowClose: true,
  allowKeyboardControl: true, // Enable ESC key to close
  overlayClickBehavior: 'close', // Clicking overlay closes the tour
  disableActiveInteraction: false, // Allow interacting with highlighted element

  // Callbacks for navigation between pages
  onNextClick: (element, step, options) => {
    const stepIndex = options.state.activeIndex ?? 0;

    // Step 6: Navigate to /browse
    if (stepIndex === 6) {
      console.log('🌟 Navigating to /browse page...');
      window.location.href = '/browse';
      return;
    }

    // Step 8: Search for Daft Punk and navigate to artist page
    if (stepIndex === 8) {
      console.log('🔍 Searching for Daft Punk...');
      fetch('/api/search?query=daft+punk&type=artists&limit=1')
        .then(res => res.json())
        .then(data => {
          if (data.results?.[0]?.id) {
            console.log('✅ Found Daft Punk, navigating to artist page...');
            window.location.href = `/artists/${data.results[0].id}`;
          } else {
            console.warn('❌ Daft Punk not found, moving to next step');
            options.driver.moveNext();
          }
        })
        .catch(error => {
          console.error('❌ Search error:', error);
          options.driver.moveNext();
        });
      return;
    }

    // Step 10: Navigate to Random Access Memories album
    if (stepIndex === 10) {
      console.log('💿 Navigating to Random Access Memories album...');
      window.location.href = '/albums/556257';
      return;
    }

    // Step 12: Navigate to profile
    if (stepIndex === 12) {
      console.log('👤 Navigating to profile page...');
      window.location.href = '/profile';
      return;
    }

    // Default: move to next step
    options.driver.moveNext();
  },

  onCloseClick: (element, step, options) => {
    console.log('❌ User closed tour early');
    // Explicitly destroy the tour instance
    options.driver.destroy();
  },

  onDestroyStarted: () => {
    console.log('🎉 Tour completed or closed!');
    // Mark tour as completed in localStorage
    localStorage.setItem('tour-completed', 'true');

    // Mark onboarding as completed via API
    fetch('/api/users/onboarding-status', { method: 'POST' })
      .then(() => console.log('✅ Onboarding marked as completed'))
      .catch(error => console.error('❌ Error marking onboarding complete:', error));
  }
};

export function createOnboardingDriver() {
  return driver({
    ...driverConfig,
    steps: tourSteps,
  });
}
