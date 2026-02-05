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
        This controls what fills the space between stanchions – pickets, cables, slats, or open.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shared "no infill" option */}
        <button
          type="button"
          onClick={() => onChange('none')}
          className={`flex flex-col items-start p-4 rounded-lg border ${
            value === 'none' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <span className="text-sm font-semibold text-white">No pickets / infill</span>
          <span className="text-xs text-gray-400 mt-1">
            Just the top rail and stanchions (often used with glass or open views).
          </span>
        </button>

        {/* Standard pickets (both styles) */}
        <button
          type="button"
          onClick={() => onChange('pickets')}
          className={`flex flex-col items-start p-4 rounded-lg border ${
            value === 'pickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <span className="text-sm font-semibold text-white">
            {isVictorian ? 'Victorian pickets' : 'Standard pickets'}
          </span>
          <span className="text-xs text-gray-400 mt-1">
            Vertical metal pickets with approximately 4&quot; spacing.
          </span>
        </button>

        {/* Victorian-only: twisted pickets */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => onChange('twistedPickets')}
            className={`flex flex-col items-start p-4 rounded-lg border ${
              value === 'twistedPickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white">Twisted pickets</span>
            <span className="text-xs text-gray-400 mt-1">
              Decorative twisted verticals for a more detailed look.
            </span>
          </button>
        )}

        {/* Victorian-only: extra ornamental pickets */}
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
            <span className="text-sm font-semibold text-white">Extra ornamental pickets</span>
            <span className="text-xs text-gray-400 mt-1">
              Heavier ornamentation for a very classic, high‑detail look.
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
              Horizontal stainless cables for a light, open feel.
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
              Tight horizontal slats for privacy and a modern look.
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

