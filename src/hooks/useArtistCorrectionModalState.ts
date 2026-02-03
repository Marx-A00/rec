'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Modal state stored in sessionStorage for artist correction.
 */
export interface ArtistModalState {
  currentStep: number;
  searchQuery?: string;
  searchOffset?: number;
  selectedArtistMbid?: string;
  isApplied?: boolean;
}

const STORAGE_KEY_PREFIX = 'artist-correction-modal-state-';

/**
 * Hook for managing artist correction modal state with sessionStorage persistence.
 *
 * State is persisted per artistId so users can navigate away and return
 * to the same step. State is cleared when modal closes or apply succeeds.
 *
 * 4 steps: Current (0), Search (1), Preview (2), Apply (3)
 * No manual edit mode for artist correction v1.
 *
 * @param artistId - The artist being corrected, or null if modal is closed
 * @returns State management interface
 */
export function useArtistCorrectionModalState(artistId: string | null) {
  const [currentStep, setCurrentStepInternal] = useState(0);
  const [searchQuery, setSearchQueryInternal] = useState<string | undefined>(
    undefined
  );
  const [searchOffset, setSearchOffsetInternal] = useState(0);
  const [selectedArtistMbid, setSelectedArtistMbidInternal] = useState<
    string | undefined
  >(undefined);
  const [isApplied, setIsAppliedInternal] = useState(false);

  // Load state from sessionStorage when artistId changes
  useEffect(() => {
    if (!artistId) {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedArtistMbidInternal(undefined);
      setIsAppliedInternal(false);
      return;
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${artistId}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ArtistModalState;
        setCurrentStepInternal(parsed.currentStep);
        setSearchQueryInternal(parsed.searchQuery);
        setSearchOffsetInternal(parsed.searchOffset ?? 0);
        setSelectedArtistMbidInternal(parsed.selectedArtistMbid);
        setIsAppliedInternal(parsed.isApplied ?? false);
      } catch {
        setCurrentStepInternal(0);
        setSearchQueryInternal(undefined);
        setSearchOffsetInternal(0);
        setSelectedArtistMbidInternal(undefined);
        setIsAppliedInternal(false);
      }
    } else {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedArtistMbidInternal(undefined);
      setIsAppliedInternal(false);
    }
  }, [artistId]);

  // Save state to sessionStorage when any state changes
  useEffect(() => {
    if (!artistId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${artistId}`;
    const state: ArtistModalState = {
      currentStep,
      searchQuery,
      searchOffset,
      selectedArtistMbid,
      isApplied,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    artistId,
    currentStep,
    searchQuery,
    searchOffset,
    selectedArtistMbid,
    isApplied,
  ]);

  /**
   * Set the current step (0-3).
   */
  const setCurrentStep = useCallback((step: number) => {
    if (step >= 0 && step <= 3) {
      setCurrentStepInternal(step);
    }
  }, []);

  /**
   * Set the search query (artist name)
   */
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryInternal(query);
  }, []);

  /**
   * Set the search offset for pagination
   */
  const setSearchOffset = useCallback((offset: number) => {
    setSearchOffsetInternal(offset);
  }, []);

  /**
   * Set the selected artist MBID
   */
  const setSelectedResult = useCallback((mbid: string) => {
    setSelectedArtistMbidInternal(mbid);
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
    setSelectedArtistMbidInternal(undefined);
  }, []);

  /**
   * Clear all state from sessionStorage.
   * Call on modal close or successful apply.
   */
  const clearState = useCallback(() => {
    if (!artistId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${artistId}`;
    sessionStorage.removeItem(storageKey);
    setCurrentStepInternal(0);
    setSearchQueryInternal(undefined);
    setSearchOffsetInternal(0);
    setSelectedArtistMbidInternal(undefined);
    setIsAppliedInternal(false);
  }, [artistId]);

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
    selectedArtistMbid,
    setSelectedResult,
    clearSearchState,
    // Apply state
    isApplied,
    setIsApplied,
    // Full state clear
    clearState,
  };
}
