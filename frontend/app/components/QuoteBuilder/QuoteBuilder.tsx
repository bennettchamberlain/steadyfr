'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
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
import {trackMetaEvent} from '@/app/components/MetaPixel'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'

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
  const [isMounted, setIsMounted] = useState(false)

  // Track client-side mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Track when quote builder is first loaded/interacted with
  const hasTrackedInitiation = useRef(false)
  useEffect(() => {
    if (isMounted && !hasTrackedInitiation.current) {
      // Track InitiateCheckout when user starts the quote process
      trackMetaEvent('InitiateCheckout', {
        content_name: 'Railing Quote Builder',
        content_category: 'Quote',
      })
      // Track GA event
      trackGAEvent('quote_started', {
        event_category: 'quote',
        event_label: 'quote_builder_initiated',
      })
      hasTrackedInitiation.current = true
    }
  }, [isMounted])

  // Initialize sections when user reaches step 1 (show 10ft section from start)
  useEffect(() => {
    if (sections.length === 0) {
      setSections([{id: '1', lengthFeet: 10, type: 'flat'}])
    }
  }, [sections.length])


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
    () => calculateMaterials(style, infill, sections, picketStyle),
    [style, infill, sections, picketStyle],
  )
  const price = useMemo(
    () => calculatePrice(style, infill, materials, sections, picketStyle, railingEnd),
    [style, infill, materials, sections, picketStyle, railingEnd],
  )

  // Track step progression
  const trackedSteps = useRef<Set<number>>(new Set())
  
  // Basic guard so the user can't move past steps without a sensible length
  const handleStepChange = (step: number) => {
    if (step > currentStep && sections.some((s) => s.lengthFeet <= 0)) {
      // For MVP we just prevent moving forward instead of showing a full error system
      return
    }
    
    // Track when user progresses to a new step
    if (step > currentStep && !trackedSteps.current.has(step)) {
      trackMetaEvent('ViewContent', {
        content_name: `Quote Step ${step}`,
        content_category: 'Quote Progress',
        step: step,
      })
      // Track GA event
      trackGAEvent('quote_step_completed', {
        event_category: 'quote',
        event_label: `step_${step}`,
        step_number: step,
        total_steps: TOTAL_STEPS,
      })
      trackedSteps.current.add(step)
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
      <div ref={diagramRef} className="space-y-2 lg:sticky lg:top-24 lg:self-start">
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

