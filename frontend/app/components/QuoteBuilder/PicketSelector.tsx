'use client'

import React from 'react'
import type {InfillType, RailStyle} from '../utils/calculations'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'
import {trackMetaEvent} from '@/app/components/MetaPixel'

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
      <div>
        <h3 className="text-lg font-semibold text-white">2. Choose your infill</h3>
        <p className="text-sm text-gray-400 mt-0">
          The material that fills the open space between stanchions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Shared "no infill" option */}
        <button
          type="button"
          onClick={() => {
            trackGAEvent('quote_option_selected', {
              event_category: 'quote',
              event_label: 'infill_selected',
              option_type: 'infill',
              option_value: 'none',
            })
            trackMetaEvent('ViewContent', {
              content_name: 'Infill Selected',
              content_category: 'Quote',
              content_type: 'infill',
              content_ids: ['none'],
            })
            onChange('none')
          }}
          className={`flex flex-col items-center p-4 rounded-lg border ${
            value === 'none' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
          } hover:border-white/70 transition-colors`}
        >
          <span className="text-sm font-semibold text-white text-center">No infill</span>
          <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
            Often used for wall mounted railings or ledges without a drop greater than 30&quot;.
          </span>
        </button>

        {/* Straight pickets (both styles) */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => {
              trackGAEvent('quote_option_selected', {
                event_category: 'quote',
                event_label: 'infill_selected',
                option_type: 'infill',
                option_value: 'pickets',
              })
              trackMetaEvent('ViewContent', {
                content_name: 'Infill Selected',
                content_category: 'Quote',
                content_type: 'infill',
                content_ids: ['pickets'],
              })
              onChange('pickets')
            }}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'pickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white text-center">Straight pickets</span>
            <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
              Pickets spaced by 3.5&quot;.
            </span>
          </button>
        )}

        {/* Standard pickets (Rectangle style) */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => {
              trackGAEvent('quote_option_selected', {
                event_category: 'quote',
                event_label: 'infill_selected',
                option_type: 'infill',
                option_value: 'pickets',
              })
              trackMetaEvent('ViewContent', {
                content_name: 'Infill Selected',
                content_category: 'Quote',
                content_type: 'infill',
                content_ids: ['pickets'],
              })
              onChange('pickets')
            }}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'pickets' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white text-center">Standard pickets</span>
            <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
              Pickets spaced by 3.5&quot;.
            </span>
          </button>
        )}

        {/* Victorian-only: Victorian pickets */}
        {isVictorian && (
          <button
            type="button"
            onClick={() => {
              trackGAEvent('quote_option_selected', {
                event_category: 'quote',
                event_label: 'infill_selected',
                option_type: 'infill',
                option_value: 'ornamentalPickets',
              })
              trackMetaEvent('ViewContent', {
                content_name: 'Infill Selected',
                content_category: 'Quote',
                content_type: 'infill',
                content_ids: ['ornamentalPickets'],
              })
              onChange('ornamentalPickets')
            }}
            className={`flex flex-col items-center p-4 rounded-lg border ${
              value === 'ornamentalPickets'
                ? 'border-white bg-gray-800'
                : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white text-center">Victorian pickets</span>
            <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
              Endless selection, prices may vary.
            </span>
          </button>
        )}

        {/* Rectangle-only: cable */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => {
              trackGAEvent('quote_option_selected', {
                event_category: 'quote',
                event_label: 'infill_selected',
                option_type: 'infill',
                option_value: 'cable',
              })
              trackMetaEvent('ViewContent', {
                content_name: 'Infill Selected',
                content_category: 'Quote',
                content_type: 'infill',
                content_ids: ['cable'],
              })
              onChange('cable')
            }}
            className={`flex flex-col items-center p-4 rounded-lg border sm:col-span-1 ${
              value === 'cable' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white text-center">Cable rail</span>
            <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
              Ten rows of cable vertically spaced by 3.5&quot;.
            </span>
          </button>
        )}

        {/* Rectangle-only: horizontal slats */}
        {!isVictorian && (
          <button
            type="button"
            onClick={() => {
              trackGAEvent('quote_option_selected', {
                event_category: 'quote',
                event_label: 'infill_selected',
                option_type: 'infill',
                option_value: 'slats',
              })
              trackMetaEvent('ViewContent', {
                content_name: 'Infill Selected',
                content_category: 'Quote',
                content_type: 'infill',
                content_ids: ['slats'],
              })
              onChange('slats')
            }}
            className={`flex flex-col items-center p-4 rounded-lg border sm:col-span-1 ${
              value === 'slats' ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'
            } hover:border-white/70 transition-colors`}
          >
            <span className="text-sm font-semibold text-white text-center">Horizontal slats</span>
            <span className="text-[10px] text-gray-400 mt-1 text-left w-full">
              Tightly spaced rectangular tubing spanning horizontally between stanchions.
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

