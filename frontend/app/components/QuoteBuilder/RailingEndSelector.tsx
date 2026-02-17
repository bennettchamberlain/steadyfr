import React from 'react'
import type {RailStyle, RailingEndType} from '../utils/calculations'

interface RailingEndSelectorProps {
  style: RailStyle
  value: RailingEndType
  onChange: (value: RailingEndType) => void
}

/**
 * Step 2: Choose railing end style.
 * - Rectangle: straight, fold down, fold back, none
 * - Victorian: straight, custom (uses fold down behavior)
 */
export function RailingEndSelector({style, value, onChange}: RailingEndSelectorProps) {
  const isVictorian = style === 'victorian'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">3. Choose your railing ends</h3>
      <p className="text-sm text-gray-400">
        Select how the railing ends at the first and last stanchions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Straight – shared */}
        <button
          type="button"
          onClick={() => onChange('straight')}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'straight' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            <img src="/icons/railing-end-straight.svg" alt="Straight" className="w-full h-full" />
          </div>
          <span className="text-sm font-semibold text-white">Straight</span>
        </button>

        {/* Rectangle-only: fold down */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('foldDown')}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'foldDown' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <div className="w-16 h-16 mb-2 flex items-center justify-center">
              <img src="/icons/railing-end-fold-down.svg" alt="Fold down" className="w-full h-full" />
            </div>
            <span className="text-sm font-semibold text-white">Fold down</span>
          </button>
        )}

        {/* Rectangle-only: fold back */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('foldBack')}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'foldBack' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <div className="w-16 h-16 mb-2 flex items-center justify-center">
              <img src="/icons/railing-end-fold-back.svg" alt="Fold back" className="w-full h-full" />
            </div>
            <span className="text-sm font-semibold text-white">Fold back</span>
          </button>
        )}

        {/* Rectangle-only: none */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('none')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
              value === 'none' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">None</span>
          </button>
        )}

        {/* Victorian-only: custom (maps to foldDown behavior) */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => onChange('foldDown')}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'foldDown' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <div className="w-16 h-16 mb-2 flex items-center justify-center">
              <img src="/icons/railing-end-fold-down.svg" alt="Custom" className="w-full h-full" />
            </div>
            <span className="text-sm font-semibold text-white">Custom</span>
          </button>
        )}
      </div>
    </div>
  )
}
