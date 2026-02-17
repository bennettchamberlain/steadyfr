import React from 'react'
import type {PicketStyle} from '../utils/calculations'

interface PicketStyleSelectorProps {
  value: PicketStyle
  onChange: (value: PicketStyle) => void
}

/**
 * Picket style selector for rectangular rails with pickets.
 * Allows users to choose between straight, round, or square pickets.
 */
export function PicketStyleSelector({value, onChange}: PicketStyleSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Choose your picket style</h3>
      <p className="text-sm text-gray-400">
        Select the shape of your pickets.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onChange('straight')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'straight' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src="/picket-assets/straight.svg"
              alt="Straight picket"
              className="h-full w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-white mt-2">Straight</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('round')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'round' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src="/picket-assets/round.svg"
              alt="Round picket"
              className="h-full w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-white mt-2">Round</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('square')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'square' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src="/picket-assets/square.svg"
              alt="Square picket"
              className="h-full w-auto object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-white mt-2">Square</span>
        </button>
      </div>
    </div>
  )
}
