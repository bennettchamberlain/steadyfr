import {NextRequest, NextResponse} from 'next/server'
import nodemailer from 'nodemailer'

// Ensure this route uses the Node.js runtime so we can use nodemailer
export const runtime = 'nodejs'

interface QuoteEmailData {
  name: string
  contact: string
  zipcode: string
  style: string
  infill: string
  picketStyle?: string
  railingEnd?: string
  materials: {
    topRailFeet: number
    stanchionCount: number
    picketCount: number
    cableFeet: number
    slatFeet: number
  }
  price: {
    materials: number
    labor: number
    install: number
    total: number
  }
  sections: Array<{
    id: string
    lengthFeet: number
    type: string
  }>
  diagramImage: string // Base64 encoded image
}

// Create transporter for Brevo SMTP
// Note: Removed debug: true and logger: true as they can prevent actual email sending
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'a29434001@smtp-brevo.com',
    pass: '9rCqOfGUQdYgIJ1y',
  },
  // Enable TLS
  requireTLS: true,
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
})

// Log transporter configuration (without sensitive data) - only once at module load
declare global {
  // eslint-disable-next-line no-var
  var transporterLogged: boolean | undefined
}
if (!global.transporterLogged) {
  console.log('[send-quote-email] Transporter configured:', {
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    authUser: 'a29434001@smtp-brevo.com',
    requireTLS: true,
  })
  global.transporterLogged = true
}

function generateEmailHTML(data: QuoteEmailData): string {
  const styleLabel = data.style === 'victorian' ? 'Victorian Top Rail' : 'Rectangle Top Rail'
  
  const infillLabelMap: Record<string, string> = {
    none: 'No pickets / infill',
    pickets: 'Vertical pickets',
    twistedPickets: 'Twisted pickets',
    ornamentalPickets: 'Extra ornamental pickets',
    cable: 'Cable rail',
    slats: 'Horizontal slats',
  }
  
  const infillLabel = infillLabelMap[data.infill] || data.infill
  
  const usesPickets =
    data.infill === 'pickets' || data.infill === 'twistedPickets' || data.infill === 'ornamentalPickets'
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Railing Quote - Steady Fence & Railing</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0d0e12; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0d0e12;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1b1d27; border-radius: 8px; overflow: hidden; border: 1px solid #252837;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #1b1d27 0%, #252837 100%); text-align: center; border-bottom: 2px solid #383d51;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">
                STEADY FENCE & RAILING
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: #9499ad;">
                San Francisco Bay Area
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #ffffff;">
                Your Railing Quote
              </h2>
              
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #bbbdc9;">
                Thank you for requesting a quote! Below are the details of your custom railing configuration.
              </p>
              
              <!-- Diagram Image -->
              ${data.diagramImage ? `
              <div style="margin: 30px 0; text-align: center; background-color: #0d0e12; padding: 20px; border-radius: 8px; border: 1px solid #252837;">
                <img src="cid:railing-diagram" alt="Railing Diagram" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto;" />
              </div>
              ` : ''}
              
              <!-- Customer Information -->
              <div style="margin: 30px 0; padding: 20px; background-color: #252837; border-radius: 8px; border: 1px solid #383d51;">
                <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #ffffff;">
                  Contact Information
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  ${data.name ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px; width: 120px;">Name:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${data.name}</td>
                  </tr>
                  ` : ''}
                  ${data.contact ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Contact:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${data.contact}</td>
                  </tr>
                  ` : ''}
                  ${data.zipcode ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Zipcode:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${data.zipcode}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Configuration -->
              <div style="margin: 30px 0; padding: 20px; background-color: #252837; border-radius: 8px; border: 1px solid #383d51;">
                <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #ffffff;">
                  Configuration
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px; width: 150px;">Style:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${styleLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Infill:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      ${usesPickets ? `${data.materials.picketCount} pickets` : infillLabel}
                    </td>
                  </tr>
                  ${data.picketStyle && data.picketStyle !== 'straight' ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Picket Style:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${data.picketStyle.charAt(0).toUpperCase() + data.picketStyle.slice(1)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Total Length:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">${data.materials.topRailFeet.toFixed(1)} ft</td>
                  </tr>
                  ${data.railingEnd && data.railingEnd !== 'none' ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Railing Ends:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500;">
                      ${data.railingEnd === 'straight' ? 'Straight' : data.railingEnd === 'foldDown' ? 'Fold Down' : 'Fold Back'}
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Materials -->
              <div style="margin: 30px 0; padding: 20px; background-color: #252837; border-radius: 8px; border: 1px solid #383d51;">
                <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #ffffff;">
                  Materials
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Top Rail:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${data.materials.topRailFeet.toFixed(1)} ft</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Stanchions:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${data.materials.stanchionCount}</td>
                  </tr>
                  ${data.materials.picketCount > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Pickets:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${data.materials.picketCount}</td>
                  </tr>
                  ` : ''}
                  ${data.materials.cableFeet > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Cable:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${data.materials.cableFeet.toFixed(1)} ft</td>
                  </tr>
                  ` : ''}
                  ${data.materials.slatFeet > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #9499ad; font-size: 14px;">Horizontal Slats:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${data.materials.slatFeet.toFixed(1)} ft</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Pricing -->
              <div style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #252837 0%, #1b1d27 100%); border-radius: 8px; border: 2px solid #383d51;">
                <h3 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #ffffff;">
                  Estimated Pricing
                </h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 10px 0; color: #bbbdc9; font-size: 15px;">Materials:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-size: 15px; font-weight: 500; text-align: right;">$${data.price.materials.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #bbbdc9; font-size: 15px;">Labor:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-size: 15px; font-weight: 500; text-align: right;">$${data.price.labor.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #bbbdc9; font-size: 15px;">Install:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-size: 15px; font-weight: 500; text-align: right;">$${data.price.install.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #383d51;">
                    <td style="padding: 15px 0 0; color: #ffffff; font-size: 24px; font-weight: bold;">Total:</td>
                    <td style="padding: 15px 0 0; color: #ffffff; font-size: 24px; font-weight: bold; text-align: right;">
                      $${data.price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                  </tr>
                </table>
                <p style="margin: 20px 0 0; font-size: 12px; line-height: 1.5; color: #727892;">
                  This is a preliminary estimate based on typical conditions. Final pricing may vary with site access, mounting conditions, and design details.
                </p>
              </div>
              
              <!-- Call to Action -->
              <div style="margin: 30px 0; padding: 25px; background-color: #252837; border-radius: 8px; border: 1px solid #383d51; text-align: center;">
                <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff; font-weight: 500;">
                  Ready to get started?
                </p>
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #bbbdc9;">
                  Contact us to schedule a site visit and finalize your railing project.
                </p>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="mailto:sales@steadyfnr.com" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #0d0e12; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        Email Us
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 15px; text-align: center;">
                      <a href="tel:5108497343" style="display: inline-block; padding: 12px 24px; background-color: #252837; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid #383d51;">
                        Call (510) 849-7343
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #0d0e12; text-align: center; border-top: 1px solid #252837;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #727892;">
                <strong style="color: #ffffff;">Steady Fence & Railing</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #515870;">
                San Francisco Bay Area | Get a quote in a minute, installation in a week
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const data: QuoteEmailData = await request.json()

    // Debug logging so we can trace email attempts in server logs
    console.log('[send-quote-email] Incoming request payload (redacted):', {
      hasDiagramImage: !!data.diagramImage,
      diagramImageLength: data.diagramImage?.length ?? 0,
      contact: data.contact,
      name: data.name,
      zipcode: data.zipcode,
      style: data.style,
      infill: data.infill,
      picketStyle: data.picketStyle,
      railingEnd: data.railingEnd,
      totalPrice: data.price?.total,
      sectionsCount: data.sections?.length ?? 0,
    })
    
    // Validate required fields
    if (!data.contact) {
      return NextResponse.json(
        {error: 'Contact information is required'},
        {status: 400}
      )
    }
    
    // Extract email from contact (could be email or phone)
    const emailMatch = data.contact.match(/[\w.-]+@[\w.-]+\.\w+/)
    const recipientEmail = emailMatch ? emailMatch[0] : null
    
    if (!recipientEmail) {
      return NextResponse.json(
        {error: 'Please provide a valid email address'},
        {status: 400}
      )
    }

    console.log('[send-quote-email] Parsed recipient email:', recipientEmail)
    console.log('[send-quote-email] Diagram image present:', !!data.diagramImage)
    
    // Generate HTML email
    const htmlContent = generateEmailHTML(data)
    
    // Generate plain text version
    const textContent = `Your Railing Quote from Steady Fence & Railing

Thank you for requesting a quote! Below are the details of your custom railing configuration.

${data.name ? `Name: ${data.name}` : ''}
${data.contact ? `Contact: ${data.contact}` : ''}
${data.zipcode ? `Zipcode: ${data.zipcode}` : ''}

Configuration:
Style: ${data.style === 'victorian' ? 'Victorian Top Rail' : 'Rectangle Top Rail'}
Total Length: ${data.materials.topRailFeet.toFixed(1)} ft

Estimated Pricing:
Materials: $${data.price.materials.toFixed(2)}
Labor: $${data.price.labor.toFixed(2)}
Install: $${data.price.install.toFixed(2)}
Total: $${data.price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}

This is a preliminary estimate based on typical conditions. Final pricing may vary with site access, mounting conditions, and design details.

Ready to get started? Contact us to schedule a site visit and finalize your railing project.

Email: sales@steadyfnr.com
Phone: (510) 849-7343

Steady Fence & Railing
San Francisco Bay Area`
    
    // Prepare attachments (inline image)
    const attachments: Array<{
      filename: string
      content: string | Buffer
      cid: string
      contentType: string
      encoding?: string
    }> = []
    
    if (data.diagramImage) {
      attachments.push({
        filename: 'railing-diagram.png',
        content: data.diagramImage,
        cid: 'railing-diagram',
        contentType: 'image/png',
        encoding: 'base64',
      })
    }
    
    // Verify SMTP connection first
    console.log('[send-quote-email] Verifying SMTP connection to Brevo...')
    try {
      await transporter.verify()
      console.log('[send-quote-email] SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('[send-quote-email] SMTP connection verification failed:', verifyError)
      throw new Error(`SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`)
    }

    // Send email with proper headers for deliverability
    console.log('[send-quote-email] Sending email via nodemailer/Brevo...', {
      to: recipientEmail,
      bcc: 'help@superhotfab.com',
      from: 'sales@steadyfnr.com',
      hasAttachments: attachments.length > 0,
      attachmentNames: attachments.map((a) => a.filename),
      attachmentSizes: attachments.map((a) => typeof a.content === 'string' ? a.content.length : 'Buffer'),
    })

    const mailOptions = {
      from: '"Steady Fence & Railing" <sales@steadyfnr.com>',
      to: recipientEmail,
      bcc: 'help@superhotfab.com', // BCC all quote emails to this address
      replyTo: 'sales@steadyfnr.com',
      subject: `Your Railing Quote - $${data.price.total.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
      html: htmlContent,
      text: textContent,
      attachments,
      headers: {
        'X-Priority': '1', // High priority (1 = highest)
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Steady Fence & Railing Quote System',
        'X-Auto-Response-Suppress': 'All',
        'Message-ID': `<quote-${Date.now()}-${Math.random().toString(36).substring(7)}@steadyfnr.com>`,
      },
      priority: 'high' as const,
      date: new Date(),
    }

    let info
    try {
      info = await transporter.sendMail(mailOptions)
    } catch (sendError) {
      console.error('[send-quote-email] sendMail threw an error:', sendError)
      throw sendError
    }
    
    console.log('[send-quote-email] Email send completed:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      pending: info.pending,
      envelope: info.envelope,
    })

    // Check if email was actually accepted
    if (info.rejected && info.rejected.length > 0) {
      console.error('[send-quote-email] Email was rejected:', info.rejected)
      return NextResponse.json(
        {
          success: false,
          error: 'Email rejected by server',
          rejected: info.rejected,
          messageId: info.messageId,
        },
        {status: 400}
      )
    }

    if (!info.accepted || info.accepted.length === 0) {
      console.error('[send-quote-email] Email was not accepted by server')
      return NextResponse.json(
        {
          success: false,
          error: 'Email was not accepted by SMTP server',
          messageId: info.messageId,
          accepted: info.accepted,
        },
        {status: 500}
      )
    }
    
    console.log('[send-quote-email] Email successfully sent and accepted:', {
      messageId: info.messageId,
      acceptedRecipients: info.accepted,
    })
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
    })
  } catch (error) {
    console.error('[send-quote-email] Error sending email:', error)
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {status: 500}
    )
  }
}
