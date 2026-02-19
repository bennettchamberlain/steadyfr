import React from 'react'
import type {InfillType, RailStyle} from '../utils/calculations'

interface PicketSelectorProps {
  style: RailStyle
  value: InfillType
  onChange: (value: InfillType) => void
}

/**
 * Step 2: Choose picket / infill option.
 *
 * - Victorian: standard, twisted, or extra ornamental pickets (plus "none").
 * - Rectangle: standard pickets, cable, slats, or none.
 */
export function PicketSelector({style, value, onChange}: PicketSelectorProps) {
  const isVictorian = style === 'victorian'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">2. Choose your infill</h3>
      <p className="text-sm text-gray-400">
        The material that fills the open space between stanchions.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Shared "no infill" option */}
        <button
          type="button"
          onClick={() => onChange('none')}
          className={`flex flex-col items-start p-4 rounded-lg border ${
            value === 'none' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <span className="text-sm font-semibold text-white">No infill</span>
          <span className="text-xs text-gray-400 mt-1">
            Often used for wall mounted railings or ledges without a drop greater than 30&quot;.
          </span>
        </button>

        {/* Straight pickets (both styles) */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => onChange('pickets')}
            className={`flex flex-col items-start p-4 rounded-lg border ${
              value === 'pickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Straight pickets</span>
            <span className="text-xs text-gray-400 mt-1">
              Vertical metal pickets with approximately 4&quot; spacing.
            </span>
          </button>
        )}

        {/* Standard pickets (Rectangle style) */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('pickets')}
            className={`flex flex-col items-start p-4 rounded-lg border ${
              value === 'pickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Standard pickets</span>
            <span className="text-xs text-gray-400 mt-1">
              Pickets spaced by 3.5&quot;.
            </span>
          </button>
        )}

        {/* Victorian-only: Victorian pickets */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => onChange('ornamentalPickets')}
            className={`flex flex-col items-start p-4 rounded-lg border ${
              value === 'ornamentalPickets'
                ? 'border-white bg-gray-800'
                : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Victorian pickets</span>
            <span className="text-xs text-gray-400 mt-1">
              Endless options, pricing will vary
            </span>
          </button>
        )}

        {/* Rectangle-only: cable */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('cable')}
            className={`flex flex-col items-start p-4 rounded-lg border sm:col-span-1 ${
              value === 'cable' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Cable rail</span>
            <span className="text-xs text-gray-400 mt-1">
              10 rows of cable spaced by 3.5&quot; vertically.
            </span>
          </button>
        )}

        {/* Rectangle-only: horizontal slats */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => onChange('slats')}
            className={`flex flex-col items-start p-4 rounded-lg border sm:col-span-1 ${
              value === 'slats' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Horizontal slats</span>
            <span className="text-xs text-gray-400 mt-1">
              Tightly spaced rectangular tubing spanning horizontally between stanchions.
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

