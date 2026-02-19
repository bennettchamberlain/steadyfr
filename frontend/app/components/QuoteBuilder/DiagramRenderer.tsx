import React from 'react'
import type {
  InfillType,
  MaterialBreakdown,
  PicketStyle,
  RailStyle,
  SectionConfig,
} from '../utils/calculations'
import {calculateStanchionPositionsForSections} from '../utils/calculations'
import {
  ANGLED_SECTION_DEGREES,
  MAX_PICKET_CLEAR_GAP_INCHES,
  PICKET_WIDTHS,
  RAILING_END_LENGTH_INCHES,
  RAILING_FOLD_DOWN_HEIGHT_INCHES,
  STANCHION_MAX_SPACING,
  STANCHION_WIDTH_INCHES,
  VISUAL_CONFIG,
} from '../utils/pricingConstants'
import type {RailingEndType} from '../utils/calculations'

interface DiagramRendererProps {
  style: RailStyle
  infill: InfillType
  picketStyle?: PicketStyle
  sections: SectionConfig[]
  materials: MaterialBreakdown
  railingEnd?: RailingEndType
}

/**
 * Simple 2D side-view diagram using SVG.
 * This is intentionally schematic: the goal is to give a clear sense of layout,
 * not an engineering drawing.
 */
export function DiagramRenderer({
  style,
  infill,
  picketStyle = 'straight',
  sections,
  materials,
  railingEnd = 'none',
}: DiagramRendererProps) {
  const {margin} = VISUAL_CONFIG.diagram
  const slatHeight = VISUAL_CONFIG.slats.baseHeight * VISUAL_CONFIG.slats.heightScale * 1.5
  const ANGLE_RAD = (ANGLED_SECTION_DEGREES * Math.PI) / 180

  // Helper function to get picket asset path
  const getPicketAssetPath = (): string => {
    if (style === 'rectangle' && infill === 'pickets') {
      if (picketStyle === 'round') return '/picket-assets/round.svg'
      if (picketStyle === 'square') return '/picket-assets/square.svg'
      return '/picket-assets/straight.svg' // Default: straight
    }
    // Victorian styles
    if (infill === 'twistedPickets') return '/picket-assets/victorian-twisted.svg'
    if (infill === 'ornamentalPickets') return '/picket-assets/victorian-ornamental.svg'
    return '/picket-assets/victorian-standard.svg' // Default Victorian
  }

  // Base scale: pixels per foot (adjust this to control overall size)
  const BASE_SCALE_PX_PER_FT = 100

  // Helper to convert inches to pixels at the base scale
  const inchesToPx = (inches: number) => (inches / 12) * BASE_SCALE_PX_PER_FT

  // True heights in inches
  const PICKET_HEIGHT_IN = 34
  const STANCHION_HEIGHT_IN = 38

  // Use stanchion width from constants
  const STANCHION_WIDTH_IN = STANCHION_WIDTH_INCHES

  // Visual heights derived from true dimensions
  const PICKET_HEIGHT_PX = inchesToPx(PICKET_HEIGHT_IN)
  const STANCHION_EXTRA_PX = inchesToPx(STANCHION_HEIGHT_IN - PICKET_HEIGHT_IN)

  // Check if Victorian style (needed for thickness adjustments)
  const isVictorian = style === 'victorian'
  
  // Minimum stroke width to prevent lines from disappearing when zoomed out on mobile
  const MIN_STROKE_WIDTH_PX = 1.5
  
  // Line thicknesses based on requested dimensions
  const baseTopRailThickness = Math.max(inchesToPx(1.5), 2)
  const baseStanchionThickness = Math.max(inchesToPx(STANCHION_WIDTH_INCHES), 2)
  const baseBottomRailThickness = 2
  
  // Adjust thicknesses for Victorian style
  const TOP_RAIL_THICKNESS_PX = Math.max(
    isVictorian ? baseTopRailThickness * 0.7 : baseTopRailThickness,
    MIN_STROKE_WIDTH_PX
  )
  const STANCHION_THICKNESS_PX = Math.max(
    isVictorian ? baseStanchionThickness * 0.7 : baseStanchionThickness,
    MIN_STROKE_WIDTH_PX
  )
  const BOTTOM_RAIL_THICKNESS_PX = Math.max(
    isVictorian ? baseBottomRailThickness * 1.3 : baseBottomRailThickness,
    MIN_STROKE_WIDTH_PX
  )
  
  const PICKET_THICKNESS_PX = Math.max(inchesToPx(0.5), MIN_STROKE_WIDTH_PX)

  // Get picket width from constants based on style and picket type
  const getPicketWidthInches = (): number => {
    // Rectangle styles
    if (style === 'rectangle' && infill === 'pickets') {
      if (picketStyle === 'square') return PICKET_WIDTHS.rectangleSquare
      if (picketStyle === 'round') return PICKET_WIDTHS.rectangleRound
      return PICKET_WIDTHS.rectangleStraight
    }

    // Victorian pickets
    if (infill === 'twistedPickets') return PICKET_WIDTHS.victorianTwisted
    if (infill === 'ornamentalPickets') return PICKET_WIDTHS.victorianOrnamental
    if (infill === 'pickets') return PICKET_WIDTHS.victorianStandard

    // Fallback
    return PICKET_WIDTHS.victorianStandard
  }

  // Calculate total horizontal projection for proper width scaling
  const totalHorizontalFeet = Math.max(
    0.1,
    sections.reduce((sum, s) => {
      if (s.type === 'flat') {
        return sum + Math.max(0, s.lengthFeet)
      } else {
        // Angled: horizontal = railLength * cos(angle)
        return sum + Math.max(0, s.lengthFeet * Math.cos(ANGLE_RAD))
      }
    }, 0),
  )

  // Calculate total rail length (true length) for stanchion positioning
  const totalRailLengthFeet = Math.max(
    0.1,
    sections.reduce((sum, s) => sum + Math.max(0, s.lengthFeet), 0),
  )

  const maxSpacing =
    infill === 'cable' ? STANCHION_MAX_SPACING.cable : STANCHION_MAX_SPACING.default
  const stanchionPositionsFeet = calculateStanchionPositionsForSections(sections, maxSpacing)

  // Initial positioning - we'll adjust based on actual bounds
  const initialRailY = 100
  const initialMargin = margin
  
  // Calculate usable width for initial layout (will be recalculated after bounds)
  const initialUsableWidth = totalHorizontalFeet * BASE_SCALE_PX_PER_FT

  // Precompute geometry for each section so we can draw angled sections and
  // place stanchions on the correct part of the rail.
  type SectionGeom = {
    startFeet: number
    endFeet: number
    startX: number
    startY: number
    dx: number
    dy: number
  }

  const sectionGeoms: SectionGeom[] = []
  let currentRailFeet = 0 // Track position along true rail length
  let currentX = initialMargin
  let currentY = initialRailY

  sections.forEach((section) => {
    const railLength = Math.max(0, section.lengthFeet)
    if (railLength <= 0) return

    // Calculate horizontal projection for this section
    const horizontalFeet = section.type === 'flat' ? railLength : railLength * Math.cos(ANGLE_RAD)
    
    // Scale width based on horizontal projection
    const sectionWidthPx = (horizontalFeet / totalHorizontalFeet) * initialUsableWidth
    const isAngled = section.type === 'angled'
    const sectionDx = sectionWidthPx
    const sectionDy = isAngled ? -sectionWidthPx * Math.tan(ANGLE_RAD) : 0

    sectionGeoms.push({
      startFeet: currentRailFeet,
      endFeet: currentRailFeet + railLength,
      startX: currentX,
      startY: currentY,
      dx: sectionDx,
      dy: sectionDy,
    })

    currentRailFeet += railLength
    currentX += sectionDx
    currentY += sectionDy
  })

  // Helper function to map feet position to XY before sections are shifted
  const mapFeetToXYBeforeShift = (posFeet: number): {x: number; y: number} => {
    const geom = sectionGeoms.find(
      (g, index) =>
        posFeet >= g.startFeet &&
        (posFeet < g.endFeet || (index === sectionGeoms.length - 1 && posFeet <= g.endFeet)),
    )
    if (!geom) {
      // Fallback calculation
      const fallbackX = initialMargin + (posFeet / totalHorizontalFeet) * initialUsableWidth
      return {x: fallbackX, y: initialRailY}
    }
    const localFeet = posFeet - geom.startFeet
    const sectionLenFeet = Math.max(geom.endFeet - geom.startFeet, 0.0001)
    const t = localFeet / sectionLenFeet
    return {
      x: geom.startX + geom.dx * t,
      y: geom.startY + geom.dy * t,
    }
  }

  // Calculate bounds including railing ends
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  // Include section geometry
  sectionGeoms.forEach((g) => {
    const x1 = g.startX
    const x2 = g.startX + g.dx
    const y1 = g.startY
    const y2 = g.startY + g.dy
    minX = Math.min(minX, x1, x2)
    maxX = Math.max(maxX, x1, x2)
    minY = Math.min(minY, y1, y2)
    maxY = Math.max(maxY, y1, y2)
  })

  // Include stanchion bottoms
  stanchionPositionsFeet.forEach((posFeet) => {
    const {x, y} = mapFeetToXYBeforeShift(posFeet)
    const stanchionBottom = y + PICKET_HEIGHT_PX + STANCHION_EXTRA_PX
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, stanchionBottom)
  })

  // Note: Railing ends are NOT included in bounds calculation - contentScale will add buffer

  // Calculate content bounds
  const contentWidth = maxX - minX
  const contentHeight = maxY - minY

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || contentWidth <= 0) {
    minX = 0
    maxX = 400
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || contentHeight <= 0) {
    minY = 0
    maxY = 200
  }

  // Apply scale factor to shrink content and add buffer on all sides
  const contentScale = VISUAL_CONFIG.diagram.contentScale
  const scaledWidth = Math.max(400, contentWidth / contentScale)
  const scaledHeight = Math.max(200, contentHeight / contentScale)

  const viewBoxWidth = scaledWidth
  const viewBoxHeight = scaledHeight

  // Calculate center offset to center the scaled content
  const centerOffsetX = (scaledWidth - contentWidth) / 2
  const centerOffsetY = (scaledHeight - contentHeight) / 2

  // Shift all geometry so minX, minY maps to centerOffset, and scale is applied
  sectionGeoms.forEach((g) => {
    // Shift to origin, then add center offset
    g.startX = (g.startX - minX) + centerOffsetX
    g.startY = (g.startY - minY) + centerOffsetY
  })

  // Final mapFeetToXY function that uses shifted sectionGeoms
  const mapFeetToXY = (posFeet: number): {x: number; y: number} => {
    const geom = sectionGeoms.find(
      (g, index) =>
        posFeet >= g.startFeet &&
        (posFeet < g.endFeet || (index === sectionGeoms.length - 1 && posFeet <= g.endFeet)),
    )
    if (!geom) {
      // Fallback - shouldn't happen but handle gracefully
      const fallbackX = initialMargin + (posFeet / totalHorizontalFeet) * initialUsableWidth
      return {
        x: (fallbackX - minX) + centerOffsetX,
        y: (initialRailY - minY) + centerOffsetY,
      }
    }
    const localFeet = posFeet - geom.startFeet
    const sectionLenFeet = Math.max(geom.endFeet - geom.startFeet, 0.0001)
    const t = localFeet / sectionLenFeet
    return {
      x: geom.startX + geom.dx * t,
      y: geom.startY + geom.dy * t,
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Railing preview</h3>
        <span className="text-xs text-gray-400">
          Total rail length: {materials.topRailFeet.toFixed(1)} ft
        </span>
      </div>
      <svg
        id="railing-diagram-svg"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full text-gray-200"
        style={{aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}`}}
        role="img"
        aria-label="Railing side view diagram"
      >
        {/* Define filter to make pickets white */}
        <defs>
          <filter id="whiteFilter" x="0%" y="0%" width="100%" height="100%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1 0"
            />
          </filter>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={viewBoxWidth} height={viewBoxHeight} fill="rgb(17,24,39)" />

        {/* Top rail – drawn as segment(s) so we can angle individual sections */}
        <g>
          {sectionGeoms.map((g, index) => {
            const x1 = g.startX
            const y1 = g.startY
            const x2 = g.startX + g.dx
            const y2 = g.startY + g.dy
            return (
              <g key={index}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={TOP_RAIL_THICKNESS_PX}
                  strokeLinecap="round"
                />
                {isVictorian && (
                  <>
                    <line
                      x1={x1}
                      y1={y1 - 4}
                      x2={x2}
                      y2={y2 - 4}
                      stroke="currentColor"
                      strokeWidth={Math.max(2, MIN_STROKE_WIDTH_PX)}
                      opacity={0.6}
                    />
                    <line
                      x1={x1}
                      y1={y1 + 4}
                      x2={x2}
                      y2={y2 + 4}
                      stroke="currentColor"
                      strokeWidth={Math.max(2, MIN_STROKE_WIDTH_PX)}
                      opacity={0.6}
                    />
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Railing ends */}
        {railingEnd !== 'none' && stanchionPositionsFeet.length >= 2 && (() => {
          const endLengthPx = inchesToPx(RAILING_END_LENGTH_INCHES)
          const foldDownHeightPx = inchesToPx(RAILING_FOLD_DOWN_HEIGHT_INCHES)
          
          // First stanchion (start) - extend backwards
          const firstPosFeet = stanchionPositionsFeet[0]
          const firstXY = mapFeetToXY(firstPosFeet)
          
          // Find the angle of the rail at the first stanchion (pointing forward)
          const firstSection = sectionGeoms.find(g => 
            firstPosFeet >= g.startFeet && firstPosFeet <= g.endFeet
          )
          const firstAngle = firstSection 
            ? Math.atan2(firstSection.dy, firstSection.dx)
            : 0
          
          // Last stanchion (end) - extend forward
          const lastPosFeet = stanchionPositionsFeet[stanchionPositionsFeet.length - 1]
          const lastXY = mapFeetToXY(lastPosFeet)
          
          // Find the angle of the rail at the last stanchion
          const lastSection = sectionGeoms.find(g => 
            lastPosFeet >= g.startFeet && lastPosFeet <= g.endFeet
          )
          const lastAngle = lastSection
            ? Math.atan2(lastSection.dy, lastSection.dx)
            : 0
          
          const renderEnd = (
            startX: number,
            startY: number,
            angle: number,
            key: string
          ) => {
            if (railingEnd === 'straight') {
              // Straight: continue at rail angle
              const endX = startX + Math.cos(angle) * endLengthPx
              const endY = startY + Math.sin(angle) * endLengthPx
              return (
                <line
                  key={key}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="currentColor"
                  strokeWidth={TOP_RAIL_THICKNESS_PX}
                  strokeLinecap="round"
                />
              )
            } else if (railingEnd === 'foldDown') {
              // Fold down: extend at rail angle, then down perpendicular to ground
              const extendX = startX + Math.cos(angle) * endLengthPx
              const extendY = startY + Math.sin(angle) * endLengthPx
              const downY = extendY + foldDownHeightPx
              return (
                <g key={key}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={extendX}
                    y2={extendY}
                    stroke="currentColor"
                    strokeWidth={TOP_RAIL_THICKNESS_PX}
                    strokeLinecap="round"
                  />
                  <line
                    x1={extendX}
                    y1={extendY}
                    x2={extendX}
                    y2={downY}
                    stroke="currentColor"
                    strokeWidth={TOP_RAIL_THICKNESS_PX}
                    strokeLinecap="round"
                  />
                </g>
              )
            } else if (railingEnd === 'foldBack') {
              // Fold back: extend at rail angle, down perpendicular, then back at rail angle
              const extendX = startX + Math.cos(angle) * endLengthPx
              const extendY = startY + Math.sin(angle) * endLengthPx
              const downY = extendY + foldDownHeightPx
              const backX = extendX + Math.cos(angle) * (-endLengthPx)
              const backY = downY + Math.sin(angle) * (-endLengthPx)
              return (
                <g key={key}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={extendX}
                    y2={extendY}
                    stroke="currentColor"
                    strokeWidth={TOP_RAIL_THICKNESS_PX}
                    strokeLinecap="round"
                  />
                  <line
                    x1={extendX}
                    y1={extendY}
                    x2={extendX}
                    y2={downY}
                    stroke="currentColor"
                    strokeWidth={TOP_RAIL_THICKNESS_PX}
                    strokeLinecap="round"
                  />
                  <line
                    x1={extendX}
                    y1={downY}
                    x2={backX}
                    y2={backY}
                    stroke="currentColor"
                    strokeWidth={TOP_RAIL_THICKNESS_PX}
                    strokeLinecap="round"
                  />
                </g>
              )
            }
            return null
          }
          
          return (
            <g>
              {/* Start end - extend backwards (opposite direction) */}
              {renderEnd(firstXY.x, firstXY.y, firstAngle + Math.PI, 'start-end')}
              {/* End end - extend forward */}
              {renderEnd(lastXY.x, lastXY.y, lastAngle, 'end-end')}
            </g>
          )
        })()}

        {/* Stanchions */}
        <g>
          {stanchionPositionsFeet.map((posFeet, index) => {
            const {x, y} = mapFeetToXY(posFeet)
            const stanchionBottom = y + PICKET_HEIGHT_PX + STANCHION_EXTRA_PX
            return (
              <line
                key={index}
                x1={x}
                y1={y}
                x2={x}
                y2={stanchionBottom}
                stroke="currentColor"
                strokeWidth={STANCHION_THICKNESS_PX}
              />
            )
          })}
        </g>

        {/* Infill */}
        {(infill === 'pickets' ||
          infill === 'twistedPickets' ||
          infill === 'ornamentalPickets') && (
          <g>
            {/* Pickets spaced between stanchions with ≤ 4" clear openings (edge-to-edge) */}
            {(() => {
              const picketWidthIn = getPicketWidthInches()
              const picketPositionsFeet: number[] = []

              for (let i = 0; i < stanchionPositionsFeet.length - 1; i++) {
                const startCenterFeet = stanchionPositionsFeet[i]
                const endCenterFeet = stanchionPositionsFeet[i + 1]
                const centerToCenterFeet = endCenterFeet - startCenterFeet
                if (centerToCenterFeet <= 0) continue

                // 1. Calculate total distance between inside edges of stanchions (inches)
                const centerToCenterIn = centerToCenterFeet * 12
                const clearSpanIn = centerToCenterIn - STANCHION_WIDTH_IN
                if (clearSpanIn <= 0) continue

                // 2. Get the width of the selected picket (already done above)
                // picketWidthIn is already set

                // 3. Calculate the number of pickets to give ≤4" spacing between edges
                // Layout: [stanchion edge] gap [picket] gap [picket] ... gap [picket] gap [stanchion edge]
                // Formula: clearSpanIn = N * picketWidthIn + (N + 1) * gapIn
                // We want: 0 <= gapIn <= MAX_PICKET_CLEAR_GAP_INCHES
                // Solving for N: gapIn = (clearSpanIn - N * picketWidthIn) / (N + 1)
                let picketCountInSpan = 0
                const maxPossiblePickets = Math.floor(clearSpanIn / picketWidthIn)

                // Find the MINIMUM number of pickets that satisfies gap <= MAX_PICKET_CLEAR_GAP_INCHES
                // This keeps visual clutter down while still meeting the gap requirement.
                for (let n = 1; n <= maxPossiblePickets; n++) {
                  const gapIn = (clearSpanIn - n * picketWidthIn) / (n + 1)
                  if (gapIn >= 0 && gapIn <= MAX_PICKET_CLEAR_GAP_INCHES) {
                    picketCountInSpan = n
                    break
                  }
                }

                if (picketCountInSpan === 0) continue

                // 4. Place pickets evenly spaced
                // Calculate the actual gap that will be used
                const gapIn =
                  (clearSpanIn - picketCountInSpan * picketWidthIn) /
                  (picketCountInSpan + 1)

                // Calculate positions from the left stanchion center
                // The first picket center is: stanchionCenter + stanchionWidth/2 + gap + picketWidth/2
                // Subsequent pickets are spaced by: picketWidth + gap
                const firstPicketCenterOffsetIn =
                  STANCHION_WIDTH_IN / 2 + gapIn + picketWidthIn / 2

                for (let j = 0; j < picketCountInSpan; j++) {
                  const picketCenterOffsetIn =
                    firstPicketCenterOffsetIn + j * (picketWidthIn + gapIn)
                  const positionFeet = startCenterFeet + picketCenterOffsetIn / 12
                  picketPositionsFeet.push(positionFeet)
                }
              }

              return picketPositionsFeet.map((posFeet, i) => {
                const {x, y} = mapFeetToXY(posFeet)
                const isTwisted = infill === 'twistedPickets'

                const yTop = y + (isTwisted ? (i % 2 === 0 ? 0 : 4) : 0)
                const picketAssetPath = getPicketAssetPath()

                // Approximate visual picket width in pixels based on configured width (inches)
                // We convert the physical picket width (inches) to feet, then to pixels using the same
                // horizontal scaling used for sections so that the visual edges line up with the math.
                const picketWidthFeet = picketWidthIn / 12
                const picketWidthPx = (picketWidthFeet / totalHorizontalFeet) * initialUsableWidth

                // Center the image on the computed x position by offsetting by half the width.
                const centerX = x
                const imageX = centerX - picketWidthPx / 2

                // Render picket using SVG asset
                // Scale to fixed height (PICKET_HEIGHT_PX = 34 inches), maintain aspect ratio
                // Width is set from the configured physical width so that edge positions match the math.
                // Apply white filter to render in white.
                return (
                  <g key={i}>
                    <image
                      href={picketAssetPath}
                      x={imageX}
                      y={yTop}
                      width={picketWidthPx}
                      height={PICKET_HEIGHT_PX}
                      preserveAspectRatio="xMidYMid meet"
                      filter="url(#whiteFilter)"
                    />
                  </g>
                )
              })
            })()}

            {/* Bottom rail connecting pickets */}
            {sectionGeoms.length > 0 && (
              <path
                d={
                  sectionGeoms
                    .map((g, index) => {
                      const x1 = g.startX
                      const y1 = g.startY + PICKET_HEIGHT_PX
                      const x2 = g.startX + g.dx
                      const y2 = g.startY + g.dy + PICKET_HEIGHT_PX
                      if (index === 0) {
                        return `M ${x1} ${y1} L ${x2} ${y2}`
                      }
                      return `L ${x1} ${y1} L ${x2} ${y2}`
                    })
                    .join(' ')
                }
                stroke="currentColor"
                strokeWidth={BOTTOM_RAIL_THICKNESS_PX}
                opacity={0.6}
                fill="none"
              />
            )}
          </g>
        )}

        {infill === 'cable' && (
          <g>
            {/* Draw cables section-by-section, between stanchions */}
            {sectionGeoms.map((g, sectionIdx) => {
              // Find stanchions that fall within this section
              // Use a small epsilon to handle boundary cases
              const epsilon = 0.001
              const sectionStartFeet = g.startFeet
              const sectionEndFeet = g.endFeet
              const sectionStanchions = stanchionPositionsFeet.filter(
                (pos) => pos >= sectionStartFeet - epsilon && pos <= sectionEndFeet + epsilon,
              )

              // Draw cables between consecutive stanchions in this section
              const cableElements: React.ReactElement[] = []
              const isFlatSection = Math.abs(g.dy) < 0.001 // Check if section is flat
              
              for (let idx = 0; idx < sectionStanchions.length - 1; idx++) {
                const startPosFeet = sectionStanchions[idx]
                const endPosFeet = sectionStanchions[idx + 1]
                const startXY = mapFeetToXY(startPosFeet)
                const endXY = mapFeetToXY(endPosFeet)

                // Draw cables within the 34" picket zone, max ~4" apart
                const CABLE_SPACING_IN = 4
                const CABLE_ZONE_IN = PICKET_HEIGHT_IN
                const cableCount = Math.max(
                  1,
                  Math.floor(CABLE_ZONE_IN / CABLE_SPACING_IN),
                )
                const verticalStepPx = PICKET_HEIGHT_PX / (cableCount + 1)

                for (let cableIdx = 0; cableIdx < cableCount; cableIdx++) {
                  const cableYOffset = verticalStepPx * (cableIdx + 1)
                  let startY = startXY.y + cableYOffset
                  let endY = endXY.y + cableYOffset

                  // For flat sections, ensure Y coordinates are EXACTLY equal (Safari fix)
                  if (isFlatSection) {
                    // Use the average Y to ensure perfect horizontal lines
                    const avgY = (startY + endY) / 2
                    startY = avgY
                    endY = avgY
                  }

                  // Round coordinates to avoid Safari sub-pixel rendering issues
                  const roundedX1 = Math.round(startXY.x * 100) / 100
                  const roundedY1 = Math.round(startY * 100) / 100
                  const roundedX2 = Math.round(endXY.x * 100) / 100
                  const roundedY2 = Math.round(endY * 100) / 100

                  cableElements.push(
                    <line
                      key={`section-${sectionIdx}-cable-${idx}-${cableIdx}`}
                      x1={roundedX1}
                      y1={roundedY1}
                      x2={roundedX2}
                      y2={roundedY2}
                      stroke="#e5e7eb"
                      strokeWidth={Math.max(1.5, MIN_STROKE_WIDTH_PX)}
                      opacity={1}
                      shapeRendering="crispEdges"
                      strokeLinecap="round"
                    />,
                  )
                }
              }
              return cableElements
            })}
          </g>
        )}

        {infill === 'slats' && (
          <g>
            {/* Draw slats section-by-section, between stanchions */}
            {sectionGeoms.map((g, sectionIdx) => {
              // Find stanchions that fall within this section
              // Use a small epsilon to handle boundary cases
              const epsilon = 0.001
              const sectionStartFeet = g.startFeet
              const sectionEndFeet = g.endFeet
              const sectionStanchions = stanchionPositionsFeet.filter(
                (pos) => pos >= sectionStartFeet - epsilon && pos <= sectionEndFeet + epsilon,
              )

              // Draw slats between consecutive stanchions in this section
              const slatElements: React.ReactElement[] = []
              for (let idx = 0; idx < sectionStanchions.length - 1; idx++) {
                const startPosFeet = sectionStanchions[idx]
                const endPosFeet = sectionStanchions[idx + 1]
                const startXY = mapFeetToXY(startPosFeet)
                const endXY = mapFeetToXY(endPosFeet)

                // Calculate the distance and angle for this span
                const dx = endXY.x - startXY.x
                const dy = endXY.y - startXY.y
                const spanLength = Math.sqrt(dx * dx + dy * dy)
                const angle = Math.atan2(dy, dx)

                // Same 34" vertical zone, ≤ 4" between slats (like cable)
                const SLAT_SPACING_IN = 4
                const SLAT_ZONE_IN = PICKET_HEIGHT_IN
                const slatCount = Math.max(
                  1,
                  Math.floor(SLAT_ZONE_IN / SLAT_SPACING_IN),
                )
                const verticalStepPx = PICKET_HEIGHT_PX / (slatCount + 1)

                for (let slatIdx = 0; slatIdx < slatCount; slatIdx++) {
                  const slatYOffset = verticalStepPx * (slatIdx + 1)
                  const startY = startXY.y + slatYOffset

                  slatElements.push(
                    <rect
                      key={`section-${sectionIdx}-slat-${idx}-${slatIdx}`}
                      x={startXY.x}
                      y={startY}
                      width={spanLength}
                      height={slatHeight}
                      fill="currentColor"
                      opacity={1}
                      rx={2}
                      transform={`rotate(${(angle * 180) / Math.PI} ${startXY.x} ${startY})`}
                    />,
                  )
                }
              }
              return slatElements
            })}
          </g>
        )}

        {/* Ground line */}
        <line
          x1={margin - 10}
          y1={viewBoxHeight - 10}
          x2={viewBoxWidth - margin + 10}
          y2={viewBoxHeight - 10}
          stroke="currentColor"
          strokeWidth={Math.max(1, MIN_STROKE_WIDTH_PX)}
          opacity={0.25}
          strokeDasharray="4 4"
        />
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Stanchions: <span className="text-gray-100">{materials.stanchionCount}</span>
        </span>
        <span>
          Infill:{' '}
          <span className="capitalize text-gray-100">
            {infill === 'none' ? 'None' : infill}
          </span>
        </span>
      </div>
    </div>
  )
}

