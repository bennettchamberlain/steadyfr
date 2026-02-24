'use client'

import React, {useState} from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type {
  InfillType,
  MaterialBreakdown,
  PicketStyle,
  PriceBreakdown,
  RailStyle,
  RailingEndType,
  SectionConfig,
} from '../utils/calculations'
import {PRICING} from '../utils/pricingConstants'
import {PDF_CONFIG} from '../utils/pdfConstants'
import {trackMetaEvent} from '@/app/components/MetaPixel'

interface QuoteSummaryProps {
  style: RailStyle
  infill: InfillType
  materials: MaterialBreakdown
  price: PriceBreakdown
  sections: SectionConfig[]
  picketStyle?: PicketStyle
  railingEnd?: RailingEndType
}

/**
 * Final step summary of configuration, materials, and pricing.
 */
export function QuoteSummary({
  style,
  infill,
  materials,
  price,
  sections,
  picketStyle,
  railingEnd = 'none',
}: QuoteSummaryProps) {
  const styleLabel = style === 'victorian' ? 'Victorian top rail' : 'Rectangle top rail'

  const infillLabelMap: Record<InfillType, string> = {
    none: 'No pickets / infill',
    pickets: 'Vertical pickets',
    twistedPickets: 'Twisted pickets',
    ornamentalPickets: 'Extra ornamental pickets',
    cable: 'Cable rail',
    slats: 'Horizontal slats',
  }

  const usesPickets =
    infill === 'pickets' || infill === 'twistedPickets' || infill === 'ornamentalPickets'

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const captureDiagramAsImage = async (): Promise<string | null> => {
    try {
      // Find the SVG by ID
      let svgElement: SVGSVGElement | null = document.getElementById('railing-diagram-svg') as SVGSVGElement | null
      
      if (!svgElement) {
        // Fallback to other methods
        const diagramElement = document.querySelector('svg[aria-label="Railing side view diagram"]')
        if (diagramElement && diagramElement instanceof SVGSVGElement) {
          svgElement = diagramElement
        } else {
          console.warn('SVG diagram not found')
          return null
        }
      }
      
      if (!svgElement) return null
      
      // Wait a bit to ensure rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 200))
      
      // IMPORTANT: the SVG uses `<image href="/picket-assets/...">` for pickets.
      // When we serialize the SVG and render it in isolation, those linked assets
      // may not be loaded in time, which makes the snapshot look like it has "no infill".
      // To make the email snapshot match what you see in the render window, inline
      // any `<image>` hrefs as data URLs before serializing.
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement

      // Ensure namespaces exist (helps when serializing)
      if (!svgClone.getAttribute('xmlns')) {
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }
      if (!svgClone.getAttribute('xmlns:xlink')) {
        svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      }

      const imageNodes = Array.from(svgClone.querySelectorAll('image'))
      await Promise.all(
        imageNodes.map(async (node) => {
          const href =
            node.getAttribute('href') ||
            node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
            ''

          // Already inlined
          if (href.startsWith('data:')) return

          // Only inline local assets
          const absoluteUrl = href.startsWith('http')
            ? href
            : new URL(href, window.location.origin).toString()

          try {
            const resp = await fetch(absoluteUrl)
            if (!resp.ok) return
            const blob = await resp.blob()
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(String(reader.result || ''))
              reader.onerror = () => reject(new Error('Failed to read blob'))
              reader.readAsDataURL(blob)
            })

            if (!dataUrl) return
            node.setAttribute('href', dataUrl)
            node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
          } catch {
            // If any single asset fails, we still try to render the rest of the diagram
          }
        }),
      )

      // Get the SVG as a string and convert to data URL
      const svgString = new XMLSerializer().serializeToString(svgClone)
      const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'})
      const svgUrl = URL.createObjectURL(svgBlob)
      
      // Create an image from the SVG
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load SVG image'))
        img.src = svgUrl
      })
      
      // Use actual SVG dimensions or fallback, scale up for better quality
      const baseWidth = svgElement.clientWidth || svgElement.viewBox.baseVal.width || 800
      const baseHeight = svgElement.clientHeight || svgElement.viewBox.baseVal.height || 600
      
      // Scale up 2x for better quality in email (max 1200px width for email compatibility)
      const scale = Math.min(2, 1200 / baseWidth)
      const canvasWidth = Math.floor(baseWidth * scale)
      const canvasHeight = Math.floor(baseHeight * scale)
      
      // Create a canvas and draw the SVG image
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d', {alpha: false}) // No alpha for better email compatibility
      
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        throw new Error('Could not get canvas context')
      }
      
      // Fill background with dark color matching email theme
      ctx.fillStyle = '#0d0e12'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw the SVG image scaled up
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Clean up
      URL.revokeObjectURL(svgUrl)
      
      // Convert to base64 PNG with high quality
      const imageData = canvas.toDataURL('image/png', 1.0)
      // Remove data:image/png;base64, prefix
      return imageData.split(',')[1]
    } catch (error) {
      console.error('Error capturing diagram:', error)
      return null
    }
  }

  const handleSubmitQuote = async () => {
    if (!contact) {
      setSubmitStatus('error')
      setErrorMessage('Please provide your email address')
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contact)) {
      setSubmitStatus('error')
      setErrorMessage('Please provide a valid email address')
      return
    }
    
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')
    
    try {
      // Capture diagram as image
      console.log('[QuoteSummary] Starting diagram capture for email...')
      const diagramImage = await captureDiagramAsImage()
      console.log('[QuoteSummary] Diagram capture complete:', {
        hasImage: !!diagramImage,
        length: diagramImage?.length ?? 0,
      })
      
      // Prepare email data
      const emailData = {
        name,
        contact,
        zipcode,
        style,
        infill,
        picketStyle,
        railingEnd,
        materials: {
          topRailFeet: materials.topRailFeet,
          stanchionCount: materials.stanchionCount,
          picketCount: materials.picketCount,
          cableFeet: materials.cableFeet,
          slatFeet: materials.slatFeet,
        },
        price: {
          materials: price.materials,
          labor: price.labor,
          install: price.install,
          total: price.total,
        },
        sections,
        diagramImage: diagramImage || '',
      }

      console.log('[QuoteSummary] Sending email request to /api/send-quote-email...', {
        contact: emailData.contact,
        name: emailData.name,
        zipcode: emailData.zipcode,
        hasDiagramImage: !!emailData.diagramImage,
        diagramImageLength: emailData.diagramImage.length,
      })
      
      // Send email
      const response = await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })
      
      const result = await response.json()
      console.log('[QuoteSummary] Email API response:', {
        status: response.status,
        ok: response.ok,
        body: result,
      })
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }
      
      setSubmitStatus('success')
      
      // Track quote completion events in Meta Pixel
      // Lead event - primary conversion event
      trackMetaEvent('Lead', {
        content_name: 'Railing Quote Request',
        content_category: 'Quote',
        value: price.total,
        currency: 'USD',
        quote_value: price.total,
        style: style,
        infill: infill,
        total_length: materials.topRailFeet,
      })
      
      // Purchase event - track as completed quote (even though not a purchase, it's a completed conversion)
      trackMetaEvent('Purchase', {
        content_name: 'Quote Completed',
        content_category: 'Quote',
        value: price.total,
        currency: 'USD',
        quote_value: price.total,
      })
      
      // CompleteRegistration - track form completion
      trackMetaEvent('CompleteRegistration', {
        content_name: 'Quote Form Completed',
        value: price.total,
        currency: 'USD',
      })
      
      // Also generate PDF if user wants
      // (keeping PDF generation code below)
      
      // Create PDF using config
      const pdf = new jsPDF(
        PDF_CONFIG.page.orientation,
        PDF_CONFIG.page.unit,
        PDF_CONFIG.page.format,
      )
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = PDF_CONFIG.margins.left
      const leftColumnWidth = PDF_CONFIG.columns.leftWidth
      const rightColumnX = leftColumnWidth + margin + PDF_CONFIG.columns.gap
      const rightColumnWidth = pageWidth - rightColumnX - PDF_CONFIG.margins.right
      
      let yPos = PDF_CONFIG.margins.top

      // Add logo or company name
      if (PDF_CONFIG.logo.enabled) {
        // For now, use text - can be replaced with actual logo image loading
        pdf.setFontSize(PDF_CONFIG.fonts.company.size)
        pdf.setFont(PDF_CONFIG.fonts.company.family, PDF_CONFIG.fonts.company.style)
        pdf.text('Steady Fence & Railing', margin, yPos)
        yPos += PDF_CONFIG.logo.height
      }

      // Title
      pdf.setFontSize(PDF_CONFIG.fonts.title.size)
      pdf.setFont(PDF_CONFIG.fonts.title.family, PDF_CONFIG.fonts.title.style)
      pdf.text('Railing Quote', margin, yPos)
      yPos += PDF_CONFIG.spacing.afterTitle

      // LEFT COLUMN - Text content
      const leftYStart = yPos

      // Customer Information
      pdf.setFontSize(PDF_CONFIG.fonts.header.size)
      pdf.setFont(PDF_CONFIG.fonts.header.family, PDF_CONFIG.fonts.header.style)
      pdf.text('Customer Information', margin, yPos)
      yPos += PDF_CONFIG.spacing.afterSubsection
      pdf.setFont(PDF_CONFIG.fonts.body.family, PDF_CONFIG.fonts.body.style)
      pdf.setFontSize(PDF_CONFIG.fonts.body.size)
      if (name) {
        pdf.text(`Name: ${name}`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      if (contact) {
        pdf.text(`Contact: ${contact}`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      if (zipcode) {
        pdf.text(`Zipcode: ${zipcode}`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      yPos += PDF_CONFIG.spacing.sectionGap

      // Configuration
      pdf.setFontSize(PDF_CONFIG.fonts.header.size)
      pdf.setFont(PDF_CONFIG.fonts.header.family, PDF_CONFIG.fonts.header.style)
      pdf.text('Configuration', margin, yPos)
      yPos += PDF_CONFIG.spacing.afterSubsection
      pdf.setFont(PDF_CONFIG.fonts.body.family, PDF_CONFIG.fonts.body.style)
      pdf.setFontSize(PDF_CONFIG.fonts.body.size)
      pdf.text(`Style: ${styleLabel}`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.text(
        `${usesPickets ? 'Pickets' : 'Infill'}: ${
          usesPickets ? `${materials.picketCount} pickets` : infillLabelMap[infill]
        }`,
        margin,
        yPos,
      )
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.text(`Total Rail Length: ${materials.topRailFeet.toFixed(1)} ft`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      if (railingEnd && railingEnd !== 'none') {
        const railingEndLabels: Record<RailingEndType, string> = {
          none: 'None',
          straight: 'Straight',
          foldDown: 'Fold Down',
          foldBack: 'Fold Back',
        }
        pdf.text(`Railing Ends: ${railingEndLabels[railingEnd]}`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      yPos += PDF_CONFIG.spacing.sectionGap

      // Materials
      pdf.setFontSize(PDF_CONFIG.fonts.header.size)
      pdf.setFont(PDF_CONFIG.fonts.header.family, PDF_CONFIG.fonts.header.style)
      pdf.text('Materials', margin, yPos)
      yPos += PDF_CONFIG.spacing.afterSubsection
      pdf.setFont(PDF_CONFIG.fonts.body.family, PDF_CONFIG.fonts.body.style)
      pdf.setFontSize(PDF_CONFIG.fonts.body.size)
      pdf.text(`Top Rail: ${materials.topRailFeet.toFixed(1)} ft`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.text(`Stanchions: ${materials.stanchionCount}`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      if (materials.picketCount > 0) {
        pdf.text(`Pickets: ${materials.picketCount}`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      if (materials.cableFeet > 0) {
        pdf.text(`Cable: ${materials.cableFeet.toFixed(1)} ft`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      if (materials.slatFeet > 0) {
        pdf.text(`Horizontal Slats: ${materials.slatFeet.toFixed(1)} ft`, margin, yPos)
        yPos += PDF_CONFIG.spacing.afterItem
      }
      yPos += PDF_CONFIG.spacing.sectionGap

      // Pricing
      pdf.setFontSize(PDF_CONFIG.fonts.header.size)
      pdf.setFont(PDF_CONFIG.fonts.header.family, PDF_CONFIG.fonts.header.style)
      pdf.text('Pricing', margin, yPos)
      yPos += PDF_CONFIG.spacing.afterSubsection
      pdf.setFont(PDF_CONFIG.fonts.body.family, PDF_CONFIG.fonts.body.style)
      pdf.setFontSize(PDF_CONFIG.fonts.body.size)
      pdf.text(`Materials: $${price.materials.toFixed(2)}`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.text(`Labor: $${price.labor.toFixed(2)}`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.text(`Install: $${price.install.toFixed(2)}`, margin, yPos)
      yPos += PDF_CONFIG.spacing.afterItem
      pdf.setFont(PDF_CONFIG.fonts.header.family, PDF_CONFIG.fonts.header.style)
      pdf.setFontSize(14)
      pdf.text(`Total: $${price.total.toFixed(2)}`, margin, yPos)

      // RIGHT COLUMN - Diagram
      try {
        console.log('=== Starting diagram capture ===')
        
        // Find the SVG by ID (most reliable)
        let svgElement: SVGSVGElement | null = document.getElementById('railing-diagram-svg') as SVGSVGElement | null
        console.log('SVG element found by ID:', svgElement)
        
        if (!svgElement) {
          // Fallback to other methods
          const diagramElement = document.querySelector('svg[aria-label="Railing side view diagram"]')
          console.log('Fallback - SVG selector:', diagramElement)
          if (diagramElement && diagramElement instanceof SVGSVGElement) {
            svgElement = diagramElement
          } else {
            throw new Error('SVG diagram not found')
          }
        }
        
        if (svgElement) {
          console.log('Found diagram element:', svgElement)
          console.log('Element dimensions:', svgElement.clientWidth, 'x', svgElement.clientHeight)
          console.log('Element visible:', svgElement.isConnected)
          
          // Wait a bit to ensure rendering is complete
          await new Promise((resolve) => setTimeout(resolve, 200))
          
          // Get the SVG as a string and convert to data URL.
          // As with the email snapshot, inline any `<image>` assets (pickets)
          // so they reliably appear in the rasterized output.
          const svgClone = svgElement.cloneNode(true) as SVGSVGElement

          if (!svgClone.getAttribute('xmlns')) {
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          }
          if (!svgClone.getAttribute('xmlns:xlink')) {
            svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
          }

          const imageNodes = Array.from(svgClone.querySelectorAll('image'))
          await Promise.all(
            imageNodes.map(async (node) => {
              const href =
                node.getAttribute('href') ||
                node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
                ''

              if (!href || href.startsWith('data:')) return

              const absoluteUrl = href.startsWith('http')
                ? href
                : new URL(href, window.location.origin).toString()

              try {
                const resp = await fetch(absoluteUrl)
                if (!resp.ok) return
                const blob = await resp.blob()
                const dataUrl: string = await new Promise((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onloadend = () => resolve(String(reader.result || ''))
                  reader.onerror = () => reject(new Error('Failed to read blob'))
                  reader.readAsDataURL(blob)
                })

                if (!dataUrl) return
                node.setAttribute('href', dataUrl)
                node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
              } catch {
                // Ignore failures for individual assets; keep the rest of the diagram.
              }
            }),
          )

          const svgString = new XMLSerializer().serializeToString(svgClone)
          const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'})
          const svgUrl = URL.createObjectURL(svgBlob)
          
          // Create an image from the SVG
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('Failed to load SVG image'))
            img.src = svgUrl
          })
          
          // Use actual SVG dimensions or fallback
          const svgWidth = svgElement.clientWidth || svgElement.viewBox.baseVal.width || 800
          const svgHeight = svgElement.clientHeight || svgElement.viewBox.baseVal.height || 600
          
          // Create a canvas and draw the SVG image
          const canvas = document.createElement('canvas')
          canvas.width = svgWidth * PDF_CONFIG.diagram.scale
          canvas.height = svgHeight * PDF_CONFIG.diagram.scale
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            URL.revokeObjectURL(svgUrl)
            throw new Error('Could not get canvas context')
          }
          
          // Fill background
          ctx.fillStyle = PDF_CONFIG.diagram.backgroundColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the SVG image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // Clean up
          URL.revokeObjectURL(svgUrl)
          
          console.log('Canvas created:', canvas.width, 'x', canvas.height)
          
          console.log('Canvas created:', canvas.width, 'x', canvas.height)
          
          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas has zero dimensions')
          }
          
          const diagramImageData = canvas.toDataURL('image/jpeg', PDF_CONFIG.diagram.quality)
          console.log('Image data created, length:', diagramImageData.length)
          
          // Calculate image dimensions to fit in right column
          const maxImgHeight = PDF_CONFIG.diagram.maxHeight 
            ? PDF_CONFIG.diagram.maxHeight 
            : pageHeight - leftYStart - PDF_CONFIG.margins.bottom - 20
          const imgWidth = rightColumnWidth
          const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, maxImgHeight)
          
          console.log('Adding image to PDF at:', rightColumnX, leftYStart, 'size:', imgWidth, 'x', imgHeight)
          
          // Add diagram to right side
          pdf.addImage(diagramImageData, 'JPEG', rightColumnX, leftYStart, imgWidth, imgHeight)
          console.log('Image added successfully to PDF')
        } else {
          console.warn('Diagram element not found, adding placeholder')
          // Add placeholder rectangle
          pdf.setDrawColor(
            PDF_CONFIG.colors.placeholder.stroke.r,
            PDF_CONFIG.colors.placeholder.stroke.g,
            PDF_CONFIG.colors.placeholder.stroke.b,
          )
          pdf.setFillColor(
            PDF_CONFIG.colors.placeholder.fill.r,
            PDF_CONFIG.colors.placeholder.fill.g,
            PDF_CONFIG.colors.placeholder.fill.b,
          )
          pdf.rect(rightColumnX, leftYStart, rightColumnWidth, 60, 'FD')
          pdf.setFontSize(PDF_CONFIG.fonts.body.size)
          pdf.setTextColor(
            PDF_CONFIG.colors.textSecondary.r,
            PDF_CONFIG.colors.textSecondary.g,
            PDF_CONFIG.colors.textSecondary.b,
          )
          pdf.text('Diagram Preview\n(Not found)', rightColumnX + rightColumnWidth / 2, leftYStart + 30, {
            align: 'center',
          })
        }
      } catch (imgError) {
        console.error('Error adding diagram image:', imgError)
        console.error('Error details:', imgError instanceof Error ? imgError.stack : imgError)
        // Add placeholder on error
        pdf.setDrawColor(
          PDF_CONFIG.colors.placeholder.stroke.r,
          PDF_CONFIG.colors.placeholder.stroke.g,
          PDF_CONFIG.colors.placeholder.stroke.b,
        )
        pdf.setFillColor(
          PDF_CONFIG.colors.placeholder.fill.r,
          PDF_CONFIG.colors.placeholder.fill.g,
          PDF_CONFIG.colors.placeholder.fill.b,
        )
        pdf.rect(rightColumnX, leftYStart, rightColumnWidth, 60, 'FD')
        pdf.setFontSize(PDF_CONFIG.fonts.body.size)
        pdf.setTextColor(
          PDF_CONFIG.colors.textSecondary.r,
          PDF_CONFIG.colors.textSecondary.g,
          PDF_CONFIG.colors.textSecondary.b,
        )
        pdf.text(`Error: ${imgError instanceof Error ? imgError.message : 'Unknown'}`, rightColumnX + rightColumnWidth / 2, leftYStart + 25, {
          align: 'center',
        })
        pdf.text('Diagram unavailable', rightColumnX + rightColumnWidth / 2, leftYStart + 35, {
          align: 'center',
        })
      }

      // Footer note
      const footerY = pageHeight - PDF_CONFIG.margins.bottom
      pdf.setFontSize(PDF_CONFIG.fonts.footer.size)
      pdf.setFont(PDF_CONFIG.fonts.footer.family, PDF_CONFIG.fonts.footer.style)
      pdf.setTextColor(
        PDF_CONFIG.colors.textSecondary.r,
        PDF_CONFIG.colors.textSecondary.g,
        PDF_CONFIG.colors.textSecondary.b,
      )
      pdf.text(
        'This estimate assumes ideal conditions and accurate details. Pricing and lead times may vary based on site conditions, location, weather, or unforeseen circumstances.',
        margin,
        footerY,
        {maxWidth: pageWidth - 2 * margin},
      )

      // Download PDF
      pdf.save(`railing-quote-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Error sending quote:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send quote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">5. Quote summary</h3>
        <p className="text-sm text-gray-400 mt-0">
          This instant estimate is based on the details provided. All measurements will be confirmed during your on-site visit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Configuration</h4>
          <div className="text-xs text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Style</span>
              <span>{styleLabel}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400">
                {usesPickets ? 'Pickets' : 'Infill'}
              </span>
              <span>
                {usesPickets
                  ? `${materials.picketCount} pickets`
                  : infillLabelMap[infill]}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400">Section length</span>
              <span>{materials.topRailFeet.toFixed(1)} ft</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Materials</h4>
          <dl className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-400">Top rail</dt>
              <dd>{materials.topRailFeet.toFixed(1)} ft</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Stanchions</dt>
              <dd>{materials.stanchionCount}</dd>
            </div>
            {materials.picketCount > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Pickets</dt>
                <dd>{materials.picketCount}</dd>
              </div>
            )}
            {materials.cableFeet > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Cable</dt>
                <dd>{materials.cableFeet.toFixed(1)} ft</dd>
              </div>
            )}
            {materials.slatFeet > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Horizontal slats</dt>
                <dd>{materials.slatFeet.toFixed(1)} ft</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Estimated total</div>
            <div className="text-2xl font-semibold text-white">
              ${price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Materials: ${price.materials.toFixed(2)}</div>
            <div>Labor (approx.): ${price.labor.toFixed(2)}</div>
            <div>Install: ${price.install.toFixed(2)}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          This estimate assumes ideal conditions and accurate details. Pricing and lead times may vary based on site conditions, location, weather, or unforeseen circumstances.
        </p>
      </div>

      {/* Contact Information Form */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-white">Contact Information</h4>
        <div className="space-y-3">
          <div>
            <label htmlFor="quote-name" className="block text-xs text-gray-400 mb-1">
              Name
            </label>
            <input
              id="quote-name"
              name="quote-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-white"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor="quote-contact" className="block text-xs text-gray-400 mb-1">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              id="quote-contact"
              name="quote-contact"
              type="email"
              autoComplete="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-white"
              placeholder="your.email@example.com"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              We'll send your quote to this email address
            </p>
          </div>
          <div>
            <label htmlFor="quote-zipcode" className="block text-xs text-gray-400 mb-1">
              Zipcode
            </label>
            <input
              id="quote-zipcode"
              name="quote-zipcode"
              type="text"
              autoComplete="postal-code"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-white"
              placeholder="Enter your zipcode"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmitQuote}
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-white text-gray-900 font-semibold rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending...' : 'Submit Quote & Get Email'}
          </button>
          
          {submitStatus === 'success' && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded text-sm text-green-300">
              ✓ Quote sent successfully! Check your email for details.
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
              ✗ {errorMessage || 'Failed to send quote. Please try again.'}
            </div>
          )}
        </div>
      </div>

      {/* Temporary: Detailed Price Calculation Breakdown */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-white">Price Calculation Breakdown (Temporary)</h4>
        
        {/* Materials Breakdown */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-300 uppercase">Materials</h5>
          <div className="text-xs space-y-1 text-gray-400">
            <div className="flex justify-between">
              <span>Top Rail ({materials.topRailFeet.toFixed(1)} ft × ${style === 'victorian' ? PRICING.rail.victorian : PRICING.rail.rectangle}/ft):</span>
              <span>${(materials.topRailFeet * (style === 'victorian' ? PRICING.rail.victorian : PRICING.rail.rectangle)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Stanchions ({materials.stanchionCount} × ${infill === 'cable' ? PRICING.stanchion.cable : PRICING.stanchion.each}):</span>
              <span>${(materials.stanchionCount * (infill === 'cable' ? PRICING.stanchion.cable : PRICING.stanchion.each)).toFixed(2)}</span>
            </div>
            {usesPickets && (() => {
              let picketRate = 0
              if (style === 'victorian') {
                if (infill === 'twistedPickets') picketRate = PRICING.pickets.victorianTwisted
                else if (infill === 'ornamentalPickets') picketRate = PRICING.pickets.victorianOrnamental
                else picketRate = PRICING.pickets.victorianStandard
              } else {
                if (picketStyle === 'round') picketRate = PRICING.pickets.rectangleRound
                else if (picketStyle === 'square') picketRate = PRICING.pickets.rectangleSquare
                else picketRate = PRICING.pickets.rectangleStraight
              }
              return (
                <div className="flex justify-between">
                  <span>Pickets ({materials.picketCount} × ${picketRate}):</span>
                  <span>${(materials.picketCount * picketRate).toFixed(2)}</span>
                </div>
              )
            })()}
            {infill === 'cable' && (
              <>
                <div className="flex justify-between">
                  <span>Cable ({materials.cableFeet.toFixed(1)} ft × ${PRICING.cable.perFoot}/ft):</span>
                  <span>${(materials.cableFeet * PRICING.cable.perFoot).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cable Section Fees ({sections.filter((s) => s.lengthFeet > 0).length} × ${PRICING.cable.sectionFee}):</span>
                  <span>${(sections.filter((s) => s.lengthFeet > 0).length * PRICING.cable.sectionFee).toFixed(2)}</span>
                </div>
              </>
            )}
            {infill === 'slats' && (
              <>
                <div className="flex justify-between">
                  <span>Slats ({materials.slatFeet.toFixed(1)} ft × ${PRICING.slats.perFoot}/ft):</span>
                  <span>${(materials.slatFeet * PRICING.slats.perFoot).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slat Section Fees ({sections.filter((s) => s.lengthFeet > 0).length} × ${PRICING.slats.sectionFee}):</span>
                  <span>${(sections.filter((s) => s.lengthFeet > 0).length * PRICING.slats.sectionFee).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between font-semibold text-gray-300">
                <span>Subtotal (before modifier):</span>
                <span>${(() => {
                  const railCost = materials.topRailFeet * (style === 'victorian' ? PRICING.rail.victorian : PRICING.rail.rectangle)
                  const stanchionCost = materials.stanchionCount * (infill === 'cable' ? PRICING.stanchion.cable : PRICING.stanchion.each)
                  let picketCost = 0
                  if (usesPickets) {
                    let picketRate = 0
                    if (style === 'victorian') {
                      if (infill === 'twistedPickets') picketRate = PRICING.pickets.victorianTwisted
                      else if (infill === 'ornamentalPickets') picketRate = PRICING.pickets.victorianOrnamental
                      else picketRate = PRICING.pickets.victorianStandard
                    } else {
                      if (picketStyle === 'round') picketRate = PRICING.pickets.rectangleRound
                      else if (picketStyle === 'square') picketRate = PRICING.pickets.rectangleSquare
                      else picketRate = PRICING.pickets.rectangleStraight
                    }
                    picketCost = materials.picketCount * picketRate
                  }
                  const cableCost = materials.cableFeet * PRICING.cable.perFoot
                  const slatCost = materials.slatFeet * PRICING.slats.perFoot
                  const sectionCount = sections.filter((s) => s.lengthFeet > 0).length
                  const cableSectionFees = infill === 'cable' ? sectionCount * PRICING.cable.sectionFee : 0
                  const slatSectionFees = infill === 'slats' ? sectionCount * PRICING.slats.sectionFee : 0
                  return (railCost + stanchionCost + picketCost + cableCost + slatCost + cableSectionFees + slatSectionFees).toFixed(2)
                })()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>× {PRICING.materialsModifier} (materials modifier):</span>
                <span>${price.materials.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Labor Breakdown */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-300 uppercase">Labor</h5>
          <div className="text-xs space-y-1 text-gray-400">
            {usesPickets && (
              <>
                <div className="flex justify-between">
                  <span>Picket Labor ({materials.picketCount} × ${PRICING.labor.pickets.perPicket}):</span>
                  <span>${(materials.picketCount * PRICING.labor.pickets.perPicket).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stanchion Labor ({materials.stanchionCount} × ${PRICING.labor.pickets.perStanchion}):</span>
                  <span>${(materials.stanchionCount * PRICING.labor.pickets.perStanchion).toFixed(2)}</span>
                </div>
              </>
            )}
            {infill === 'cable' && (
              <>
                <div className="flex justify-between">
                  <span>Cable Stanchion Labor ({materials.stanchionCount} × ${PRICING.labor.cable.perStanchion}):</span>
                  <span>${(materials.stanchionCount * PRICING.labor.cable.perStanchion).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cable Section Labor ({sections.filter((s) => s.lengthFeet > 0).length} × ${PRICING.labor.cable.perSection}):</span>
                  <span>${(sections.filter((s) => s.lengthFeet > 0).length * PRICING.labor.cable.perSection).toFixed(2)}</span>
                </div>
              </>
            )}
            {infill === 'slats' && (
              <>
                <div className="flex justify-between">
                  <span>Slat Stanchion Labor ({materials.stanchionCount} × ${PRICING.labor.slats.perStanchion}):</span>
                  <span>${(materials.stanchionCount * PRICING.labor.slats.perStanchion).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slat Section Labor ({sections.filter((s) => s.lengthFeet > 0).length} × ${PRICING.labor.slats.perSection}):</span>
                  <span>${(sections.filter((s) => s.lengthFeet > 0).length * PRICING.labor.slats.perSection).toFixed(2)}</span>
                </div>
              </>
            )}
            {railingEnd && railingEnd !== 'none' && (
              <div className="flex justify-between">
                <span>Railing End Labor ({PRICING.labor.railingEnd[railingEnd]} × 2 ends):</span>
                <span>${(PRICING.labor.railingEnd[railingEnd] * 2).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between font-semibold text-gray-300">
                <span>Subtotal (before modifier):</span>
                <span>${(() => {
                  let labor = 0
                  if (usesPickets) {
                    labor = materials.picketCount * PRICING.labor.pickets.perPicket + materials.stanchionCount * PRICING.labor.pickets.perStanchion
                  } else if (infill === 'cable') {
                    labor = materials.stanchionCount * PRICING.labor.cable.perStanchion + sections.filter((s) => s.lengthFeet > 0).length * PRICING.labor.cable.perSection
                  } else if (infill === 'slats') {
                    labor = materials.stanchionCount * PRICING.labor.slats.perStanchion + sections.filter((s) => s.lengthFeet > 0).length * PRICING.labor.slats.perSection
                  }
                  if (railingEnd && railingEnd !== 'none') {
                    labor += PRICING.labor.railingEnd[railingEnd] * 2
                  }
                  return labor.toFixed(2)
                })()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>× {PRICING.laborModifier} (labor modifier):</span>
                <span>${price.labor.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Install Breakdown */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-300 uppercase">Install</h5>
          <div className="text-xs space-y-1 text-gray-400">
            <div className="flex justify-between">
              <span>Base Fee:</span>
              <span>${PRICING.install.baseFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Per Foot ({materials.topRailFeet.toFixed(1)} ft × ${PRICING.install.perFoot}/ft):</span>
              <span>${(materials.topRailFeet * PRICING.install.perFoot).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between font-semibold text-gray-300">
                <span>Total Install:</span>
                <span>${price.install.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Total */}
        <div className="pt-2 border-t-2 border-gray-600">
          <div className="flex justify-between text-sm font-bold text-white">
            <span>GRAND TOTAL:</span>
            <span>${price.total.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

    </div>
  )
}

