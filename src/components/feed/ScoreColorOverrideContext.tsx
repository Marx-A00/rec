'use client';

import { createContext, useContext } from 'react';

type ScoreColorSet = {
  heartColor: string;
  textColor: string;
  bgGradient: string;
  borderColor: string;
};

export type ScoreColorFn = (score: number) => ScoreColorSet;

export const ScoreColorOverrideContext = createContext<ScoreColorFn | null>(
  null
);

export function useScoreColorOverride(): ScoreColorFn | null {
  return useContext(ScoreColorOverrideContext);
}
