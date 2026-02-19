import React from 'react'
import type {RailStyle} from '../utils/calculations'

interface RailStyleSelectorProps {
  value: RailStyle
  onChange: (value: RailStyle) => void
}

/**
 * Step 1: Choose the overall rail style (Victorian vs Rectangle).
 */
export function RailStyleSelector({value, onChange}: RailStyleSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">1. Choose your rail style</h3>
      <p className="text-sm text-gray-400">
        This controls the look of the top rail and the base pricing.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onChange('victorian')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'victorian' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            <img
              src="/icons/victorian-rail.svg"
              alt="Victorian top rail"
              className="h-full w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-white">Victorian top rail</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('rectangle')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'rectangle' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            <img
              src="/icons/rectangle-rail.svg"
              alt="Rectangle top rail"
              className="h-full w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-white">Rectangle top rail</span>
        </button>
      </div>
    </div>
  )
}

