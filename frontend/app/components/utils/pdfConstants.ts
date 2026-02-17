// PDF Generation Configuration
// Adjust these values to customize the PDF layout and styling

export const PDF_CONFIG = {
  // Page settings
  page: {
    format: 'a4' as const, // 'a4' | 'letter' | etc.
    orientation: 'p' as const, // 'p' for portrait, 'l' for landscape
    unit: 'mm' as const, // 'mm' | 'pt' | 'px' | 'in'
  },

  // Margins and spacing
  margins: {
    top: 20, // mm
    bottom: 20, // mm
    left: 20, // mm
    right: 20, // mm
  },

  // Column layout
  columns: {
    leftWidth: 90, // mm - width of left column (text)
    gap: 10, // mm - gap between columns
  },

  // Logo settings
  logo: {
    enabled: true,
    path: '/logo.png', // Path to logo file in public folder
    height: 15, // mm
    maxWidth: 60, // mm
  },

  // Typography
  fonts: {
    // Title font
    title: {
      size: 20, // pt
      style: 'bold' as const,
      family: 'helvetica' as const,
    },
    // Header font (section headers)
    header: {
      size: 12, // pt
      style: 'bold' as const,
      family: 'helvetica' as const,
    },
    // Body font
    body: {
      size: 10, // pt
      style: 'normal' as const,
      family: 'helvetica' as const,
    },
    // Footer font
    footer: {
      size: 8, // pt
      style: 'italic' as const,
      family: 'helvetica' as const,
    },
    // Company name font
    company: {
      size: 16, // pt
      style: 'bold' as const,
      family: 'helvetica' as const,
    },
  },

  // Spacing between elements
  spacing: {
    afterTitle: 12, // mm
    afterSection: 5, // mm
    afterSubsection: 6, // mm
    afterItem: 6, // mm
    sectionGap: 5, // mm
  },

  // Diagram/image settings
  diagram: {
    scale: 1, // html2canvas scale factor (1 = normal, 2 = higher quality)
    backgroundColor: '#111827', // Background color for diagram capture
    quality: 0.9, // JPEG quality (0-1)
    maxHeight: null as number | null, // mm - null means auto-calculate
  },

  // Colors (RGB values 0-255)
  colors: {
    text: {r: 0, g: 0, b: 0},
    textSecondary: {r: 100, g: 100, b: 100},
    placeholder: {
      fill: {r: 240, g: 240, b: 240},
      stroke: {r: 200, g: 200, b: 200},
    },
  },
} as const
