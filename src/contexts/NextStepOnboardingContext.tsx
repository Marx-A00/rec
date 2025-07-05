// src/contexts/NextStepOnboardingContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNextStep } from 'nextstepjs';

// Tour types and interfaces
export interface TourStep {
  id: string;
  title: string;
  content: string;
  selector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: string;
  metadata?: {
    category: string;
    duration?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface TourConfig {
  tour: string;
  title: string;
  description: string;
  steps: TourStep[];
  metadata?: {
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  };
}

export interface TourProgress {
  tourId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  skippedAt?: Date;
}

export interface OnboardingContextType {
  // Current tour state
  currentTour: string | null;
  currentStep: number;
  tourProgress: TourProgress | null;
  isOnboardingActive: boolean;
  
  // Tour management
  startOnboarding: (tourId: string) => void;
  skipOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  switchTour: (tourId: string) => void;
  
  // Tour progress
  getTourProgress: (tourId: string) => TourProgress | null;
  markStepCompleted: (stepIndex: number) => void;
  resetTour: (tourId: string) => void;
  
  // Tour configuration
  availableTours: TourConfig[];
  getTourConfig: (tourId: string) => TourConfig | null;
  
  // Event handlers
  onTourStart?: (tourId: string) => void;
  onTourComplete?: (tourId: string) => void;
  onTourSkip?: (tourId: string) => void;
  onStepChange?: (stepIndex: number, tourId: string) => void;
}

const NextStepOnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface NextStepOnboardingProviderProps {
  children: ReactNode;
  onTourStart?: (tourId: string) => void;
  onTourComplete?: (tourId: string) => void;
  onTourSkip?: (tourId: string) => void;
  onStepChange?: (stepIndex: number, tourId: string) => void;
}

export function NextStepOnboardingProvider({
  children,
  onTourStart,
  onTourComplete,
  onTourSkip,
  onStepChange,
}: NextStepOnboardingProviderProps) {
  // State management
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourProgress, setTourProgress] = useState<TourProgress | null>(null);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [progressHistory, setProgressHistory] = useState<Map<string, TourProgress>>(new Map());

  // NextStep integration
  const { startNextStep, closeNextStep } = useNextStep();

  // Available tours configuration (will be expanded in Task 4)
  const availableTours: TourConfig[] = [
    {
      tour: 'welcome',
      title: 'Welcome to Rec!',
      description: 'Get started with discovering and sharing music recommendations',
      steps: [
        {
          id: 'welcome-step',
          title: 'Welcome to Rec!',
          content: 'This is your music discovery platform. Let\'s show you around!',
          selector: '#welcome-step',
          position: 'bottom',
          icon: '🎵',
          metadata: {
            category: 'introduction',
            duration: 3000,
            difficulty: 'beginner',
          },
        },
      ],
      metadata: {
        category: 'introduction',
        difficulty: 'beginner',
        estimatedDuration: 30000,
      },
    },
  ];

  // Tour configuration helpers
  const getTourConfig = useCallback((tourId: string): TourConfig | null => {
    return availableTours.find(tour => tour.tour === tourId) || null;
  }, [availableTours]);

  // Progress management
  const getTourProgress = useCallback((tourId: string): TourProgress | null => {
    return progressHistory.get(tourId) || null;
  }, [progressHistory]);

  const createTourProgress = useCallback((tourId: string): TourProgress => {
    const tourConfig = getTourConfig(tourId);
    if (!tourConfig) {
      throw new Error(`Tour configuration not found for: ${tourId}`);
    }

    return {
      tourId,
      currentStep: 0,
      totalSteps: tourConfig.steps.length,
      completedSteps: [],
      isCompleted: false,
      startedAt: new Date(),
    };
  }, [getTourConfig]);

  // Core tour management functions
  const startOnboarding = useCallback((tourId: string) => {
    const tourConfig = getTourConfig(tourId);
    if (!tourConfig) {
      console.error(`Tour configuration not found for: ${tourId}`);
      return;
    }

    // Create or update progress
    const progress = createTourProgress(tourId);
    setTourProgress(progress);
    setProgressHistory(prev => new Map(prev).set(tourId, progress));

    // Update state
    setCurrentTour(tourId);
    setCurrentStep(0);
    setIsOnboardingActive(true);

    // Start NextStep tour
    startNextStep(tourId);

    // Trigger callback
    onTourStart?.(tourId);
  }, [getTourConfig, createTourProgress, startNextStep, onTourStart]);

  const skipOnboarding = useCallback(() => {
    if (!currentTour) return;

    // Update progress
    if (tourProgress) {
      const updatedProgress = {
        ...tourProgress,
        skippedAt: new Date(),
      };
      setTourProgress(updatedProgress);
      setProgressHistory(prev => new Map(prev).set(currentTour, updatedProgress));
    }

    // Stop NextStep tour
    closeNextStep();

    // Trigger callback
    onTourSkip?.(currentTour);

    // Reset state
    setCurrentTour(null);
    setCurrentStep(0);
    setIsOnboardingActive(false);
    setTourProgress(null);
  }, [currentTour, tourProgress, closeNextStep, onTourSkip]);

  const nextStep = useCallback(() => {
    if (!currentTour || !tourProgress) return;

    const tourConfig = getTourConfig(currentTour);
    if (!tourConfig) return;

    const nextStepIndex = currentStep + 1;
    if (nextStepIndex < tourConfig.steps.length) {
      setCurrentStep(nextStepIndex);
      onStepChange?.(nextStepIndex, currentTour);
    } else {
      // Tour completed
      const completedProgress = {
        ...tourProgress,
        currentStep: nextStepIndex,
        isCompleted: true,
        completedAt: new Date(),
      };
      setTourProgress(completedProgress);
      setProgressHistory(prev => new Map(prev).set(currentTour, completedProgress));

      onTourComplete?.(currentTour);
      setIsOnboardingActive(false);
    }
  }, [currentTour, currentStep, tourProgress, getTourConfig, onStepChange, onTourComplete]);

  const prevStep = useCallback(() => {
    if (!currentTour || currentStep <= 0) return;

    const prevStepIndex = currentStep - 1;
    setCurrentStep(prevStepIndex);
    onStepChange?.(prevStepIndex, currentTour);
  }, [currentTour, currentStep, onStepChange]);

  const goToStep = useCallback((stepIndex: number) => {
    if (!currentTour || !tourProgress) return;

    const tourConfig = getTourConfig(currentTour);
    if (!tourConfig || stepIndex < 0 || stepIndex >= tourConfig.steps.length) return;

    setCurrentStep(stepIndex);
    onStepChange?.(stepIndex, currentTour);
  }, [currentTour, tourProgress, getTourConfig, onStepChange]);

  const switchTour = useCallback((tourId: string) => {
    // Stop current tour if active
    if (isOnboardingActive) {
      closeNextStep();
    }

    // Start new tour
    startOnboarding(tourId);
  }, [isOnboardingActive, closeNextStep, startOnboarding]);

  const markStepCompleted = useCallback((stepIndex: number) => {
    if (!currentTour || !tourProgress) return;

    const updatedProgress = {
      ...tourProgress,
      completedSteps: [...tourProgress.completedSteps, stepIndex].filter(
        (step, index, arr) => arr.indexOf(step) === index // Remove duplicates
      ),
    };
    setTourProgress(updatedProgress);
    setProgressHistory(prev => new Map(prev).set(currentTour, updatedProgress));
  }, [currentTour, tourProgress]);

  const resetTour = useCallback((tourId: string) => {
    // Remove from progress history
    setProgressHistory(prev => {
      const newMap = new Map(prev);
      newMap.delete(tourId);
      return newMap;
    });

    // If it's the current tour, reset state
    if (currentTour === tourId) {
      setCurrentTour(null);
      setCurrentStep(0);
      setIsOnboardingActive(false);
      setTourProgress(null);
      closeNextStep();
    }
  }, [currentTour, closeNextStep]);

  // Context value
  const contextValue: OnboardingContextType = {
    // Current tour state
    currentTour,
    currentStep,
    tourProgress,
    isOnboardingActive,
    
    // Tour management
    startOnboarding,
    skipOnboarding,
    nextStep,
    prevStep,
    goToStep,
    switchTour,
    
    // Tour progress
    getTourProgress,
    markStepCompleted,
    resetTour,
    
    // Tour configuration
    availableTours,
    getTourConfig,
    
    // Event handlers
    onTourStart,
    onTourComplete,
    onTourSkip,
    onStepChange,
  };

  return (
    <NextStepOnboardingContext.Provider value={contextValue}>
      {children}
    </NextStepOnboardingContext.Provider>
  );
}

export function useNextStepOnboarding() {
  const context = useContext(NextStepOnboardingContext);
  if (context === undefined) {
    throw new Error('useNextStepOnboarding must be used within a NextStepOnboardingProvider');
  }
  return context;
}

// Legacy compatibility hook (maintains existing API)
export function useOnboarding() {
  return useNextStepOnboarding();
} 