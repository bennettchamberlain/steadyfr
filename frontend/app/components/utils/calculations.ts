import {
  ANGLED_SECTION_DEGREES,
  PICKET_SPACING_INCHES,
  PRICING,
  STANCHION_MAX_SPACING,
} from './pricingConstants'

export type RailStyle = 'victorian' | 'rectangle'

// Different infill options:
// - For Victorian: pickets, twistedPickets, ornamentalPickets, none
// - For Rectangle: pickets, cable, slats, none
export type InfillType =
  | 'none'
  | 'pickets'
  | 'twistedPickets'
  | 'ornamentalPickets'
  | 'cable'
  | 'slats'

export interface SectionConfig {
  id: string
  lengthFeet: number
  type: 'flat' | 'angled'
}

export interface MaterialBreakdown {
  topRailFeet: number
  stanchionCount: number
  picketCount: number
  cableFeet: number
  slatFeet: number
}

export interface PriceBreakdown {
  materials: number
  labor: number
  install: number
  total: number
}

const ANGLED_SECTION_RADIANS = (ANGLED_SECTION_DEGREES * Math.PI) / 180

/**
 * Calculate stanchion positions along a single straight section.
 * Always place a stanchion at 0 and at section length, with additional
 * stanchions evenly spaced so that spacing <= maxSpacingFeet.
 */
export function calculateStanchionPositions(
  lengthFeet: number,
  maxSpacingFeet: number,
): number[] {
  if (lengthFeet <= 0) return []

  // Minimum 2 stanchions (at both ends) for any non-zero length
  const minCount = 2
  let count = minCount

  // Increase count until spacing requirement is satisfied
  while (true) {
    const spacing = lengthFeet / (count - 1)
    if (spacing <= maxSpacingFeet || count > 1000) break
    count += 1
  }

  const positions: number[] = []
  for (let i = 0; i < count; i++) {
    const pos = (lengthFeet * i) / (count - 1)
    positions.push(pos)
  }

  return positions
}

/**
 * Calculate stanchion positions across multiple sections, taking into
 * account section boundaries so there is always a stanchion at each
 * section end.
 */
export function calculateStanchionPositionsForSections(
  sections: SectionConfig[],
  maxSpacingFeet: number,
): number[] {
  const positions: number[] = []
  let offset = 0

  sections.forEach((section, index) => {
    const railLength = getRailLengthFeet(section)
    if (railLength <= 0) return

    const localPositions = calculateStanchionPositions(railLength, maxSpacingFeet)

    localPositions.forEach((pos, i) => {
      const globalPos = offset + pos
      // Skip the very first position of every section except the first
      // to avoid duplicate stanchions at shared boundaries.
      if (index > 0 && i === 0) return
      positions.push(globalPos)
    })

    offset += railLength
  })

  return positions
}

/**
 * Calculate material quantities for one or more sections.
 */
export function calculateMaterials(
  style: RailStyle,
  infill: InfillType,
  sections: SectionConfig[],
): MaterialBreakdown {
  const maxSpacing =
    infill === 'cable' ? STANCHION_MAX_SPACING.cable : STANCHION_MAX_SPACING.default

  let totalRailFeet = 0
  let totalPickets = 0
  let totalCableFeet = 0
  let totalSlatFeet = 0

  const usesPickets =
    infill === 'pickets' || infill === 'twistedPickets' || infill === 'ornamentalPickets'

  // Calculate stanchion positions first so we can count pickets between them
  const stanchionPositions = calculateStanchionPositionsForSections(sections, maxSpacing)

  sections.forEach((section) => {
    const railLength = Math.max(0, getRailLengthFeet(section))
    if (railLength <= 0) return

    totalRailFeet += railLength

    // Cable & slats are priced per true rail foot
    if (infill === 'cable') {
      totalCableFeet += railLength
    }

    if (infill === 'slats') {
      totalSlatFeet += railLength
    }
  })

  // Pickets: Calculate between each consecutive pair of stanchions
  // based on horizontal projection distance between them
  if (usesPickets && stanchionPositions.length >= 2) {
    // Build section boundaries (cumulative rail lengths)
    const sectionBoundaries: number[] = [0]
    let cumulativeFeet = 0
    for (const section of sections) {
      const railLength = getRailLengthFeet(section)
      if (railLength > 0) {
        cumulativeFeet += railLength
        sectionBoundaries.push(cumulativeFeet)
      }
    }

    // For each consecutive pair of stanchions, calculate horizontal projection
    for (let i = 0; i < stanchionPositions.length - 1; i++) {
      const startPosFeet = stanchionPositions[i]
      const endPosFeet = stanchionPositions[i + 1]
      let horizontalSpanFeet = 0

      // Find which sections this span covers
      let remainingStart = startPosFeet
      let remainingEnd = endPosFeet

      for (let sIdx = 0; sIdx < sections.length && remainingStart < endPosFeet; sIdx++) {
        const sectionStartFeet = sectionBoundaries[sIdx]
        const sectionEndFeet = sectionBoundaries[sIdx + 1]

        // Skip if this section is before the span
        if (remainingEnd <= sectionStartFeet) break

        // Calculate overlap between span and this section
        const overlapStart = Math.max(remainingStart, sectionStartFeet)
        const overlapEnd = Math.min(remainingEnd, sectionEndFeet)

        if (overlapEnd > overlapStart) {
          const overlapLengthFeet = overlapEnd - overlapStart
          const section = sections[sIdx]

          // Convert to horizontal projection based on section type
          if (section.type === 'flat') {
            horizontalSpanFeet += overlapLengthFeet
          } else {
            // Angled: horizontal = railLength * cos(angle)
            horizontalSpanFeet += overlapLengthFeet * Math.cos(ANGLED_SECTION_RADIANS)
          }
        }

        // Move to next section if we haven't covered the full span
        if (remainingEnd > sectionEndFeet) {
          remainingStart = sectionEndFeet
        }
      }

      // Count pickets for this span (4" on-center)
      totalPickets += Math.max(0, Math.floor((horizontalSpanFeet * 12) / PICKET_SPACING_INCHES))
    }
  }

  const stanchions = calculateStanchionPositionsForSections(sections, maxSpacing).length

  return {
    topRailFeet: totalRailFeet,
    stanchionCount: stanchions,
    picketCount: totalPickets,
    cableFeet: totalCableFeet,
    slatFeet: totalSlatFeet,
  }
}

export type PicketStyle = 'straight' | 'round' | 'square'

export type RailingEndType = 'straight' | 'foldDown' | 'foldBack' | 'none'

/**
 * Convert material quantities into cost numbers using placeholder pricing.
 */
export function calculatePrice(
  style: RailStyle,
  infill: InfillType,
  materials: MaterialBreakdown,
  sections: SectionConfig[],
  picketStyle?: PicketStyle,
  railingEnd?: RailingEndType,
): PriceBreakdown {
  const railRate = style === 'victorian' ? PRICING.rail.victorian : PRICING.rail.rectangle
  let picketRate = 0

  const usesPickets =
    infill === 'pickets' || infill === 'twistedPickets' || infill === 'ornamentalPickets'

  if (usesPickets) {
    if (style === 'victorian') {
      if (infill === 'twistedPickets') {
        picketRate = PRICING.pickets.victorianTwisted
      } else if (infill === 'ornamentalPickets') {
        picketRate = PRICING.pickets.victorianOrnamental
      } else {
        picketRate = PRICING.pickets.victorianStandard
      }
    } else {
      // Rectangle style - use picketStyle to determine rate
      if (picketStyle === 'round') {
        picketRate = PRICING.pickets.rectangleRound
      } else if (picketStyle === 'square') {
        picketRate = PRICING.pickets.rectangleSquare
      } else {
        picketRate = PRICING.pickets.rectangleStraight
      }
    }
  }

  const railCost = materials.topRailFeet * railRate
  const stanchionRate = infill === 'cable' ? PRICING.stanchion.cable : PRICING.stanchion.each
  const stanchionCost = materials.stanchionCount * stanchionRate
  const picketCost = materials.picketCount * picketRate
  const cableCost = materials.cableFeet * PRICING.cable.perFoot
  const slatCost = materials.slatFeet * PRICING.slats.perFoot

  // Section fees for cable & slats (charged per section)
  const sectionCount = sections.filter((s) => s.lengthFeet > 0).length
  const cableSectionFees =
    infill === 'cable' ? sectionCount * PRICING.cable.sectionFee : 0
  const slatSectionFees =
    infill === 'slats' ? sectionCount * PRICING.slats.sectionFee : 0

  const materialsTotal =
    railCost + stanchionCost + picketCost + cableCost + slatCost + cableSectionFees + slatSectionFees

  // Calculate labor based on infill type
  let labor = 0

  if (usesPickets) {
    // Pickets: labor per picket + labor per stanchion
    labor = materials.picketCount * PRICING.labor.pickets.perPicket + materials.stanchionCount * PRICING.labor.pickets.perStanchion
  } else if (infill === 'cable') {
    // Cable: labor per stanchion + labor per section
    labor = materials.stanchionCount * PRICING.labor.cable.perStanchion + sectionCount * PRICING.labor.cable.perSection
  } else if (infill === 'slats') {
    // Slats: labor per stanchion + labor per section
    labor = materials.stanchionCount * PRICING.labor.slats.perStanchion + sectionCount * PRICING.labor.slats.perSection
  }
  // If infill is 'none', labor remains 0

  // Add railing end labor cost (applied to both start and end, so multiply by 2)
  if (railingEnd && railingEnd !== 'none') {
    const endCost = PRICING.labor.railingEnd[railingEnd]
    if (endCost) {
      labor += endCost * 2 // 2 ends (start and end)
    }
  }

  // Apply modifiers to materials and labor
  const materialsWithModifier = materialsTotal * PRICING.materialsModifier
  const laborWithModifier = labor * PRICING.laborModifier

  // Calculate install cost: base fee + per foot charge
  const install = PRICING.install.baseFee + materials.topRailFeet * PRICING.install.perFoot

  const total = materialsWithModifier + laborWithModifier + install

  return {
    materials: roundToTwo(materialsWithModifier),
    labor: roundToTwo(laborWithModifier),
    install: roundToTwo(install),
    total: roundToTwo(total),
  }
}

function getRailLengthFeet(section: SectionConfig): number {
  // User-provided length is the true rail length, regardless of angle.
  return section.lengthFeet
}

function getHorizontalProjectionFeet(section: SectionConfig): number {
  if (section.type === 'flat') return section.lengthFeet
  return section.lengthFeet * Math.cos(ANGLED_SECTION_RADIANS)
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

