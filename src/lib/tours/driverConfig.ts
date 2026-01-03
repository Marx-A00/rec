import { Config, DriveStep } from 'driver.js';
import { driver } from 'driver.js';
import { useTourStore } from '@/stores/useTourStore';

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
      title: 'Welcome to Rec!',
      /*
      Rec is a music sharing platform where you can find new music based on what you already love, and help others do the same.

      Let's show you the ropes.

      */
      description:
        "Rec is a music sharing platform where you can find new music based on what you already love, and help others do the same.<br><br>Let's show you the ropes.",
      side: 'over', // Center overlay for welcome modal
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
  },
  {
    element: '[data-tour-step="create-recommendation"]',
    popover: {
      title: 'Share Your Music Taste',
      description:
        'Click this button to create your first recommendation! Share albums that you think others might love based on specific album.',
      side: 'right',
      align: 'center',
      showButtons: ['close'], // Hide Next button - user must click the actual button
      popoverClass: 'driver-popover-large',
    },
  },
  {
    popover: {
      title: 'Welcome to the Create Recommendation Drawer',
      description:
        "This is the bread and butter of rec. <br><br>In here, you'll be able to recommend an album ('recommended') based on a 'source' album that you already know and love.<br><br>Making Recs is a way to share music that you love, help other people find new music, and build connections around those experiences.<br><br>Click next to look a little closer at the interface",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
    onHighlighted: () => {
      // Add dimmed overlay for this step only
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
    },
  },
  {
    element: '[data-tour-step="recommendation-search"]',
    popover: {
      title: 'Understanding the Recommendation System',
      description:
        "<span style='color: #ef4444; font-weight: 600;'>LEFT TURNTABLE (SOURCE)</span><br>Load an album you already know and love - this is your starting point<br><br><span style='color: #f59e0b; font-weight: 600;'>MIDDLE DIAL (SIMILARITY)</span><br>Rate how similar the albums are from 1-10. Higher scores mean more similar sound, vibe, or style<br><br><span style='color: #22c55e; font-weight: 600;'>RIGHT TURNTABLE (RECOMMENDED)</span><br>Load the album you want to recommend to others who love the source album<br><br>Think of it like saying: \"If you love THIS album (left), you should check out THAT album (right) - there's an x/10 chance you'll love it!\" Let's try it with a demo!",
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="recommendation-search"]',
    popover: {
      title: '🎯 Album Selection',
      description:
        "Notice the two albums are already filled in! When you create your own recommendations, you'll use this search bar to find albums. For now, let's see how the similarity rating works!",
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="similarity-dial"]',
    popover: {
      title: '⭐ Rate the Similarity',
      description:
        'Use the rating dial to score how likely you think someone will love the recommended album, based on the source album. Drag the dial or click to set a rating from 1-10. This helps other users understand your recommendation.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour-step="submit-recommendation"]',
    popover: {
      title: 'Submit Your Rec!',
      description: 'This is disabled during the tour.',
      side: 'top',
      align: 'center',
    },
  },
  {
    popover: {
      title: '✨ Great Job!',
      description:
        "You've learned how to create recommendations! Now let's explore the Browse page where you can discover music from other users and dive into artist pages. Click Next to continue to the Browse page!",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
    onHighlighted: () => {
      // Close the recommendation drawer
      const closeButton = document
        .querySelector('[data-tour-step="recommendation-drawer"]')
        ?.closest('[role="dialog"]')
        ?.querySelector('button[aria-label="Close"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
        console.log('✅ Closed recommendation drawer for tour transition');
      }

      // Add dimmed overlay for this step
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
    },
  },
  {
    popover: {
      title: 'Welcome to Browse & Discover',
      description:
        "Perfect! This is where the magic happens. Browse through trending albums, discover new artists, and explore recommendations from other music lovers. <br><br> This page is always under construction, and we're always adding new features and content. Make sure to check back often!",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
    onHighlighted: () => {
      // Add dimmed overlay for this step
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
    },
  },
  {
    element: '[data-tour-step="main-search"]',
    popover: {
      title: 'Search Bar',
      description:
        "Use the search bar to find albums, artists, tracks, and users. <br><br> Click Next and we'll show you by searching for the legendary electronic duo Daft Punk!",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    popover: {
      title: 'Welcome to Artist Pages',
      description:
        "Fantastic! This is an artist page where you can explore everything about an artist. Here you can see their biography, discography, collaborations, and discover similar artists. This is where you dive deep into an artist's world!",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
    onHighlighted: () => {
      // Add dimmed overlay for this step
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
    },
  },
  {
    element: '[data-tour-step="artist-discography"]',
    popover: {
      title: '💿 Explore Albums',
      description:
        "Now let's explore Daft Punk's legendary discography! I'll show you how to interact with albums. Click Next and I'll demonstrate by opening the iconic \"Random Access Memories\" album details.",
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="album-header"]',
    popover: {
      title: '🎵 Album Details & Interactions',
      description:
        'Perfect! This is a dedicated album page where you can explore everything about this album. Here you can see detailed information, track listings, reviews, add to your collection, and discover what others are saying about it. These interactions are the heart of music discovery!',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="profile-nav"]',
    popover: {
      title: '👤 Explore Your Profile',
      description:
        "Now let's explore your personal music profile! This is where you can showcase your music taste, connect with other music lovers, and track your listening journey. Click Next and I'll take you to your profile page.",
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour-step="profile-header"]',
    popover: {
      title: '✨ Welcome to Your Profile!',
      description:
        'Amazing! This is your personal music profile page. Here you can see your recommendations, followers, music stats, create collages, manage your collections, and showcase your unique music taste to the community. This is your musical identity hub!',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    popover: {
      title: '🎉 Tour Complete!',
      description:
        "Congratulations! You've completed the Rec Music tour. You now know how to:<br><br>✅ Create and share music recommendations<br>✅ Discover new music through the browse page<br>✅ Explore artist pages and albums<br>✅ Manage your profile and music taste<br><br>Now it's time to start building your music community! Click Finish to start exploring on your own.",
      side: 'over',
      align: 'center',
      popoverClass: 'driver-popover-large',
    },
    onHighlighted: () => {
      // Add dimmed overlay for final step
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
    },
  },
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
  stagePadding: 10, // More padding around highlighted element
  stageRadius: 8, // Border radius of highlight cutout

  // Popover styling
  popoverClass: 'driver-popover-custom',

  // Disable overlay - just show popovers pointing to elements
  overlayOpacity: 0, // No dark overlay (set to 0)

  // Allow close via X button, ESC key
  allowClose: true,
  allowKeyboardControl: true, // Enable ESC key to close
  disableActiveInteraction: false, // Allow interacting with highlighted element

  // Callback when a step is highlighted
  onHighlightStarted: (_element, _step, options) => {
    const stepIndex = options.state.activeIndex ?? 0;

    // Step 5: Auto-fill demo albums when showing search/album selection step
    if (stepIndex === 4) {
      console.log('🎬 Auto-filling demo recommendation for tour');

      // Create properly structured Album objects matching Album type from /src/types/album.ts
      const sourceAlbum = {
        id: '556257',
        title: 'Random Access Memories',
        artists: [
          {
            id: 'daft-punk-1',
            name: 'Daft Punk',
          },
        ],
        releaseDate: '2013-05-17',
        year: 2013,
        genre: ['Electronic', 'Disco', 'Funk'],
        label: 'Columbia Records',
        image: {
          url: '/demo-albums/RAM-daft-punk.jpeg',
          width: 500,
          height: 500,
          alt: 'Random Access Memories album cover',
        },
        source: 'local' as const,
      };

      const recommendedAlbum = {
        id: 'discovery-1',
        title: 'Discovery',
        artists: [
          {
            id: 'daft-punk-1',
            name: 'Daft Punk',
          },
        ],
        releaseDate: '2001-03-12',
        year: 2001,
        genre: ['Electronic', 'House', 'Disco'],
        label: 'Virgin Records',
        image: {
          url: '/demo-albums/discovery-daft-punk.jpg',
          width: 500,
          height: 500,
          alt: 'Discovery album cover',
        },
        source: 'local' as const,
      };

      // Dispatch event to fill demo albums with properly structured Album objects
      const demoEvent = new CustomEvent('fill-demo-recommendation', {
        detail: {
          sourceAlbum,
          recommendedAlbum,
          similarityRating: 7,
        },
      });
      window.dispatchEvent(demoEvent);
      console.log('✅ Demo recommendation filled with proper Album objects');
    }

    // Step 2: Add click listener to the "Create Recommendation" button
    if (stepIndex === 1) {
      const button = document.querySelector(
        '[data-tour-step="create-recommendation"]'
      );

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
        console.error(
          '❌ Could not find recommendation button with data-tour-step attribute'
        );
      }
    }
  },

  // Callbacks for navigation between pages
  onNextClick: (_element, _step, options) => {
    const stepIndex = options.state.activeIndex ?? 0;

    // Step 8 (index 7): Navigate to /browse (after "Great Job!" transitional card)
    if (stepIndex === 7) {
      console.log('🌟 Navigating to /browse page...');
      // Save next step index to resume after navigation
      useTourStore.getState().setResumeStep(8);
      window.location.href = '/browse';
      return;
    }

    // Step 10 (index 9): Navigate to Daft Punk artist page (Main Search)
    if (stepIndex === 9) {
      console.log('🔍 Navigating to Daft Punk artist page...');
      // Save next step index to resume after navigation (Artist Header = index 10)
      useTourStore.getState().setResumeStep(10);
      // Hardcoded Daft Punk UUID from local database
      window.location.href =
        '/artists/da99bd57-74ca-4808-9bc3-7e5c7d7b6541?source=local';
      return;
    }

    // Step 12 (index 11): Navigate to Random Access Memories album (from Artist Discography)
    if (stepIndex === 11) {
      console.log('💿 Navigating to Random Access Memories album...');
      // Save next step index to resume after navigation
      useTourStore.getState().setResumeStep(12);
      window.location.href = '/albums/556257';
      return;
    }

    // Step 14 (index 13): Navigate to profile
    if (stepIndex === 13) {
      console.log('👤 Navigating to profile page...');
      // Save next step index to resume after navigation
      useTourStore.getState().setResumeStep(14);
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
      .catch(error =>
        console.error('❌ Error marking onboarding complete:', error)
      );
  },
};

export function createOnboardingDriver() {
  return driver({
    ...driverConfig,
    steps: tourSteps,
  });
}
