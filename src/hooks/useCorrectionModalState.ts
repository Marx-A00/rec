'use client';

import { useState, useEffect, useCallback } from 'react';

import type { ManualEditFieldState } from '@/components/admin/correction/manual/types';

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
  isManualEditMode?: boolean;
  manualEditState?: ManualEditFieldState;
}

const STORAGE_KEY_PREFIX = 'correction-modal-state-';

/**
 * Hook for managing correction modal state with sessionStorage persistence.
 *
 * State is persisted per albumId so users can navigate away and return
 * to the same step. State is cleared when modal closes or apply succeeds.
 *
 * Supports both search mode (4 steps: Current, Search, Preview, Apply) and
 * manual edit mode (3 steps: Current, Edit, Apply).
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
  const [isManualEditMode, setIsManualEditModeInternal] = useState(false);
  const [manualEditState, setManualEditStateInternal] = useState<
    ManualEditFieldState | undefined
  >(undefined);

  // Load state from sessionStorage when albumId changes
  useEffect(() => {
    if (!albumId) {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedResultMbidInternal(undefined);
      setIsAppliedInternal(false);
      setIsManualEditModeInternal(false);
      setManualEditStateInternal(undefined);
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
        setIsManualEditModeInternal(parsed.isManualEditMode ?? false);
        setManualEditStateInternal(parsed.manualEditState);
      } catch {
        setCurrentStepInternal(0);
        setSearchQueryInternal(undefined);
        setSearchOffsetInternal(0);
        setSelectedResultMbidInternal(undefined);
        setIsAppliedInternal(false);
        setIsManualEditModeInternal(false);
        setManualEditStateInternal(undefined);
      }
    } else {
      setCurrentStepInternal(0);
      setSearchQueryInternal(undefined);
      setSearchOffsetInternal(0);
      setSelectedResultMbidInternal(undefined);
      setIsAppliedInternal(false);
      setIsManualEditModeInternal(false);
      setManualEditStateInternal(undefined);
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
      isManualEditMode,
      manualEditState,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [
    albumId,
    currentStep,
    searchQuery,
    searchOffset,
    selectedResultMbid,
    isApplied,
    isManualEditMode,
    manualEditState,
  ]);

  /**
   * Set the current step.
   * Search mode: 0-3 (Current, Search, Preview, Apply)
   * Manual mode: 0-2 (Current, Edit, Apply)
   */
  const setCurrentStep = useCallback(
    (step: number) => {
      const maxStep = isManualEditMode ? 2 : 3;
      if (step >= 0 && step <= maxStep) {
        setCurrentStepInternal(step);
      }
    },
    [isManualEditMode]
  );

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
   * Set manual edit mode flag
   */
  const setManualEditMode = useCallback((mode: boolean) => {
    setIsManualEditModeInternal(mode);
    // Reset step to 0 when switching modes
    setCurrentStepInternal(0);
  }, []);

  /**
   * Set manual edit state
   */
  const setManualEditState = useCallback((state: ManualEditFieldState) => {
    setManualEditStateInternal(state);
  }, []);

  /**
   * Clear manual edit state
   */
  const clearManualEditState = useCallback(() => {
    setManualEditStateInternal(undefined);
    setIsManualEditModeInternal(false);
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
    setIsManualEditModeInternal(false);
    setManualEditStateInternal(undefined);
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
    isLastStep: currentStep === (isManualEditMode ? 2 : 3),
    // Search state
    searchQuery,
    setSearchQuery,
    searchOffset,
    setSearchOffset,
    selectedResultMbid,
    setSelectedResult,
    clearSearchState,
    // Manual edit state
    isManualEditMode,
    setManualEditMode,
    manualEditState,
    setManualEditState,
    clearManualEditState,
    // Apply state
    isApplied,
    setIsApplied,
    // Full state clear
    clearState,
  };
}
