// Pricing & visual configuration for the railing quote module.
// Everything that should be easy to tweak lives here so you can
// adjust numbers without touching the React components.
//
// NOTE: These are plain TypeScript values – you *can* use simple
// equations like `50 * 1.2` if you prefer instead of hard numbers.

export const PRICING = {
  rail: {
    // Top rail price per linear foot
    victorian: 50, // $/ft
    rectangle: 45, // $/ft
  },
  pickets: {
    // Victorian picket variations
    victorianStandard: 8, // $ each
    victorianTwisted: 10, // $ each
    victorianOrnamental: 14, // $ each
    // Rectangle standard pickets
    rectangleStandard: 6, // $ each
  },
  cable: {
    perFoot: 3, // $/ft for cable runs
    // Extra complexity for multiple sections – this is charged
    // for each additional section after the first.
    additionalSectionFee: 50, // $ per extra section
  },
  slats: {
    perFoot: 12, // $/ft of horizontal slats
    additionalSectionFee: 60, // $ per extra section
  },
  stanchion: {
    each: 35, // $ each
  },
  labor: {
    // Multiplier applied to material cost
    multiplier: 1.5,
  },
} as const

// Geometry / spacing configuration
export const STANCHION_MAX_SPACING = {
  default: 6, // ft, non‑cable infills
  cable: 4, // ft, cable rail requires closer spacing
} as const

// Default picket spacing in inches (on-center)
export const PICKET_SPACING_INCHES = 4

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
    margin: 40,
    railY: 60,
    stanchionBottomY: 140,
  },
  slats: {
    baseHeight: 8,
    // 60% less tall => 40% of original height
    heightScale: 0.4,
  },
} as const

