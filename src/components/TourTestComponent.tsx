// src/components/TourTestComponent.tsx
'use client'

import { useNextStep } from 'nextstepjs'
import { Button } from '@/components/ui/button'

export default function TourTestComponent() {
  const { startNextStep } = useNextStep()

  const startWelcomeTour = () => {
    startNextStep('welcome-onboarding')
  }

  const startNavigationTour = () => {
    startNextStep('navigation-basics')
  }

  const startCollectionTour = () => {
    startNextStep('collection-building')
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Tour Tests</h3>
      <div className="space-y-2">
        <Button onClick={startWelcomeTour} variant="outline" size="sm">
          Start Welcome Tour
        </Button>
        <Button onClick={startNavigationTour} variant="outline" size="sm">
          Start Navigation Tour
        </Button>
        <Button onClick={startCollectionTour} variant="outline" size="sm">
          Start Collection Tour
        </Button>
      </div>
    </div>
  )
} 