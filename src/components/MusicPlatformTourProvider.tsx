// src/components/MusicPlatformTourProvider.tsx
'use client';

import React, { ReactNode, useEffect, useCallback } from 'react';
import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs';
import { useRouter, usePathname } from 'next/navigation';
import { musicPlatformTours } from '@/lib/tours/musicPlatformTours';
import { CustomTourCard } from '@/components/CustomTourCard';

interface MusicPlatformTourProviderProps {
  children: ReactNode;
}

// Next.js Navigation Adapter for NextStep
function useNextJSNavigationAdapter() {
  const router = useRouter();
  const pathname = usePathname();

  const push = useCallback((path: string) => {
    console.log('🚀 NextStep Navigation: Pushing to', path);
    router.push(path);
  }, [router]);

  const getCurrentPath = useCallback(() => {
    console.log('🚀 NextStep Navigation: Current path is', pathname);
    return pathname;
  }, [pathname]);

  return { push, getCurrentPath };
}

// Tour State Manager Component  
function TourStateManager() {
  const { startNextStep, isNextStepVisible, currentTour, currentStep } = useNextStep();
  const pathname = usePathname();

  // Debug element availability on every render
  useEffect(() => {
    const searchElement = document.querySelector('#main-search-bar');
    console.log('🔍 DEBUG - Element check:', {
      pathname,
      isNextStepVisible,
      currentTour,
      currentStep,
      searchElementExists: !!searchElement,
      searchElement
    });
    
    if (pathname === '/browse') {
      console.log('🌟 On browse page - checking if search tour should trigger');
      console.log('🌟 Tour state:', { isNextStepVisible, currentTour, currentStep });
    }
  });

  // Add debug functions to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔧 Setting up debugTour functions...');
      (window as any).debugTour = {
        jumpToStep: (stepNumber: number) => {
          console.log(`🚀 Debug: Jumping to step ${stepNumber}`);
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: stepNumber,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        jumpToSearch: () => {
          console.log('🚀 Debug: Jumping to search step (step 8)');
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: 8,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        jumpToAlbums: () => {
          console.log('🚀 Debug: Jumping to explore albums step (step 10)');
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: 10,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        jumpToAlbumModal: () => {
          console.log('🚀 Debug: Jumping to album modal step (step 11)');
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: 11,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        jumpToProfile: () => {
          console.log('🚀 Debug: Jumping to explore profile step (step 12)');
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: 12,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        jumpToProfileWelcome: () => {
          console.log('🚀 Debug: Jumping to profile welcome step (step 13)');
          localStorage.setItem('nextstep-welcome-onboarding', JSON.stringify({
            currentStep: 13,
            isActive: true,
            hasBeenStarted: true
          }));
          location.reload();
        },
        restartTour: () => {
          console.log('🚀 Debug: Restarting tour');
          localStorage.removeItem('nextstep-welcome-onboarding');
          location.reload();
        },
        getCurrentStep: () => {
          const data = localStorage.getItem('nextstep-welcome-onboarding');
          return data ? JSON.parse(data) : null;
        },
        testSearchAndNavigate: async () => {
          console.log('🚀 Debug: Testing search and navigate');
          try {
            const response = await fetch('/api/search?query=daft+punk&type=artists&limit=1');
            const data = await response.json();
            console.log('🔍 Search response:', data);
            if (data.results && data.results.length > 0) {
              const artist = data.results[0];
              console.log('✅ Found artist:', artist);
              window.location.href = `/artists/${artist.id}`;
            }
          } catch (error) {
            console.error('❌ Error:', error);
          }
        },
        testFindAlbums: () => {
          console.log('🚀 Debug: Testing album finding');
          const selectors = [
            'img[alt*="Random Access Memories"]',
            'img[alt*="random access memories"]',
            '[data-testid*="random-access-memories"]',
            'img[src*="random-access-memories"]',
            'img[src*="Random-Access-Memories"]',
            '#artist-discography img, .artist-albums img, [data-testid="artist-albums"] img'
          ];
          
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`🔍 Selector "${selector}" found ${elements.length} elements:`, elements);
            
            elements.forEach((el, index) => {
              const img = el as HTMLImageElement;
              console.log(`  - Element ${index}:`, {
                alt: img.alt,
                src: img.src,
                element: img
              });
            });
          });
        },
        testProfileNavigation: () => {
          console.log('🚀 Debug: Testing profile navigation');
          try {
            window.location.href = '/profile';
          } catch (error) {
            console.error('❌ Error navigating to profile:', error);
          }
        },
        inspectModals: () => {
          console.log('🔍 Debug: Inspecting current page modals and elements...');
          
          // Check for various modal selectors
          const modalSelectors = [
            '#album-modal',
            '.album-modal', 
            '[data-testid="album-modal"]',
            '[role="dialog"]',
            '[role="modal"]',
            '.modal',
            '.dialog',
            // Check for common modal wrapper classes
            '.fixed.inset-0',
            '.absolute.inset-0',
            '.z-50',
            '.z-\\[50\\]'
          ];
          
          modalSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`📋 Selector "${selector}": ${elements.length} elements found`, elements);
          });
          
          // Check for close buttons
          const closeSelectors = [
            '[data-testid="close-modal"]',
            '.modal-close',
            '[aria-label="Close"]',
            '[aria-label="close"]',
            'button[aria-label*="close" i]',
            '.close-button',
            'button:has(svg)',
            // Look for X buttons
            'button',
          ];
          
          console.log('🔍 Looking for close buttons...');
          closeSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`❌ Close selector "${selector}": ${elements.length} elements found`);
            if (elements.length > 0 && elements.length < 10) { // Don't log too many
              elements.forEach((el, i) => {
                console.log(`  - Close button ${i}:`, {
                  element: el,
                  text: el.textContent?.trim(),
                  ariaLabel: (el as HTMLElement).getAttribute('aria-label'),
                  className: (el as HTMLElement).className
                });
              });
            }
          });
          
          // Check current page and tour state
          console.log('📍 Current page:', window.location.pathname);
          const tourData = localStorage.getItem('nextstep-welcome-onboarding');
          console.log('🎯 Current tour state:', tourData ? JSON.parse(tourData) : null);
        },
        testModalCloseAndNavigate: async () => {
          console.log('🚀 Debug: Testing enhanced modal close and profile navigation...');
          
          // Use the same logic as ExploreProfileCard
          const modalSelectors = [
            '#album-modal',
            '.album-modal', 
            '[data-testid="album-modal"]',
            '[role="dialog"]',
            '[role="modal"]',
            '.modal',
            '.fixed.inset-0',
            '.absolute.inset-0'
          ];
          
          let foundModal = null;
          for (const selector of modalSelectors) {
            const modal = document.querySelector(selector);
            if (modal) {
              console.log('✅ Found modal with selector:', selector, modal);
              foundModal = modal;
              break;
            }
          }
          
          if (foundModal) {
            console.log('🎯 Modal found, attempting to close...');
            
            // Try to find and click close button
            const closeButtons = foundModal.querySelectorAll('button');
            console.log(`🔍 Found ${closeButtons.length} buttons in modal`);
            
            closeButtons.forEach((button, i) => {
              const buttonEl = button as HTMLElement;
              console.log(`  - Button ${i}:`, {
                text: buttonEl.textContent?.trim(),
                ariaLabel: buttonEl.getAttribute('aria-label'),
                className: buttonEl.className
              });
            });
            
            // Try clicking first button as test
            if (closeButtons.length > 0) {
              console.log('🔘 Clicking first button to test...');
              (closeButtons[0] as HTMLElement).click();
            }
            
            // Wait and then navigate
            setTimeout(() => {
              console.log('📍 Navigating to profile...');
              window.location.href = '/profile';
            }, 500);
          } else {
            console.log('ℹ️ No modal found, navigating directly...');
            window.location.href = '/profile';
          }
        }
      };
    }
  }, []);

  useEffect(() => {
    console.log('🎯 TourStateManager mounted - ready for tours!');
    
    // Add debug functions to window for manual testing
    (window as any).debugTour = {
      checkSearchElement: () => {
        const element = document.querySelector('#main-search-bar');
        console.log('🔍 Manual search element check:', {
          exists: !!element,
          element,
          id: element?.id,
          tagName: element?.tagName,
          className: element?.className
        });
        return element;
      },
      getCurrentTourState: () => {
        console.log('🎯 Current tour state:', {
          isNextStepVisible,
          currentTour,
          currentStep,
          pathname
        });
      },
      forceBrowseStep: () => {
        console.log('🚀 Forcing browse step check...');
        if (pathname === '/browse') {
          const element = document.querySelector('#browse-page-header');
          console.log('🔍 Browse element check:', {
            exists: !!element,
            element,
            isOnCorrectStep: currentStep === 7,
            currentStepTitle: currentStep !== undefined ? musicPlatformTours.find(t => t.tour === 'welcome-onboarding')?.steps[currentStep]?.title : 'unknown'
          });
          
          if (element) {
            console.log('✅ Manually triggering browse element found event');
            const event = new CustomEvent('nextstep-element-found', {
              detail: { 
                selector: '#browse-page-header',
                element: element 
              }
            });
            window.dispatchEvent(event);
            window.dispatchEvent(new Event('resize'));
          }
        } else {
          console.log('❌ Not on browse page, cannot force browse step');
        }
      },
      testSearchAndNavigate: () => {
        console.log('🧪 Testing search and navigate...');
        
        // First, auto-fill the search
        const searchInput = document.querySelector('#main-search-bar') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = 'daft punk';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('✅ Auto-filled search');
          
          // Wait for search results and try to click first artist result
          setTimeout(() => {
            const searchResults = document.querySelectorAll('[data-search-result], .search-result, a[href*="/artists/"]');
            console.log('🔍 Found search results:', searchResults.length);
            
            if (searchResults.length > 0) {
              const firstResult = searchResults[0] as HTMLElement;
              console.log('🎯 Clicking first search result:', firstResult);
              firstResult.click();
            } else {
              console.log('❌ No search results found');
            }
          }, 1500);
        } else {
          console.log('❌ Search input not found');
        }
      },
      forceSearchStep: () => {
        console.log('🚀 Attempting to force search step...');
        // Check if we can manually trigger the search step
        const element = document.querySelector('#main-search-bar');
        if (element) {
          console.log('✅ Search element found, should be able to show step');
        } else {
          console.log('❌ Search element NOT found');
        }
      }
    };
  }, [startNextStep]);

  // Handle browse page tour step manually
  useEffect(() => {
    if (pathname === '/browse') {
      console.log('🔍 DEBUG: On browse page');
      console.log('🎯 Full tour state on browse page:', {
        isNextStepVisible,
        currentTour,
        currentStep,
        expectedStep: 7, // "Welcome to Discovery" should be at index 7
        pathname
      });
      
      // If we're currently on the welcome tour and on browse page, help NextStep find the element
      if (isNextStepVisible && currentTour === 'welcome-onboarding') {
        console.log('✅ On welcome tour and browse page - checking step...');
        
        // Verify we're on the correct step (Welcome to Discovery)
        const tourData = musicPlatformTours.find(tour => tour.tour === 'welcome-onboarding');
        if (tourData && tourData.steps[currentStep || 0]) {
          const currentStepData = tourData.steps[currentStep || 0];
          console.log('🎯 Current step on browse page:', {
            stepIndex: currentStep,
            stepTitle: currentStepData.title,
            stepIcon: currentStepData.icon,
            isDiscoveryStep: currentStepData.title?.includes('Welcome to Discovery')
          });
        }
        let attempts = 0;
        const maxAttempts = 50; // Increased from 30
        
        const checkElement = () => {
          attempts++;
          const element = document.querySelector('#browse-page-header');
          console.log(`🔍 Attempt ${attempts}: browse-page-header exists?`, !!element);
          
          if (element) {
            console.log('✅ Found browse-page-header element!', element);
            
            // Trigger NextStep to recognize the element by manually dispatching events
            const event = new CustomEvent('nextstep-element-found', {
              detail: { 
                selector: '#browse-page-header',
                element: element 
              }
            });
            window.dispatchEvent(event);
            
            // Also check if NextStep overlay is visible
            setTimeout(() => {
              const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
              const nextStepCards = document.querySelectorAll('[data-nextstep]');
              console.log('🔍 NextStep overlay visible?', !!nextStepOverlay);
              console.log('🔍 NextStep cards found:', nextStepCards.length);
              
              // If still no overlay, try to force NextStep to update
              if (!nextStepOverlay) {
                console.log('🔧 Forcing NextStep update...');
                // Trigger a resize event to make NextStep recalculate
                window.dispatchEvent(new Event('resize'));
              }
            }, 100);
            
          } else if (attempts < maxAttempts) {
            setTimeout(checkElement, 100);
          } else {
            console.log('❌ Gave up looking for browse-page-header after 5 seconds');
            
            // Check if NextStep is working even without the element
            const nextStepOverlay = document.querySelector('[data-name="nextstep-overlay"]');
            console.log('🔍 NextStep overlay visible (without element)?', !!nextStepOverlay);
          }
        };
        
        // Start checking immediately and then every 100ms
        checkElement();
      }
    }

    // Handle artist pages tour step
    if (pathname.startsWith('/artists/')) {
      console.log('🔍 DEBUG: On artist page');
      
      // If we're currently on the welcome tour and on artist page, help NextStep find the element
      if (isNextStepVisible && currentTour === 'welcome-onboarding') {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkElement = () => {
          attempts++;
          const element = document.querySelector('#artist-page-header');
          console.log(`🔍 Attempt ${attempts}: artist-page-header exists?`, !!element);
          
          if (element) {
            console.log('✅ Found artist-page-header element!', element);
            
            // Trigger NextStep to recognize the element
            const event = new CustomEvent('nextstep-element-found', {
              detail: { 
                selector: '#artist-page-header',
                element: element 
              }
            });
            window.dispatchEvent(event);
            
            // Force NextStep recalculation if needed
            setTimeout(() => {
              const overlay = document.querySelector('[data-name="nextstep-overlay"]');
              if (!overlay) {
                console.log('🔧 Forcing NextStep update for artist page...');
                window.dispatchEvent(new Event('resize'));
              }
            }, 100);
            
          } else if (attempts < maxAttempts) {
            setTimeout(checkElement, 100);
          } else {
            console.log('❌ Gave up looking for artist-page-header after 5 seconds');
          }
        };
        
        checkElement();
      }
    }
  }, [pathname, isNextStepVisible, currentTour, currentStep, startNextStep]);

  // Handle search functionality and auto-fill
  useEffect(() => {
    console.log('🔍 Search effect triggered:', {
      isNextStepVisible,
      currentTour,
      currentStep,
      stepExists: currentStep !== undefined
    });
    
    // Check if we're on the search tour step and need to auto-fill
    if (isNextStepVisible && currentTour === 'welcome-onboarding' && currentStep !== undefined) {
      // Find the search step by checking the step content
      const tourData = musicPlatformTours.find(tour => tour.tour === 'welcome-onboarding');
      console.log('🎯 Tour data found:', !!tourData);
      
      if (tourData && tourData.steps[currentStep]) {
        console.log('🎯 Current step details:', {
          stepIndex: currentStep,
          stepTitle: tourData.steps[currentStep].title,
          isSearchStep: tourData.steps[currentStep].title === 'Search for Music'
        });
        
        if (tourData.steps[currentStep].title === 'Search for Music') {
          console.log('🔍 ✅ Confirmed on search tour step - auto-filling search with "daft punk"');
          
          // Wait a moment for the page to be ready, then auto-fill search
          setTimeout(() => {
            // Try multiple selectors to find the search input
            const possibleSelectors = [
              '#main-search-bar',
              '[cmdk-input]', 
              'input[placeholder*="Search albums"]',
              '.cmdk-input',
              '[data-cmdk-input]'
            ];
            
            let searchInput: HTMLInputElement | null = null;
            let foundSelector = '';
            
            for (const selector of possibleSelectors) {
              const element = document.querySelector(selector) as HTMLInputElement;
              if (element) {
                searchInput = element;
                foundSelector = selector;
                break;
              }
            }
            
            console.log('🔍 Search input detection:', {
              foundElement: !!searchInput,
              foundSelector,
              element: searchInput,
              allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
                id: input.id,
                className: input.className,
                placeholder: input.placeholder,
                type: input.type,
                hasAttributes: {
                  'cmdk-input': input.hasAttribute('cmdk-input'),
                  'data-cmdk-input': input.hasAttribute('data-cmdk-input')
                }
              }))
            });
            
            if (searchInput) {
              console.log('✅ Found search input, auto-filling with "daft punk"');
              
              // Set the value and trigger events to simulate user input
              searchInput.value = 'daft punk';
              
              // Trigger input events to make the search work
              const inputEvent = new Event('input', { bubbles: true });
              searchInput.dispatchEvent(inputEvent);
              
              const changeEvent = new Event('change', { bubbles: true });
              searchInput.dispatchEvent(changeEvent);
              
              // For CommandInput, we might also need to trigger these events
              const keyupEvent = new KeyboardEvent('keyup', { bubbles: true });
              searchInput.dispatchEvent(keyupEvent);
              
              // Try to trigger React's synthetic events as well
              Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(searchInput, 'daft punk');
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Focus the input to show it's active
              searchInput.focus();
              
              console.log('🎯 Auto-filled search bar with "daft punk"');
              
              // Wait for search results and try to auto-click first artist result
              setTimeout(() => {
                console.log('🔍 Looking for search results to auto-click...');
                const searchResults = document.querySelectorAll('a[href*="/artists/"], [data-search-result], .search-result-item');
                console.log('🔍 Found potential search results:', searchResults.length);
                
                for (let i = 0; i < searchResults.length; i++) {
                  const result = searchResults[i] as HTMLElement;
                  const text = result.textContent?.toLowerCase() || '';
                  const href = (result as HTMLAnchorElement).href || '';
                  
                  console.log(`🔍 Search result ${i}:`, { text: text.slice(0, 50), href });
                  
                  // Look for Daft Punk in the text or a specific artist link
                  if (text.includes('daft punk') || href.includes('/artists/')) {
                    console.log('🎯 Found potential Daft Punk result, clicking:', result);
                    result.click();
                    return;
                  }
                }
                
                console.log('❌ No Daft Punk search results found to auto-click');
              }, 2000); // Wait 2 seconds for search results to populate
            } else {
              console.log('❌ Could not find search input to auto-fill');
              // List all inputs for debugging
              const allInputs = document.querySelectorAll('input');
              console.log('🔍 All inputs on page:', Array.from(allInputs).map(input => ({
                id: input.id,
                className: input.className,
                type: input.type,
                placeholder: input.placeholder
              })));
            }
          }, 500);

          // Also add a custom Next button handler for this step
          const addCustomNextHandler = () => {
            // Try multiple selectors for the Next button
            const possibleSelectors = [
              '[data-nextstep-next-btn]',
              'button:contains("Next")',
              'button:contains("Continue")',
              '[data-nextstep] button[type="button"]',
              '.nextstep-card button:last-child'
            ];
            
            let nextButton: Element | null = null;
            let foundSelector = '';
            
            for (const selector of possibleSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                nextButton = element;
                foundSelector = selector;
                break;
              }
            }
            
            console.log('🔍 Next button detection:', {
              foundButton: !!nextButton,
              foundSelector,
              allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                text: btn.textContent?.trim(),
                className: btn.className,
                dataset: Object.keys(btn.dataset)
              }))
            });
            
            if (nextButton && !nextButton.hasAttribute('data-custom-handler')) {
              console.log('🎯 Adding custom Next button handler for search step');
              
              // Mark as having custom handler to avoid duplicates
              nextButton.setAttribute('data-custom-handler', 'true');
              
              // Add click event listener
              const handleCustomNext = async (event: Event) => {
                console.log('🚀 Custom Next clicked - searching for Daft Punk artist');
                
                // Don't prevent default immediately, let's see what happens
                try {
                  // Perform search for Daft Punk artist
                  const searchResponse = await fetch('/api/search?query=daft+punk&type=artists&limit=1');
                  const searchData = await searchResponse.json();
                  
                  console.log('🔍 Search API response:', searchData);
                  
                  if (searchData.results && searchData.results.length > 0) {
                    const daftPunkArtist = searchData.results[0];
                    console.log('✅ Found Daft Punk artist:', daftPunkArtist);
                    
                    // Prevent default after successful search
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Navigate to the artist page
                    console.log('🎯 Navigating to artist page:', `/artists/${daftPunkArtist.id}`);
                    window.location.href = `/artists/${daftPunkArtist.id}`;
                  } else {
                    console.log('❌ No Daft Punk artist found, allowing normal Next behavior');
                    // Let the normal nextStep() behavior continue
                  }
                } catch (error) {
                  console.error('❌ Error searching for Daft Punk:', error);
                  // Let the normal nextStep() behavior continue
                }
              };
              
              nextButton.addEventListener('click', handleCustomNext);
              
              // Clean up the event listener when the step changes
              const cleanup = () => {
                nextButton?.removeEventListener('click', handleCustomNext);
                nextButton?.removeAttribute('data-custom-handler');
              };
              
              // Store cleanup function for later use
              (nextButton as any)._customCleanup = cleanup;
            }
          };
          
          // Try to add the handler, and retry if button isn't ready yet
          let attempts = 0;
          const tryAddHandler = () => {
            attempts++;
            const nextButton = document.querySelector('[data-nextstep-next-btn]');
            if (nextButton) {
              addCustomNextHandler();
            } else if (attempts < 20) {
              setTimeout(tryAddHandler, 100);
            }
          };
          
          setTimeout(tryAddHandler, 1000);
        }
      }
    }
    
    // Clean up custom handlers when leaving the search step
    return () => {
      const nextButton = document.querySelector('[data-nextstep-next-btn]');
      if (nextButton && (nextButton as any)._customCleanup) {
        (nextButton as any)._customCleanup();
      }
    };
  }, [isNextStepVisible, currentTour, currentStep]);

  return null;
}

/**
 * Tour Provider Component
 * 
 * This component sets up NextStep.js for the entire app.
 * It provides the tour functionality to all child components.
 * 
 * Usage:
 * - Already integrated in app/layout.tsx
 * - Use useNextStep() hook in components to start tours
 * - Call startNextStep('tour-id') to begin a tour
 * 
 * Tours are defined in: src/lib/tours/musicPlatformTours.ts
 * Custom card styling in: src/components/CustomTourCard.tsx
 */
export function MusicPlatformTourProvider({ children }: MusicPlatformTourProviderProps) {
  const navigationAdapter = useNextJSNavigationAdapter();

  return (
    <NextStepProvider>
      {/* Configure NextStep with our tours, custom card component, and Next.js navigation adapter */}
      <NextStep 
        steps={musicPlatformTours}
        cardComponent={CustomTourCard}
        navigationAdapter={() => navigationAdapter}
      >
        <TourStateManager />
        {children}
      </NextStep>
    </NextStepProvider>
  );
}

/**
 * Hook for accessing tours (optional utility)
 * 
 * Returns:
 * - tours: Array of all available tours
 * - startTour: Function to start a tour (just logs for now)
 */
export function useMusicPlatformTours() {
  return {
    tours: musicPlatformTours,
    startTour: (tourId: string) => {
      console.log(`Starting tour: ${tourId}`);
    }
  };
} 