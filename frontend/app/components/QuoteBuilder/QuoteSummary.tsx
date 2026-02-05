import React from 'react'
import type {InfillType, MaterialBreakdown, PriceBreakdown, RailStyle} from '../utils/calculations'

interface QuoteSummaryProps {
  style: RailStyle
  infill: InfillType
  materials: MaterialBreakdown
  price: PriceBreakdown
}

/**
 * Final step summary of configuration, materials, and pricing.
 */
export function QuoteSummary({style, infill, materials, price}: QuoteSummaryProps) {
  const styleLabel = style === 'victorian' ? 'Victorian top rail' : 'Rectangle top rail'

  const infillLabelMap: Record<InfillType, string> = {
    none: 'No pickets / infill',
    pickets: 'Vertical pickets',
    twistedPickets: 'Twisted pickets',
    ornamentalPickets: 'Extra ornamental pickets',
    cable: 'Cable rail',
    slats: 'Horizontal slats',
  }

  const usesPickets =
    infill === 'pickets' || infill === 'twistedPickets' || infill === 'ornamentalPickets'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">4. Quote summary</h3>
      <p className="text-sm text-gray-400">
        This is an instant ballpark quote based on a single straight section. We&apos;ll confirm all
        details during your site visit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Configuration</h4>
          <div className="text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Style</span>
              <span>{styleLabel}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400">
                {usesPickets ? 'Pickets' : 'Infill'}
              </span>
              <span>
                {usesPickets
                  ? `${materials.picketCount} pickets`
                  : infillLabelMap[infill]}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400">Section length</span>
              <span>{materials.topRailFeet.toFixed(1)} ft</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Materials</h4>
          <dl className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-400">Top rail</dt>
              <dd>{materials.topRailFeet.toFixed(1)} ft</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Stanchions</dt>
              <dd>{materials.stanchionCount}</dd>
            </div>
            {materials.picketCount > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Pickets</dt>
                <dd>{materials.picketCount}</dd>
              </div>
            )}
            {materials.cableFeet > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Cable</dt>
                <dd>{materials.cableFeet.toFixed(1)} ft</dd>
              </div>
            )}
            {materials.slatFeet > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Horizontal slats</dt>
                <dd>{materials.slatFeet.toFixed(1)} ft</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Estimated total</div>
            <div className="text-2xl font-semibold text-white">
              ${price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Materials: ${price.materials.toFixed(2)}</div>
            <div>Labor (approx.): ${price.labor.toFixed(2)}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          This is a preliminary estimate based on typical conditions. Final pricing may vary with
          site access, mounting conditions, and design details.
        </p>
      </div>
    </div>
  )
}

