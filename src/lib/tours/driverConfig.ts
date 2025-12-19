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
    element: '[data-tour-step="create-recommendation"]',
    popover: {
      title: '🎤 Share Your Music Taste',
      description: 'Click this button to create your first recommendation! Share albums you love and discover what others are listening to.',
      side: 'right',
      align: 'center',
      showButtons: ['close'], // Hide Next button - user must click the actual button
    }
  },
  {
    popover: {
      title: '✨ Demo Recommendation',
      description: "Perfect! We've pre-filled a demo recommendation for you - comparing Daft Punk's \"Random Access Memories\" to \"Discovery\". This shows you how the recommendation system works!",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large'
    },
    onHighlighted: () => {
      // Add dimmed overlay for this step only
      // we may add it back later, we removed it for debugging
      const overlay = document.querySelector('.driver-overlay') as HTMLElement;
      if (overlay) {
        overlay.style.opacity = '0.5';
      }
    },
    onDeselected: () => {
      // Remove dimmed overlay when leaving this step
      const overlay = document.querySelector('.driver-overlay') as HTMLElement;
      if (overlay) {
        overlay.style.opacity = '0';
      }
    }
  },
  {
    element: '[data-tour-step="recommendation-search"]',
    popover: {
      title: '🎯 Album Selection',
      description: 'Notice the two albums are already filled in! When you create your own recommendations, you\'ll use this search bar to find albums. For now, let\'s see how the similarity rating works!',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="similarity-dial"]',
    popover: {
      title: '⭐ Rate the Similarity',
      description: 'Use the rating dial to score how similar the albums are! Drag the dial or click to set a rating from 1-10. This helps other users understand your recommendation.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour-step="submit-recommendation"]',
    popover: {
      title: '🚀 Submit Your Recommendation',
      description: 'Hit this green button cuh',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour-step="discover-nav"]',
    popover: {
      title: '🌟 Discover New Music',
      description: 'Amazing! Now that you know how to recommend music, explore what others are sharing. Click Next to go to the Browse & Discover page!',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="browse-header"]',
    popover: {
      title: '🎵 Welcome to Discovery',
      description: 'Perfect! This is where the magic happens. Browse through trending albums, discover new artists, and explore recommendations from other music lovers. Everything is organized to help you find your next favorite album!',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="main-search"]',
    popover: {
      title: '🔍 Search for Music',
      description: "Use the search bar to find albums, artists, and tracks. This is your gateway to discovering new music. Click Next and I'll show you by searching for the legendary electronic duo Daft Punk!",
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour-step="artist-header"]',
    popover: {
      title: '🤖 Welcome to Artist Pages',
      description: "Fantastic! This is an artist page where you can explore everything about an artist. Here you can see their biography, discography, collaborations, and discover similar artists. This is where you dive deep into an artist's world!",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="artist-discography"]',
    popover: {
      title: '💿 Explore Albums',
      description: "Now let's explore Daft Punk's legendary discography! I'll show you how to interact with albums. Click Next and I'll demonstrate by opening the iconic \"Random Access Memories\" album details.",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="album-header"]',
    popover: {
      title: '🎵 Album Details & Interactions',
      description: 'Perfect! This is a dedicated album page where you can explore everything about this album. Here you can see detailed information, track listings, reviews, add to your collection, and discover what others are saying about it. These interactions are the heart of music discovery!',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="profile-nav"]',
    popover: {
      title: '👤 Explore Your Profile',
      description: "Now let's explore your personal music profile! This is where you can showcase your music taste, connect with other music lovers, and track your listening journey. Click Next and I'll take you to your profile page.",
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour-step="profile-header"]',
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

  // Staging and padding for better visibility
  stagePadding: 10,          // More padding around highlighted element
  stageRadius: 8,            // Border radius of highlight cutout

  // Popover styling
  popoverClass: 'driver-popover-custom',

  // Disable overlay - just show popovers pointing to elements
  overlayOpacity: 0,         // No dark overlay (set to 0)

  // Allow close via X button, ESC key
  allowClose: true,
  allowKeyboardControl: true, // Enable ESC key to close
  disableActiveInteraction: false, // Allow interacting with highlighted element

  // Callback when a step is highlighted
  onHighlightStarted: (_element, _step, options) => {
    const stepIndex = options.state.activeIndex ?? 0;

    // Step 3: Auto-fill demo albums when drawer opens
    if (stepIndex === 2) {
      console.log('🎬 Auto-filling demo recommendation for tour');

      // Create properly structured Album objects matching Album type from /src/types/album.ts
      const sourceAlbum = {
        id: '556257',
        title: 'Random Access Memories',
        artists: [
          {
            id: 'daft-punk-1',
            name: 'Daft Punk'
          }
        ],
        releaseDate: '2013-05-17',
        year: 2013,
        genre: ['Electronic', 'Disco', 'Funk'],
        label: 'Columbia Records',
        image: {
          url: '/demo-albums/RAM-daft-punk.jpeg',
          width: 500,
          height: 500,
          alt: 'Random Access Memories album cover'
        },
        source: 'local' as const
      };

      const recommendedAlbum = {
        id: 'discovery-1',
        title: 'Discovery',
        artists: [
          {
            id: 'daft-punk-1',
            name: 'Daft Punk'
          }
        ],
        releaseDate: '2001-03-12',
        year: 2001,
        genre: ['Electronic', 'House', 'Disco'],
        label: 'Virgin Records',
        image: {
          url: '/demo-albums/discovery-daft-punk.jpg',
          width: 500,
          height: 500,
          alt: 'Discovery album cover'
        },
        source: 'local' as const
      };

      // Dispatch event to fill demo albums with properly structured Album objects
      const demoEvent = new CustomEvent('fill-demo-recommendation', {
        detail: {
          sourceAlbum,
          recommendedAlbum,
          similarityRating: 7
        }
      });
      window.dispatchEvent(demoEvent);
      console.log('✅ Demo recommendation filled with proper Album objects');
    }

    // Step 2: Add click listener to the "Create Recommendation" button
    if (stepIndex === 1) {
      const button = document.querySelector('[data-tour-step="create-recommendation"]');

      if (button instanceof HTMLElement) {
        // Create a one-time click handler
        const clickHandler = (e: Event) => {
          console.log('✅ User clicked recommendation button - advancing tour');
          e.preventDefault(); // Prevent default drawer opening
          e.stopPropagation();

          // Remove the listener after it fires once
          button.removeEventListener('click', clickHandler, true);

          // Dispatch custom event to open drawer in tour mode
          console.log('📤 Dispatching open-drawer-for-tour event');
          const tourDrawerEvent = new CustomEvent('open-drawer-for-tour');
          window.dispatchEvent(tourDrawerEvent);

          // Wait for drawer to be visible before advancing
          const waitForDrawer = () => {
            const drawer = document.querySelector('#recommendation-drawer');
            if (drawer && drawer instanceof HTMLElement) {
              // Check if drawer is visible (has non-zero height)
              const rect = drawer.getBoundingClientRect();
              if (rect.height > 0) {
                console.log('✅ Drawer is visible, advancing to step 3');
                options.driver.moveNext();
                return;
              }
            }

            // Not visible yet, check again in 100ms
            setTimeout(waitForDrawer, 100);
          };

          // Start checking after initial delay
          setTimeout(waitForDrawer, 200);
        };

        // Use capture phase to intercept before the normal click handler
        button.addEventListener('click', clickHandler, true);
        console.log('👂 Listening for button click on step 2...');
      } else {
        console.error('❌ Could not find recommendation button with data-tour-step attribute');
      }
    }
  },

  // Callbacks for navigation between pages
  onNextClick: (_element, _step, options) => {
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

  onCloseClick: (_element, _step, options) => {
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
