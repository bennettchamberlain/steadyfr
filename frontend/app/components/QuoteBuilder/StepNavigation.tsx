import React from 'react'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  onStepChange: (step: number) => void
}

/**
 * Simple step indicator with Back/Next style controls.
 * For the MVP we keep behavior minimal but clear.
 */
export function StepNavigation({currentStep, totalSteps, onStepChange}: StepNavigationProps) {
  const canGoBack = currentStep > 1
  const canGoNext = currentStep < totalSteps

  return (
    <div className="flex items-center justify-between border-t border-gray-700 pt-4 mt-6">
      <div className="text-sm text-gray-400">
        Step {currentStep} of {totalSteps}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => canGoBack && onStepChange(currentStep - 1)}
          className="px-3 py-2 rounded-md text-sm border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => canGoNext && onStepChange(currentStep + 1)}
          className="px-3 py-2 rounded-md text-sm bg-white text-gray-900 font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

