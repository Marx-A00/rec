'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Modal state stored in sessionStorage
 */
export interface ModalState {
  currentStep: number;
}

const STORAGE_KEY_PREFIX = 'correction-modal-state-';
const DEFAULT_STATE: ModalState = { currentStep: 0 };

/**
 * Hook for managing correction modal state with sessionStorage persistence.
 *
 * State is persisted per albumId so users can navigate away and return
 * to the same step. State is cleared when modal closes or apply succeeds.
 *
 * @param albumId - The album being corrected, or null if modal is closed
 * @returns State management interface
 */
export function useCorrectionModalState(albumId: string | null) {
  const [currentStep, setCurrentStepInternal] = useState(0);

  // Load state from sessionStorage when albumId changes
  useEffect(() => {
    if (!albumId) {
      setCurrentStepInternal(0);
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ModalState;
        setCurrentStepInternal(parsed.currentStep);
      } catch {
        setCurrentStepInternal(0);
      }
    } else {
      setCurrentStepInternal(0);
    }
  }, [albumId]);

  // Save state to sessionStorage when currentStep changes
  useEffect(() => {
    if (!albumId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    const state: ModalState = { currentStep };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [albumId, currentStep]);

  /**
   * Set the current step (0-indexed, 3 steps total)
   */
  const setCurrentStep = useCallback((step: number) => {
    if (step >= 0 && step <= 2) {
      setCurrentStepInternal(step);
    }
  }, []);

  /**
   * Clear state from sessionStorage.
   * Call on modal close or successful apply.
   */
  const clearState = useCallback(() => {
    if (!albumId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    sessionStorage.removeItem(storageKey);
    setCurrentStepInternal(0);
  }, [albumId]);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    setCurrentStep(currentStep + 1);
  }, [currentStep, setCurrentStep]);

  /**
   * Navigate to previous step
   */
  const prevStep = useCallback(() => {
    setCurrentStep(currentStep - 1);
  }, [currentStep, setCurrentStep]);

  return {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    clearState,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === 2,
  };
}
