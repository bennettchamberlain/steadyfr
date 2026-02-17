'use client'

import React, {useEffect, useMemo, useRef, useState} from 'react'
import {
  calculateMaterials,
  calculatePrice,
  type InfillType,
  type PicketStyle,
  type RailStyle,
  type SectionConfig,
} from '../utils/calculations'
import {DiagramRenderer} from './DiagramRenderer'
import {PicketSelector} from './PicketSelector'
import {PicketStyleSelector} from './PicketStyleSelector'
import {QuoteSummary} from './QuoteSummary'
import {RailStyleSelector} from './RailStyleSelector'
import {RailingEndSelector} from './RailingEndSelector'
import type {RailingEndType} from '../utils/calculations'
import {SectionsConfigurator} from './SectionsConfigurator'
import {StepNavigation} from './StepNavigation'

const TOTAL_STEPS = 5

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
  const [railingEnd, setRailingEnd] = useState<RailingEndType>('none')
  const [infill, setInfill] = useState<InfillType>('pickets')
  const [picketStyle, setPicketStyle] = useState<PicketStyle>('straight')
  const [sections, setSections] = useState<SectionConfig[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const diagramRef = useRef<HTMLDivElement | null>(null)
  const [isDiagramFixed, setIsDiagramFixed] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const originalLeftRef = useRef<number | null>(null)
  const originalWidthRef = useRef<number | null>(null)
  const scrollThresholdRef = useRef<number | null>(null)
  const originalAbsoluteTopRef = useRef<number | null>(null)
  const isDiagramFixedRef = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  // Track client-side mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize sections when user reaches step 1 (show 10ft section from start)
  useEffect(() => {
    if (sections.length === 0) {
      setSections([{id: '1', lengthFeet: 10, type: 'flat'}])
    }
  }, [sections.length])

  // Simple threshold-based tracking
  useEffect(() => {
    if (!isMounted) return

    const handleScroll = () => {
      if (!diagramRef.current) return

      const currentScrollY = window.scrollY
      const topOffset = 100

      // Capture original positions once
      if (originalLeftRef.current === null && diagramRef.current) {
        const rect = diagramRef.current.getBoundingClientRect()
        originalLeftRef.current = rect.left
        originalWidthRef.current = rect.width
        originalAbsoluteTopRef.current = rect.top + currentScrollY
        scrollThresholdRef.current = currentScrollY + rect.top - topOffset
      }

      // Update scroll position for position calculation
      setScrollY(currentScrollY)

      // Simple threshold check - only fix if we have original positions
      if (scrollThresholdRef.current !== null && originalLeftRef.current !== null && originalAbsoluteTopRef.current !== null) {
        const shouldBeFixed = currentScrollY >= scrollThresholdRef.current
        if (shouldBeFixed !== isDiagramFixedRef.current) {
          isDiagramFixedRef.current = shouldBeFixed
          setIsDiagramFixed(shouldBeFixed)
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, {passive: true})
    window.addEventListener('resize', () => {
      originalLeftRef.current = null
      originalWidthRef.current = null
      originalAbsoluteTopRef.current = null
      scrollThresholdRef.current = null
      handleScroll()
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isMounted])

  // Recalculate threshold when diagram content changes (sections affect diagram size)
  useEffect(() => {
    if (!isMounted || !diagramRef.current) return
    
    // Use requestAnimationFrame to ensure DOM has updated after section changes
    requestAnimationFrame(() => {
      if (!diagramRef.current) return
      
      const currentScrollY = window.scrollY
      const topOffset = 100
      
      // If diagram is currently fixed, we need to temporarily unfix it to measure original position
      const wasFixed = isDiagramFixedRef.current
      if (wasFixed) {
        isDiagramFixedRef.current = false
        setIsDiagramFixed(false)
      }
      
      // Wait for next frame to ensure layout has updated
      requestAnimationFrame(() => {
        if (!diagramRef.current) return
        
        const rect = diagramRef.current.getBoundingClientRect()
        
        // Only update if we have valid measurements
        if (rect.width > 0 && rect.height > 0) {
          // Calculate absolute position: viewport position + scroll offset
          const absoluteTop = rect.top + currentScrollY
          
          originalLeftRef.current = rect.left
          originalWidthRef.current = rect.width
          originalAbsoluteTopRef.current = absoluteTop
          // Threshold is when scroll reaches the diagram's absolute top minus the offset
          scrollThresholdRef.current = absoluteTop - topOffset
          
          // Restore fixed state if it should be fixed based on new threshold
          const shouldBeFixed = currentScrollY >= scrollThresholdRef.current
          isDiagramFixedRef.current = shouldBeFixed
          setIsDiagramFixed(shouldBeFixed)
        } else if (wasFixed) {
          // Restore fixed state if measurement failed
          isDiagramFixedRef.current = true
          setIsDiagramFixed(true)
        }
      })
    })
  }, [isMounted, sections])

  const materials = useMemo(
    () => calculateMaterials(style, infill, sections),
    [style, infill, sections],
  )
  const price = useMemo(
    () => calculatePrice(style, infill, materials, sections, picketStyle, railingEnd),
    [style, infill, materials, sections, picketStyle, railingEnd],
  )

  // Basic guard so the user can't move past steps without a sensible length
  const handleStepChange = (step: number) => {
    if (step > currentStep && sections.some((s) => s.lengthFeet <= 0)) {
      // For MVP we just prevent moving forward instead of showing a full error system
      return
    }
    setCurrentStep(step)
  }

  return (
    <div ref={containerRef} className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)]">
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

          {currentStep >= 2 && style === 'rectangle' && infill === 'pickets' && (
            <div>
              <PicketStyleSelector value={picketStyle} onChange={setPicketStyle} />
            </div>
          )}

          {currentStep >= 3 && (
            <div>
              <RailingEndSelector style={style} value={railingEnd} onChange={setRailingEnd} />
            </div>
          )}

          {currentStep >= 4 && (
            <div>
              <SectionsConfigurator sections={sections} onChange={setSections} />
            </div>
          )}

          {currentStep >= 5 && (
            <div>
              <QuoteSummary
                style={style}
                infill={infill}
                materials={materials}
                price={price}
                sections={sections}
                picketStyle={picketStyle}
                railingEnd={railingEnd}
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
      <div
        ref={diagramRef}
        className={`space-y-4 ${
          isDiagramFixed && 
          isMounted && 
          originalLeftRef.current !== null && 
          originalAbsoluteTopRef.current !== null
            ? 'md:fixed md:z-30'
            : ''
        }`}
        style={
          isDiagramFixed && 
          isMounted && 
          originalLeftRef.current !== null && 
          originalAbsoluteTopRef.current !== null
            ? {
                left: `${originalLeftRef.current}px`,
                top: `${Math.max(100, originalAbsoluteTopRef.current - scrollY)}px`,
                ...(originalWidthRef.current !== null ? { width: `${originalWidthRef.current}px` } : {}),
              }
            : undefined
        }
      >
        {sections.length > 0 && (
          <DiagramRenderer
            style={style}
            infill={infill}
            picketStyle={picketStyle}
            materials={materials}
            sections={sections}
            railingEnd={railingEnd}
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
              <div>Install: ${price.install.toFixed(0)}</div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Update the length and options on the left to see the price change in real time.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
          <p className="text-sm text-white">
            Want something more tailored to you?
          </p>
          <p className="text-xs text-gray-400">
            Email us at{' '}
            <a
              href="mailto:sales@steadyfnr.com"
              className="text-white hover:underline"
            >
              sales@steadyfnr.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

