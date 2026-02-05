import React from 'react'
import type {InfillType, MaterialBreakdown, RailStyle, SectionConfig} from '../utils/calculations'
import {calculateStanchionPositionsForSections} from '../utils/calculations'
import {ANGLED_SECTION_DEGREES, STANCHION_MAX_SPACING, VISUAL_CONFIG} from '../utils/pricingConstants'

interface DiagramRendererProps {
  style: RailStyle
  infill: InfillType
  sections: SectionConfig[]
  materials: MaterialBreakdown
}

/**
 * Simple 2D side-view diagram using SVG.
 * This is intentionally schematic: the goal is to give a clear sense of layout,
 * not an engineering drawing.
 */
export function DiagramRenderer({style, infill, sections, materials}: DiagramRendererProps) {
  const {margin} = VISUAL_CONFIG.diagram
  const slatHeight = VISUAL_CONFIG.slats.baseHeight * VISUAL_CONFIG.slats.heightScale
  const ANGLE_RAD = (ANGLED_SECTION_DEGREES * Math.PI) / 180

  // Base scale: pixels per foot (adjust this to control overall size)
  const BASE_SCALE_PX_PER_FT = 100

  // Helper to convert inches to pixels at the base scale
  const inchesToPx = (inches: number) => (inches / 12) * BASE_SCALE_PX_PER_FT

  // True heights in inches
  const PICKET_HEIGHT_IN = 34
  const STANCHION_HEIGHT_IN = 38

  // Visual heights derived from true dimensions
  const PICKET_HEIGHT_PX = inchesToPx(PICKET_HEIGHT_IN)
  const STANCHION_EXTRA_PX = inchesToPx(STANCHION_HEIGHT_IN - PICKET_HEIGHT_IN)

  // Line thicknesses based on requested dimensions
  const TOP_RAIL_THICKNESS_PX = Math.max(inchesToPx(1.5), 2)
  const STANCHION_THICKNESS_PX = Math.max(inchesToPx(1.5), 2)
  const PICKET_THICKNESS_PX = Math.max(inchesToPx(0.5), 1)

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

  // Calculate dynamic viewBox dimensions based on rail length
  // Width scales with horizontal projection
  const viewBoxWidth = Math.max(400, totalHorizontalFeet * BASE_SCALE_PX_PER_FT + margin * 2)
  // Height is 1/2 of width (50% taller than 1/3)
  const viewBoxHeight = Math.max(200, viewBoxWidth / 2)

  const maxSpacing =
    infill === 'cable' ? STANCHION_MAX_SPACING.cable : STANCHION_MAX_SPACING.default
  const stanchionPositionsFeet = calculateStanchionPositionsForSections(sections, maxSpacing)

  const usableWidth = viewBoxWidth - margin * 2
  // Scale based on horizontal projection for width
  const scaleX = (valueFeet: number) => margin + (valueFeet / totalHorizontalFeet) * usableWidth

  // Calculate railY position (center vertically with some padding)
  const railY = viewBoxHeight * 0.4
  const stanchionBottomY = railY + PICKET_HEIGHT_PX + STANCHION_EXTRA_PX

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
  let currentX = margin
  let currentY = railY

  sections.forEach((section) => {
    const railLength = Math.max(0, section.lengthFeet)
    if (railLength <= 0) return

    // Calculate horizontal projection for this section
    const horizontalFeet = section.type === 'flat' ? railLength : railLength * Math.cos(ANGLE_RAD)
    
    // Scale width based on horizontal projection
    const sectionWidthPx = (horizontalFeet / totalHorizontalFeet) * usableWidth
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

  // Center the rail vertically in the viewBox
  if (sectionGeoms.length > 0) {
    let minY = sectionGeoms[0].startY
    let maxY = sectionGeoms[0].startY

    sectionGeoms.forEach((g) => {
      const y1 = g.startY
      const y2 = g.startY + g.dy
      minY = Math.min(minY, y1, y2)
      maxY = Math.max(maxY, y1, y2)
    })

    const railCenterY = (minY + maxY) / 2
    const viewCenterY = viewBoxHeight / 2
    const offsetY = viewCenterY - railCenterY

    sectionGeoms.forEach((g) => {
      g.startY += offsetY
    })
  }

  const mapFeetToXY = (posFeet: number): {x: number; y: number} => {
    const geom = sectionGeoms.find(
      (g, index) =>
        posFeet >= g.startFeet &&
        (posFeet < g.endFeet || (index === sectionGeoms.length - 1 && posFeet <= g.endFeet)),
    )
    if (!geom) {
      return {x: scaleX(posFeet), y: railY}
    }
    const localFeet = posFeet - geom.startFeet
    const sectionLenFeet = Math.max(geom.endFeet - geom.startFeet, 0.0001)
    const t = localFeet / sectionLenFeet
    return {
      x: geom.startX + geom.dx * t,
      y: geom.startY + geom.dy * t,
    }
  }

  const isVictorian = style === 'victorian'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Railing preview</h3>
        <span className="text-xs text-gray-400">
          Total rail length: {materials.topRailFeet.toFixed(1)} ft
        </span>
      </div>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full text-gray-200"
        style={{aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}`}}
        role="img"
        aria-label="Railing side view diagram"
      >
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
                      strokeWidth={2}
                      opacity={0.6}
                    />
                    <line
                      x1={x1}
                      y1={y1 + 4}
                      x2={x2}
                      y2={y2 + 4}
                      stroke="currentColor"
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  </>
                )}
              </g>
            )
          })}
        </g>

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
            {/* Pickets spaced between stanchions with max 4" on-center spacing */}
            {(() => {
              const PICKET_SPACING_FEET = 4 / 12 // 4 inches
              const picketPositionsFeet: number[] = []

              for (let i = 0; i < stanchionPositionsFeet.length - 1; i++) {
                const start = stanchionPositionsFeet[i]
                const end = stanchionPositionsFeet[i + 1]
                const spanFeet = end - start
                if (spanFeet <= 0) continue

                const picketCountInSpan = Math.max(
                  0,
                  Math.floor(spanFeet / PICKET_SPACING_FEET),
                )

                for (let j = 1; j <= picketCountInSpan; j++) {
                  const t = j / (picketCountInSpan + 1)
                  picketPositionsFeet.push(start + spanFeet * t)
                }
              }

              return picketPositionsFeet.map((posFeet, i) => {
                const {x, y} = mapFeetToXY(posFeet)
                const isAccent = infill === 'ornamentalPickets' && i % 4 === 0
                const isTwisted = infill === 'twistedPickets'

              const strokeWidth = isAccent ? PICKET_THICKNESS_PX * 1.5 : PICKET_THICKNESS_PX
                const opacity = isAccent ? 0.7 : 0.4
                const yTop = y + (isTwisted ? (i % 2 === 0 ? 0 : 4) : 0)
                const yBottom = yTop + PICKET_HEIGHT_PX

                return (
                  <line
                    key={i}
                    x1={x}
                    y1={yTop}
                    x2={x}
                    y2={yBottom}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                  />
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
                strokeWidth={2}
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
                  const startY = startXY.y + cableYOffset
                  const endY = endXY.y + cableYOffset

                  cableElements.push(
                    <line
                      key={`section-${sectionIdx}-cable-${idx}-${cableIdx}`}
                      x1={startXY.x}
                      y1={startY}
                      x2={endXY.x}
                      y2={endY}
                      stroke="currentColor"
                      strokeWidth={1}
                      opacity={0.5}
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

                // Draw 4 horizontal slats between these stanchions
                for (let slatIdx = 0; slatIdx < 4; slatIdx++) {
                  const slatYOffset = 8 + slatIdx * 14
                  const startY = startXY.y + slatYOffset
                  const endY = endXY.y + slatYOffset

                  slatElements.push(
                    <rect
                      key={`section-${sectionIdx}-slat-${idx}-${slatIdx}`}
                      x={startXY.x}
                      y={startY}
                      width={spanLength}
                      height={slatHeight}
                      fill="currentColor"
                      opacity={0.5}
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
          strokeWidth={1}
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

