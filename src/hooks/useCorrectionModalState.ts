'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Search query state for correction modal
 */
export interface SearchQueryState {
  albumTitle: string;
  artistName: string;
}

/**
 * Modal state stored in sessionStorage
 */
export interface ModalState {
  currentStep: number;
  searchQuery?: SearchQueryState;
  searchOffset?: number;
  selectedResultMbid?: string;
  isApplied?: boolean;
}

const STORAGE_KEY_PREFIX = 'correction-modal-state-';

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
  const [searchQuery, setSearchQueryInternal] = useState<
    SearchQueryState | undefined
  >(undefined);
  const [searchOffset, setSearchOffsetInternal] = useState(0);
  const [selectedResultMbid, setSelectedResultMbidInternal] = useState<
    string | undefined
  >(undefined);
  const [isApplied, setIsAppliedInternal] = useState(false);

  // Load state from sessionStorage when albumId changes
  useEffect(() => {
    if (!albumId) {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedResultMbidInternal(undefined);
      setIsAppliedInternal(false);
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ModalState;
        setCurrentStepInternal(parsed.currentStep);
        setSearchQueryInternal(parsed.searchQuery);
        setSearchOffsetInternal(parsed.searchOffset ?? 0);
        setSelectedResultMbidInternal(parsed.selectedResultMbid);
        setIsAppliedInternal(parsed.isApplied ?? false);
      } catch {
        setCurrentStepInternal(0);
        setSearchQueryInternal(undefined);
        setSearchOffsetInternal(0);
        setSelectedResultMbidInternal(undefined);
        setIsAppliedInternal(false);
      }
    } else {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedResultMbidInternal(undefined);
      setIsAppliedInternal(false);
    }
  }, [albumId]);

  // Save state to sessionStorage when any state changes
  useEffect(() => {
    if (!albumId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    const state: ModalState = {
      currentStep,
      searchQuery,
      searchOffset,
      selectedResultMbid,
      isApplied,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    albumId,
    currentStep,
    searchQuery,
    searchOffset,
    selectedResultMbid,
    isApplied,
  ]);

  /**
   * Set the current step (0-indexed, 4 steps total: 0=Current, 1=Search, 2=Preview, 3=Apply)
   */
  const setCurrentStep = useCallback((step: number) => {
    if (step >= 0 && step <= 3) {
      setCurrentStepInternal(step);
    }
  }, []);

  /**
   * Set the search query
   */
  const setSearchQuery = useCallback((query: SearchQueryState) => {
    setSearchQueryInternal(query);
  }, []);

  /**
   * Set the search offset for pagination
   */
  const setSearchOffset = useCallback((offset: number) => {
    setSearchOffsetInternal(offset);
  }, []);

  /**
   * Set the selected result MBID
   */
  const setSelectedResult = useCallback((mbid: string) => {
    setSelectedResultMbidInternal(mbid);
  }, []);

  /**
   * Set applied status
   */
  const setIsApplied = useCallback((value: boolean) => {
    setIsAppliedInternal(value);
  }, []);

  /**
   * Clear search state (query, offset, selection)
   */
  const clearSearchState = useCallback(() => {
    setSearchQueryInternal(undefined);
    setSearchOffsetInternal(0);
    setSelectedResultMbidInternal(undefined);
  }, []);

  /**
   * Clear all state from sessionStorage.
   * Call on modal close or successful apply.
   */
  const clearState = useCallback(() => {
    if (!albumId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${albumId}`;
    sessionStorage.removeItem(storageKey);
    setCurrentStepInternal(0);
    setSearchQueryInternal(undefined);
    setSearchOffsetInternal(0);
    setSelectedResultMbidInternal(undefined);
    setIsAppliedInternal(false);
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
    // Step navigation
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === 3,
    // Search state
    searchQuery,
    setSearchQuery,
    searchOffset,
    setSearchOffset,
    selectedResultMbid,
    setSelectedResult,
    clearSearchState,
    // Apply state
    isApplied,
    setIsApplied,
    // Full state clear
    clearState,
  };
}
