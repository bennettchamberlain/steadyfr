'use client'

import React, {useEffect, useMemo, useState} from 'react'
import {
  calculateMaterials,
  calculatePrice,
  type InfillType,
  type RailStyle,
  type SectionConfig,
} from '../utils/calculations'
import {DiagramRenderer} from './DiagramRenderer'
import {PicketSelector} from './PicketSelector'
import {QuoteSummary} from './QuoteSummary'
import {RailStyleSelector} from './RailStyleSelector'
import {SectionsConfigurator} from './SectionsConfigurator'
import {StepNavigation} from './StepNavigation'

const TOTAL_STEPS = 4

/**
 * Main QuoteBuilder component.
 *
 * MVP scope:
 * - Single straight (flat) section
 * - Victorian vs Rectangle rail styles
 * - One picket option for each style + basic cable/slats/none options
 * - Live 2D SVG diagram and real-time price calculation
 */
export function QuoteBuilder() {
  const [currentStep, setCurrentStep] = useState(1)
  const [style, setStyle] = useState<RailStyle>('victorian')
  const [infill, setInfill] = useState<InfillType>('pickets')
  const [sections, setSections] = useState<SectionConfig[]>([])

  // Initialize sections when user reaches step 3
  useEffect(() => {
    if (currentStep >= 3 && sections.length === 0) {
      setSections([{id: '1', lengthFeet: 10, type: 'flat'}])
    }
  }, [currentStep, sections.length])

  const materials = useMemo(
    () => calculateMaterials(style, infill, sections),
    [style, infill, sections],
  )
  const price = useMemo(() => calculatePrice(style, infill, materials), [style, infill, materials])

  // Basic guard so the user can't move past steps without a sensible length
  const handleStepChange = (step: number) => {
    if (step > currentStep && sections.some((s) => s.lengthFeet <= 0)) {
      // For MVP we just prevent moving forward instead of showing a full error system
      return
    }
    setCurrentStep(step)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)]">
      {/* Left: Form / Decision tree */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Build your railing in a minute
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Answer a few quick questions to see layout, materials, and an instant ballpark price.
        </p>

        <div className="space-y-8">
          {currentStep >= 1 && (
            <div>
              <RailStyleSelector value={style} onChange={setStyle} />
            </div>
          )}

          {currentStep >= 2 && (
            <div>
              <PicketSelector style={style} value={infill} onChange={setInfill} />
            </div>
          )}

          {currentStep >= 3 && (
            <div>
              <SectionsConfigurator sections={sections} onChange={setSections} />
            </div>
          )}

          {currentStep >= 4 && (
            <div>
              <QuoteSummary
                style={style}
                infill={infill}
                materials={materials}
                price={price}
              />
            </div>
          )}

          <StepNavigation
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onStepChange={handleStepChange}
          />
        </div>
      </div>

      {/* Right: Live diagram + quick totals */}
      <div className="space-y-4">
        {currentStep >= 3 && sections.length > 0 && (
          <DiagramRenderer
            style={style}
            infill={infill}
            materials={materials}
            sections={sections}
          />
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">
                Running total (est.)
              </div>
              <div className="text-xl font-semibold text-white">
                ${price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </div>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>Materials: ${price.materials.toFixed(0)}</div>
              <div>Labor (approx.): ${price.labor.toFixed(0)}</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Update the length and options on the left to see the price change in real time.
          </p>
        </div>
      </div>
    </div>
  )
}

