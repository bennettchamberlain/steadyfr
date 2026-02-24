'use client'

import React from 'react'
import type {PicketStyle} from '../utils/calculations'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'
import {trackMetaEvent} from '@/app/components/MetaPixel'

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

      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => {
            trackGAEvent('quote_option_selected', {
              event_category: 'quote',
              event_label: 'picket_style_selected',
              option_type: 'picket_style',
              option_value: 'straight',
            })
            trackMetaEvent('ViewContent', {
              content_name: 'Picket Style Selected',
              content_category: 'Quote',
              content_type: 'picket_style',
              content_ids: ['straight'],
            })
            onChange('straight')
          }}
          className={`flex flex-col items-center p-2.5 rounded-lg border ${
            value === 'straight' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <div className="w-16 h-16 flex items-center justify-center">
            {/* Straight picket SVG is extremely narrow (36x2448), so we render it inline with explicit width to ensure visibility on mobile */}
            <svg
              viewBox="0 0 36 2448"
              className="h-full w-auto filter brightness-0 invert"
              style={{ minWidth: '4px' }}
              aria-label="Straight picket"
            >
              <rect x="0" y="0" width="36" height="2448" fill="currentColor" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white mt-2">Straight</span>
        </button>

        <button
          type="button"
          onClick={() => {
            trackGAEvent('quote_option_selected', {
              event_category: 'quote',
              event_label: 'picket_style_selected',
              option_type: 'picket_style',
              option_value: 'round',
            })
            trackMetaEvent('ViewContent', {
              content_name: 'Picket Style Selected',
              content_category: 'Quote',
              content_type: 'picket_style',
              content_ids: ['round'],
            })
            onChange('round')
          }}
          className={`flex flex-col items-center p-2.5 rounded-lg border ${
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
          onClick={() => {
            trackGAEvent('quote_option_selected', {
              event_category: 'quote',
              event_label: 'picket_style_selected',
              option_type: 'picket_style',
              option_value: 'square',
            })
            trackMetaEvent('ViewContent', {
              content_name: 'Picket Style Selected',
              content_category: 'Quote',
              content_type: 'picket_style',
              content_ids: ['square'],
            })
            onChange('square')
          }}
          className={`flex flex-col items-center p-2.5 rounded-lg border ${
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
