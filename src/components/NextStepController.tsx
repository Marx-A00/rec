// src/components/NextStepController.tsx
'use client';

import React, { ReactNode, useCallback, useEffect, useState, useRef } from 'react';
import { NextStepProvider as NextStepProviderLib, NextStep, useNextStep } from 'nextstepjs';
import { motion, AnimatePresence } from 'motion/react';

// Types and interfaces
export interface AccessibilityOptions {
  enableKeyboardNavigation: boolean;
  enableScreenReaderSupport: boolean;
  respectReducedMotion: boolean;
  highContrastMode: boolean;
  announceSteps: boolean;
  focusManagement: boolean;
}

export interface TourAnalytics {
  trackTourStart: (tourId: string) => void;
  trackTourComplete: (tourId: string, duration: number) => void;
  trackTourSkip: (tourId: string, stepIndex: number) => void;
  trackStepView: (tourId: string, stepIndex: number) => void;
  trackError: (tourId: string, error: Error) => void;
}

export interface NextStepControllerProps {
  children: ReactNode;
  tours: any[]; // Will be properly typed when we convert tours in Task 4
  accessibility?: AccessibilityOptions;
  analytics?: TourAnalytics;
  onTourStart?: (tourId: string) => void;
  onTourComplete?: (tourId: string) => void;
  onTourSkip?: (tourId: string, stepIndex: number) => void;
  onError?: (error: Error) => void;
  enableErrorBoundary?: boolean;
  customTheme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
  };
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class NextStepErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NextStep Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <h3 className="text-red-800 font-semibold mb-2">Tour System Error</h3>
          <p className="text-red-600 text-sm">
            Something went wrong with the tour system. Please try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Event Handler Component using NextStep hooks
interface NextStepEventHandlerProps {
  onTourStart?: (tourId: string) => void;
  onTourComplete?: (tourId: string) => void;
  onTourSkip?: (tourId: string, stepIndex: number) => void;
  onError?: (error: Error) => void;
}

function NextStepEventHandler({ 
  onTourStart, 
  onTourComplete, 
  onTourSkip, 
  onError 
}: NextStepEventHandlerProps) {
  const { currentTour, currentStep, isNextStepVisible } = useNextStep();
  const [previousTour, setPreviousTour] = useState<string | null>(null);
  const [previousVisible, setPreviousVisible] = useState(false);

  // Track tour start
  useEffect(() => {
    if (currentTour && currentTour !== previousTour) {
      onTourStart?.(currentTour);
      setPreviousTour(currentTour);
    }
  }, [currentTour, previousTour, onTourStart]);

  // Track tour completion and skip
  useEffect(() => {
    if (previousTour && previousVisible && !isNextStepVisible) {
      // Tour was visible but now it's not - could be completion or skip
      // We'll treat this as completion for now
      onTourComplete?.(previousTour);
    }
    setPreviousVisible(isNextStepVisible);
  }, [isNextStepVisible, previousVisible, previousTour, onTourComplete]);

  return null; // This component doesn't render anything
}

// Main Controller Component
export function NextStepController({
  children,
  tours,
  accessibility = {
    enableKeyboardNavigation: true,
    enableScreenReaderSupport: true,
    respectReducedMotion: true,
    highContrastMode: false,
    announceSteps: true,
    focusManagement: true,
  },
  analytics,
  onTourStart,
  onTourComplete,
  onTourSkip,
  onError,
  enableErrorBoundary = true,
  customTheme,
}: NextStepControllerProps) {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // System preference detection
  const [systemPreferences, setSystemPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
  });

  // Detect system preferences
  useEffect(() => {
    const detectPreferences = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      setSystemPreferences({
        reducedMotion,
        highContrast,
      });
    };

    detectPreferences();
    
    // Listen for changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    motionMediaQuery.addEventListener('change', detectPreferences);
    contrastMediaQuery.addEventListener('change', detectPreferences);
    
    return () => {
      motionMediaQuery.removeEventListener('change', detectPreferences);
      contrastMediaQuery.removeEventListener('change', detectPreferences);
    };
  }, []);

  // Initialize component
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Enhanced tour lifecycle management
  const handleTourStart = useCallback((tourId: string) => {
    setCurrentTour(tourId);
    setStartTime(Date.now());
    
    // Analytics tracking
    analytics?.trackTourStart(tourId);
    
    // Callback
    onTourStart?.(tourId);
    
    // Screen reader announcement
    if (accessibility.announceSteps) {
      const announcement = `Tour "${tourId}" started`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 1000);
    }
  }, [analytics, onTourStart, accessibility.announceSteps]);

  const handleTourComplete = useCallback((tourId: string) => {
    const duration = startTime ? Date.now() - startTime : 0;
    
    // Analytics tracking
    analytics?.trackTourComplete(tourId, duration);
    
    // Callback
    onTourComplete?.(tourId);
    
    // Reset state
    setCurrentTour(null);
    setStartTime(null);
    
    // Screen reader announcement
    if (accessibility.announceSteps) {
      const announcement = `Tour "${tourId}" completed successfully`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 1000);
    }
  }, [startTime, analytics, onTourComplete, accessibility.announceSteps]);

  const handleTourSkip = useCallback((tourId: string, stepIndex: number) => {
    // Analytics tracking
    analytics?.trackTourSkip(tourId, stepIndex);
    
    // Callback
    onTourSkip?.(tourId, stepIndex);
    
    // Reset state
    setCurrentTour(null);
    setStartTime(null);
  }, [analytics, onTourSkip]);

  const handleError = useCallback((error: Error) => {
    // Analytics tracking
    if (currentTour) {
      analytics?.trackError(currentTour, error);
    }
    
    // Callback
    onError?.(error);
    
    console.error('NextStepController Error:', error);
  }, [currentTour, analytics, onError]);

  // Enhanced tours with accessibility and theming
  const enhancedTours = tours.map(tour => ({
    ...tour,
    steps: tour.steps.map((step: any) => ({
      ...step,
      // Add accessibility attributes
      'aria-label': step.title,
      'aria-describedby': `tour-step-${step.id}-description`,
      // Apply theme customizations
      style: {
        ...step.style,
        ...(customTheme && {
          '--nextstep-primary-color': customTheme.primaryColor,
          '--nextstep-background-color': customTheme.backgroundColor,
          '--nextstep-text-color': customTheme.textColor,
          '--nextstep-border-radius': customTheme.borderRadius,
        }),
      },
    })),
  }));

  // Keyboard navigation setup
  useEffect(() => {
    if (!accessibility.enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentTour) return;

      switch (event.key) {
        case 'Escape':
          // Skip current tour
          handleTourSkip(currentTour, 0);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          // Next step (handled by NextStep library)
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          // Previous step (handled by NextStep library)
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTour, accessibility.enableKeyboardNavigation, handleTourSkip]);

  // Content wrapper with animation support
  const ContentWrapper = ({ children }: { children: ReactNode }) => {
    const shouldAnimate = accessibility.respectReducedMotion ? !systemPreferences.reducedMotion : true;
    
    if (!shouldAnimate) {
      return <>{children}</>;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  };

  // Main component render
  const renderContent = () => (
    <NextStepProviderLib>
      <NextStep steps={enhancedTours}>
        <ContentWrapper>
          <NextStepEventHandler
            onTourStart={handleTourStart}
            onTourComplete={handleTourComplete}
            onTourSkip={handleTourSkip}
            onError={handleError}
          />
          {children}
        </ContentWrapper>
      </NextStep>
    </NextStepProviderLib>
  );

  // Render with or without error boundary
  if (enableErrorBoundary) {
    return (
      <NextStepErrorBoundary onError={handleError}>
        {renderContent()}
      </NextStepErrorBoundary>
    );
  }

  return renderContent();
}

// Default accessibility options
export const defaultAccessibilityOptions: AccessibilityOptions = {
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  respectReducedMotion: true,
  highContrastMode: false,
  announceSteps: true,
  focusManagement: true,
};

// Default analytics implementation (no-op)
export const defaultAnalytics: TourAnalytics = {
  trackTourStart: () => {},
  trackTourComplete: () => {},
  trackTourSkip: () => {},
  trackStepView: () => {},
  trackError: () => {},
}; 