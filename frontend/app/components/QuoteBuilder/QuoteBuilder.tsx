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
  const formContentRef = useRef<HTMLDivElement | null>(null)
  const quoteSummaryDesktopRef = useRef<HTMLDivElement | null>(null)
  const quoteSummaryMobileRef = useRef<HTMLDivElement | null>(null)
  const [isDiagramFixed, setIsDiagramFixed] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const originalLeftRef = useRef<number | null>(null)
  const originalWidthRef = useRef<number | null>(null)
  const scrollThresholdRef = useRef<number | null>(null)
  const originalAbsoluteTopRef = useRef<number | null>(null)
  const isDiagramFixedRef = useRef(false)
  const [isMounted, setIsMounted] = useState(false)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Centralized function to recalculate all positions
  const recalculatePositions = React.useCallback(() => {
    if (!isMounted || !diagramRef.current || !containerRef.current) return

    const currentScrollY = window.scrollY
    const topOffset = 100
    const wasFixed = isDiagramFixedRef.current

    // Use requestAnimationFrame to ensure layout has updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!diagramRef.current || !containerRef.current) return

        // If diagram is fixed, calculate new position without unfixing
        // We measure the container's position to determine where diagram naturally sits
        if (wasFixed) {
          const containerRect = containerRef.current.getBoundingClientRect()
          const diagramRect = diagramRef.current.getBoundingClientRect()
          
          // Calculate where the diagram would naturally be in the grid
          // The diagram is in the right column, so its natural top matches container top
          // and its left is offset by the left column width
          const absoluteTop = containerRect.top + currentScrollY
          
          // Update stored positions (preserve current left/width if valid)
          if (diagramRect.width > 0) {
            originalLeftRef.current = diagramRect.left
            originalWidthRef.current = diagramRect.width
          }
          originalAbsoluteTopRef.current = absoluteTop
          
          // Recalculate threshold based on new natural position
          scrollThresholdRef.current = absoluteTop - topOffset
          
          // Keep it fixed if we're still past the threshold
          const shouldBeFixed = currentScrollY >= scrollThresholdRef.current
          if (shouldBeFixed !== isDiagramFixedRef.current) {
            isDiagramFixedRef.current = shouldBeFixed
            setIsDiagramFixed(shouldBeFixed)
          }
        } else {
          // Not fixed, can measure normally
          const diagramRect = diagramRef.current.getBoundingClientRect()

          // Only update if we have valid measurements
          if (diagramRect.width > 0 && diagramRect.height > 0) {
            // Calculate absolute positions (viewport position + scroll offset)
            const absoluteTop = diagramRect.top + currentScrollY

            // Store original positions
            originalLeftRef.current = diagramRect.left
            originalWidthRef.current = diagramRect.width
            originalAbsoluteTopRef.current = absoluteTop

            // Calculate top threshold (when to start fixing)
            scrollThresholdRef.current = absoluteTop - topOffset

            // Determine if should be fixed (only based on top threshold)
            const shouldBeFixed =
              scrollThresholdRef.current !== null &&
              currentScrollY >= scrollThresholdRef.current

            isDiagramFixedRef.current = shouldBeFixed
            setIsDiagramFixed(shouldBeFixed)
          }
        }
      })
    })
  }, [isMounted])

  // Simple scroll handler - only top threshold
  useEffect(() => {
    if (!isMounted) return

    const handleScroll = () => {
      if (!diagramRef.current) return

      const currentScrollY = window.scrollY

      // Update scroll position
      setScrollY(currentScrollY)

      // Check if we need to recalculate positions (first time or after resize)
      if (
        originalLeftRef.current === null ||
        scrollThresholdRef.current === null
      ) {
        recalculatePositions()
        return
      }

      // Check if should be fixed (only based on top threshold)
      const shouldBeFixed = currentScrollY >= scrollThresholdRef.current

      if (shouldBeFixed !== isDiagramFixedRef.current) {
        isDiagramFixedRef.current = shouldBeFixed
        setIsDiagramFixed(shouldBeFixed)
      }
    }

    // Initial calculation
    handleScroll()

    // Resize handler - update left/width immediately, debounce full recalculation
    const handleResize = () => {
      // Immediately unfix diagram at start of resize to prevent it floating in space
      if (isDiagramFixedRef.current) {
        isDiagramFixedRef.current = false
        setIsDiagramFixed(false)
      }

      // Update left and width immediately for horizontal resize (no lag)
      if (diagramRef.current) {
        const diagramRect = diagramRef.current.getBoundingClientRect()
        if (diagramRect.width > 0) {
          originalLeftRef.current = diagramRect.left
          originalWidthRef.current = diagramRect.width
        }
      }

      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      // Reset position refs to trigger full recalculation
      originalAbsoluteTopRef.current = null
      scrollThresholdRef.current = null

      // Debounce full recalculation with requestAnimationFrame + timeout
      resizeTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          recalculatePositions()
          handleScroll()
        })
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, {passive: true})
    window.addEventListener('resize', handleResize, {passive: true})

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [isMounted, recalculatePositions])

  // Recalculate positions when form or diagram content changes
  // Form size changes with currentStep, sections, and other form state
  useEffect(() => {
    if (!isMounted) return
    recalculatePositions()
  }, [isMounted, sections, currentStep, style, infill, picketStyle, railingEnd, recalculatePositions])

  // Auto-scroll to quote summary when step 5 is reached
  useEffect(() => {
    if (currentStep === 5 && isMounted) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // On mobile, scroll to the mobile version (in right column)
            // On desktop, scroll to the desktop version (in left column)
            // Check which one is visible and scroll to it
            const mobileElement = quoteSummaryMobileRef.current
            const desktopElement = quoteSummaryDesktopRef.current
            
            // Check if we're on mobile (window width < 1024px, which is lg breakpoint)
            const isMobile = window.innerWidth < 1024
            
            const targetElement = isMobile ? mobileElement : desktopElement
            
            if (targetElement) {
              const elementTop = targetElement.getBoundingClientRect().top + window.scrollY
              const offset = 100 // Offset from top of viewport
              
              // Try smooth scroll, fallback to instant if it fails
              try {
                window.scrollTo({
                  top: elementTop - offset,
                  behavior: 'smooth',
                })
              } catch (scrollError) {
                // Fallback to instant scroll if smooth scroll fails (e.g., due to extensions)
                window.scrollTo(0, elementTop - offset)
              }
            }
          } catch (error) {
            // Silently handle any errors (likely from browser extensions)
            // This prevents console noise from extension-related errors
          }
        })
      })
    }
  }, [currentStep, isMounted])

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
      <div ref={formContentRef}>
        <div>
          <h2 className="text-2xl font-semibold text-white mb-0">
            Build your railing in a minute
          </h2>
          <p className="text-sm text-gray-400 mb-6 mt-0">
            5 easy steps to get your estimate in an instant!
          </p>
        </div>

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
            <div ref={quoteSummaryDesktopRef} className="hidden lg:block">
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
        className={`space-y-2 ${
          isDiagramFixed && 
          isMounted && 
          originalLeftRef.current !== null && 
          originalWidthRef.current !== null
            ? 'md:fixed md:z-30'
            : ''
        }`}
        style={
          isDiagramFixed && 
          isMounted && 
          originalLeftRef.current !== null && 
          originalWidthRef.current !== null
            ? (() => {
                const topOffset = 100
                
                return {
                  left: `${originalLeftRef.current}px`,
                  top: `${topOffset}px`,
                  width: `${originalWidthRef.current}px`,
                }
              })()
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

        {currentStep >= 5 && (
          <div ref={quoteSummaryMobileRef} className="lg:hidden">
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

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
          <div className={`flex items-baseline justify-between ${currentStep >= 5 ? 'hidden sm:flex' : ''}`}>
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
          <div className={`pt-1 ${currentStep >= 5 ? 'border-t-0 sm:border-t' : 'border-t'} border-gray-800`}>
            <p className="text-sm text-white">
              Want something more tailored to you?
            </p>
            <p className="text-xs text-gray-400 mt-1">
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
    </div>
  )
}

