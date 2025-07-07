// src/components/TourTestComponent.tsx
'use client'

import { useNextStep } from 'nextstepjs'
import { Button } from '@/components/ui/button'

export default function TourTestComponent() {
  const { startNextStep } = useNextStep()

  const startWelcomeTour = () => {
    startNextStep('welcome-onboarding')
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Welcome Tour</h3>
      <div className="space-y-2">
        <Button onClick={startWelcomeTour} variant="outline" size="sm">
          Start Welcome Tour
        </Button>
      </div>
    </div>
  )
} 