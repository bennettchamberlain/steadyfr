// Pricing & visual configuration for the railing quote module.
// Everything that should be easy to tweak lives here so you can
// adjust numbers without touching the React components.
//
// NOTE: These are plain TypeScript values – you *can* use simple
// equations like `50 * 1.2` if you prefer instead of hard numbers.

export const PRICING = {
  // MATERIALS PRICING
  rail: {
    // Top rail price per linear foot
    victorian: 3.45, // $/ft //69 for 20ft
    rectangle: 2.8, // $/ft 56 for 20ft
  },
  pickets: {
    // Victorian picket variations
    victorianStandard: 8, // $ each
    victorianTwisted: 10, // $ each
    victorianOrnamental: 14, // $ each
    // Rectangle picket styles
    rectangleStraight: 3, // $ each
    rectangleRound: 22, // $ each
    rectangleSquare: 22, // $ each
  },
  cable: {
    perFoot: 1.4, // $/ft for cable runs
    sectionFee: 50.20, // $ per section
  },
  slats: {
    perFoot: 12, // $/ft of horizontal slats
    sectionFee: 60, // $ per section
  },
  stanchion: {
    each: 55, // $ each
    cable: 55+15, // $ each for cable rail stanchions
  },
  labor: {
    // Labor rates by infill type
    pickets: {
      perPicket: 10, // $ per picket
      perStanchion: 150, // $ per stanchion
    },
    cable: {
      perStanchion: 20+150, // $ per stanchion
      perSection: 500, // $ per section
    },
    slats: {
      perStanchion: 250, // $ per stanchion
      perSection: 20, // $ per section
    },
    // Railing end labor costs (per end, applied to both start and end)
    railingEnd: {
      straight: 0, // $ per end
      foldDown: 60, // $ per end
      foldBack: 90, // $ per end
    },
  },
  install: {
    baseFee: 400, // $ base installation fee
    perFoot: 10, // $ per linear foot of rail
  },
  materialsModifier: 1.5, // Multiplier for total materials cost
  laborModifier: 1.0, // Multiplier for total labor cost
} as const

// Geometry / spacing configuration
export const STANCHION_MAX_SPACING = {
  default: 6, // ft, non‑cable infills
  cable: 4, // ft, cable rail requires closer spacing
} as const

// Stanchion width in inches
export const STANCHION_WIDTH_INCHES = 1.5

// Picket widths in inches (edge-to-edge measurement)
export const PICKET_WIDTHS = {
  // Rectangle picket styles
  rectangleStraight: 0.5,
  rectangleRound: 4,
  rectangleSquare: 4,
  rectangleCustom: 0.5,
  // Victorian picket styles
  victorianStandard: 0.5,
  victorianTwisted: 0.5,
  victorianOrnamental: 0.5,
} as const

// Default picket spacing in inches (on-center)
export const PICKET_SPACING_INCHES = 4

// Maximum clear gap between picket edges and stanchion edges (inches)
export const MAX_PICKET_CLEAR_GAP_INCHES = 4

// Railing end length in inches (how far the rail extends past the stanchion)
export const RAILING_END_LENGTH_INCHES = 6

// Railing fold down height in inches (how far down the rail folds)
export const RAILING_FOLD_DOWN_HEIGHT_INCHES = 6

// Angle for "angled" sections, in degrees (true rail angle).
export const ANGLED_SECTION_DEGREES = 30

// Visual configuration for the SVG diagram.
export const VISUAL_CONFIG = {
  diagram: {
    // Base size for the SVG viewBox.
    // Current width: 500 * 1.3 * 1.5 = 975
    // 50% wider: 975 * 1.5 = 1462.5
    // 3:2 aspect ratio: height = width * (2/3) = 1462.5 * (2/3) = 975
    width: (500 * 1.3 * 1.5) * 1.5, // 50% wider than current
    height: ((500 * 1.3 * 1.5) * 1.5 * 2) / 3, // 3:2 ratio (width * 2/3)
    margin: 60,
    railY: 60,
    stanchionBottomY: 140,
    // Scale factor to shrink content and add buffer on all sides (0.9 = 10% buffer)
    contentScale: 0.8,
  },
  slats: {
    baseHeight: 8,
    // 60% less tall => 40% of original height
    heightScale: 0.4,
  },
} as const

