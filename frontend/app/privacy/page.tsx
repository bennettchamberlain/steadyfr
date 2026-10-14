import Link from 'next/link'

export const metadata = {
  alternates: {canonical: '/privacy'},
  title: 'Privacy Policy | Steady Fence & Railing',
  description:
    'How Steady Fence & Railing (a DBA of Superhot Fabrication LLC) collects, uses, and shares your information, including cookies, analytics, and advertising.',
}

const EFFECTIVE_DATE = 'October 13, 2026'

// External link helper — opens in a new tab, styled as a subtle accent link.
function Ext({href, children}: {href: string; children: React.ReactNode}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-400 hover:text-sky-300 underline break-words"
    >
      {children}
    </a>
  )
}

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative py-20 flex items-center justify-center"
        style={{background: 'linear-gradient(to bottom, #163861, #163861, #163861)'}}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={
            {
              '--grid-color': '#ffffff',
              backgroundImage: `
                linear-gradient(to right, var(--grid-color) 2px, transparent 2px),
                linear-gradient(to bottom, var(--grid-color) 2px, transparent 2px),
                linear-gradient(to right, var(--grid-color) 3px, transparent 3px),
                linear-gradient(to bottom, var(--grid-color) 3px, transparent 3px)
              `,
              backgroundSize: '25px 25px, 25px 25px, 125px 125px, 125px 125px',
            } as React.CSSProperties
          }
        />
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-300 font-light">Effective {EFFECTIVE_DATE}</p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-16 bg-gray-950">
        <div className="container px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-gray-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:mb-4 [&_strong]:text-white [&_strong]:font-semibold">
            <p className="text-sm text-gray-500">Last updated: {EFFECTIVE_DATE}</p>

            <p>
              Steady Fence &amp; Railing is a trade name (&ldquo;doing business as&rdquo;) of{' '}
              <strong>Superhot Fabrication LLC</strong> (&ldquo;Steady Fence &amp; Railing,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). We operate the website{' '}
              <strong>https://www.steadyfnr.com</strong> (the &ldquo;Site&rdquo;) and provide fence
              and railing design, fabrication, and installation services in the San Francisco Bay
              Area. This Privacy Policy explains what information we collect, how we use it, who we
              share it with, and the choices you have.
            </p>
            <p>
              By using the Site or submitting information through it, you agree to the practices
              described in this policy.
            </p>

            <h2>1. Information We Collect</h2>
            <h3>a) Information you provide directly</h3>
            <p>
              When you fill out our contact form, request a quote, schedule a call or shop visit,
              call or text us, or otherwise communicate with us, we may collect:
            </p>
            <ul>
              <li>
                <strong>Contact details:</strong> your name, email address, phone number, and
                company or firm name (if provided).
              </li>
              <li>
                <strong>Project and property details:</strong> property address (street, city,
                state, ZIP), property type (residential or commercial), and project specifications
                such as railing type, application, infill, materials, and any notes you add.
              </li>
              <li>
                <strong>Scheduling information:</strong> the date and time you select for a call or
                shop visit, or your indication that you&rsquo;d prefer we reach out flexibly.
              </li>
              <li>
                <strong>Files you upload:</strong> photos, drawings, or documents (e.g., images or
                PDFs) you attach to describe your project.
              </li>
              <li>
                <strong>Communications:</strong> the content of emails, text messages, and phone
                calls you exchange with us. Our phone calls and text messages are handled through
                our telephony provider, Dialpad (see Section 4).
              </li>
            </ul>
            <h3>b) Information collected automatically</h3>
            <p>
              When you visit the Site, certain information is collected automatically through
              cookies and similar technologies, including:
            </p>
            <ul>
              <li>
                <strong>Device and usage data:</strong> IP address, browser type, device type,
                operating system, referring/exit pages, pages viewed, links clicked, and the
                dates/times of your visits.
              </li>
              <li>
                <strong>Advertising and analytics identifiers:</strong> cookie IDs and identifiers
                (including advertising click identifiers such as Google&rsquo;s{' '}
                <code className="text-gray-200">gclid</code>) used to measure traffic, ad
                performance, and conversions.
              </li>
            </ul>
            <p>
              We collect this automatically-collected information using the third-party tools
              described in Section 4.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Respond to your inquiries and provide quotes, estimates, and scheduling;</li>
              <li>Perform and deliver our fence and railing services;</li>
              <li>
                Communicate with you about your project, appointments, and requests (including
                confirmation emails, calls, and texts);
              </li>
              <li>Operate, maintain, secure, and improve the Site;</li>
              <li>
                Measure and improve our marketing and advertising, including reaching you and
                similar audiences with our own ads (see Sections 3 and 4);
              </li>
              <li>Comply with legal obligations and protect our rights.</li>
            </ul>

            <h2>3. How We Share Information &mdash; and What We Don&rsquo;t Do</h2>
            <p>
              <strong>We do not sell your personal information for money.</strong> We do use limited
              information you provide &mdash; specifically your <strong>email address and/or phone
              number</strong> &mdash; for our own advertising through <strong>Google Customer
              Match</strong>. In this program, your email/phone is shared with Google in hashed form
              so we can show our ads to you and to similar audiences. We do <strong>not</strong>{' '}
              share your information with any other third parties for <em>their</em> own marketing.
            </p>
            <p>Beyond that, we share information only in these limited circumstances:</p>
            <ul>
              <li>
                <strong>With service providers who operate our business on our behalf</strong> (see
                Section 4). These providers process information only to provide services to us
                &mdash; such as handling our calls and texts, sending our email, storing our leads,
                hosting the Site, and managing our domain &mdash; and are not permitted to use it
                for their own marketing.
              </li>
              <li>
                <strong>For analytics and advertising.</strong> We use analytics and advertising
                tools (such as Google and Meta) and Google Customer Match that collect, receive, or
                are provided certain information (like device/usage data, identifiers, and &mdash;
                for Customer Match &mdash; hashed email/phone). Under some privacy laws, this may be
                considered &ldquo;sharing&rdquo; or a &ldquo;sale&rdquo; for cross-context behavioral
                advertising. You can opt out as described in Sections 5 and 6.
              </li>
              <li>
                <strong>For legal and safety reasons</strong> &mdash; e.g., to comply with a law,
                regulation, legal process, or governmental request, or to protect the rights,
                property, or safety of Superhot Fabrication LLC, our customers, or others.
              </li>
              <li>
                <strong>In a business transfer</strong> &mdash; e.g., in connection with a merger,
                acquisition, or sale of assets, information may be transferred as part of that
                transaction.
              </li>
            </ul>

            <h2>4. Cookies, Analytics, and Advertising Technologies</h2>
            <p>
              We and our third-party partners use cookies, pixels, and similar technologies. The
              advertising and analytics services we currently use include:
            </p>
            <ul>
              <li>
                <strong>Google Analytics (GA4)</strong> &mdash; website traffic and usage analytics.{' '}
                <Ext href="https://policies.google.com/privacy">Google Privacy Policy</Ext>
              </li>
              <li>
                <strong>Google Ads</strong> &mdash; conversion tracking and advertising measurement.{' '}
                <Ext href="https://policies.google.com/privacy">Google Privacy Policy</Ext>
              </li>
              <li>
                <strong>Google Customer Match</strong> &mdash; we may upload customer email addresses
                and/or phone numbers to Google (in hashed form) to deliver our advertising to those
                customers and similar audiences.{' '}
                <Ext href="https://policies.google.com/privacy">Google Privacy Policy</Ext>
              </li>
              <li>
                <strong>Meta Pixel (Facebook)</strong> &mdash; advertising measurement and audience
                tools. <Ext href="https://www.facebook.com/privacy/policy">Meta Privacy Policy</Ext>
              </li>
            </ul>
            <p>We also rely on the following providers to operate the Site and our business:</p>
            <ul>
              <li>
                <strong>Dialpad</strong> &mdash; handles our business phone calls and text messages.{' '}
                <Ext href="https://www.dialpad.com/privacy/">Dialpad Privacy Policy</Ext>
              </li>
              <li>
                <strong>Vercel</strong> &mdash; website hosting.{' '}
                <Ext href="https://vercel.com/legal/privacy-policy">Vercel Privacy Policy</Ext>
              </li>
              <li>
                <strong>Squarespace</strong> &mdash; domain registration for our website address.{' '}
                <Ext href="https://www.squarespace.com/privacy">Squarespace Privacy Policy</Ext>
              </li>
              <li>
                <strong>Sanity</strong> &mdash; content management for the Site.{' '}
                <Ext href="https://www.sanity.io/legal/privacy">Sanity Privacy Policy</Ext>
              </li>
              <li>
                <strong>Brevo</strong> &mdash; sending transactional and confirmation emails.{' '}
                <Ext href="https://www.brevo.com/legal/privacypolicy/">Brevo Privacy Policy</Ext>
              </li>
              <li>
                <strong>Notion</strong> &mdash; storing and managing the inquiries and leads we
                receive. <Ext href="https://www.notion.so/privacy">Notion Privacy Policy</Ext>
              </li>
            </ul>
            <p>
              You can control cookies through your browser settings. Note that disabling cookies may
              affect some Site functionality.
            </p>

            <h2>5. Your Choices</h2>
            <ul>
              <li>
                <strong>Advertising opt-out (including Customer Match):</strong> You can ask us to
                exclude your information from our Google Customer Match advertising by contacting us
                at <Ext href="mailto:help@superhotfab.com">help@superhotfab.com</Ext>. You can also
                opt out of Google Analytics via the{' '}
                <Ext href="https://tools.google.com/dlpage/gaoptout">
                  Google Analytics Opt-out Browser Add-on
                </Ext>
                , adjust Google ad personalization at{' '}
                <Ext href="https://adssettings.google.com">Google Ad Settings</Ext>, and manage Meta
                ad preferences in your Facebook/Instagram settings.
              </li>
              <li>
                <strong>Global Privacy Control (GPC):</strong> Where required, we honor recognized
                opt-out preference signals such as GPC.
              </li>
              <li>
                <strong>&ldquo;Do Not Track&rdquo;:</strong> Some browsers offer a &ldquo;Do Not
                Track&rdquo; signal. Because there is no industry standard for responding to these
                signals, the Site does not currently respond to them.
              </li>
              <li>
                <strong>Email and texts:</strong> You can reply to any email or text message from
                us, or contact us directly, to ask us to stop contacting you.
              </li>
            </ul>

            <h2>6. California Privacy Rights</h2>
            <p>
              If you are a California resident, you may have rights under the California Consumer
              Privacy Act (as amended by the CPRA), including the right to know what personal
              information we collect, to request deletion or correction, to opt out of the
              &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information, and to not be
              discriminated against for exercising these rights.
            </p>
            <p>
              <strong>We do not sell personal information for money.</strong> However, our use of
              Google Customer Match and advertising/analytics tools may be considered a
              &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information for cross-context
              behavioral advertising under California law. You can opt out by contacting us at{' '}
              <Ext href="mailto:help@superhotfab.com">help@superhotfab.com</Ext> to have your
              information excluded, by using Global Privacy Control, and by using the opt-outs in
              Section 5. If you opt out, we will not use your information for Customer Match
              advertising.
            </p>
            <p>
              To exercise any of these rights, contact us at{' '}
              <Ext href="mailto:help@superhotfab.com">help@superhotfab.com</Ext> or{' '}
              <a href="tel:4153473270" className="text-sky-400 hover:text-sky-300 underline">
                (415) 347-3270
              </a>
              . We will verify and respond to your request as required by law.
            </p>

            <h2>7. Data Retention</h2>
            <p>
              We keep personal information for as long as needed to respond to your inquiry, provide
              our services, and for legitimate business or legal purposes (such as recordkeeping,
              resolving disputes, and enforcing agreements). When no longer needed, we take
              reasonable steps to delete or de-identify it.
            </p>

            <h2>8. Data Security</h2>
            <p>
              We use reasonable technical and organizational measures to protect the information we
              collect. However, no method of transmission or storage is completely secure, and we
              cannot guarantee absolute security.
            </p>

            <h2>9. Children&rsquo;s Privacy</h2>
            <p>
              The Site is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13. If you believe a child has provided us
              personal information, please contact us and we will delete it.
            </p>

            <h2>10. Third-Party Links</h2>
            <p>
              The Site may link to third-party websites or services (for example, our Yelp page). We
              are not responsible for the privacy practices of those third parties, and we encourage
              you to review their privacy policies.
            </p>

            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the
              &ldquo;Last updated&rdquo; date above and post the new version on this page. Material
              changes may be highlighted on the Site.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, contact us:
            </p>
            <p className="text-gray-300">
              <strong>Superhot Fabrication LLC</strong> (dba Steady Fence &amp; Railing)
              <br />
              907 Minna St, San Francisco, CA
              <br />
              Email:{' '}
              <Ext href="mailto:help@superhotfab.com">help@superhotfab.com</Ext>
              <br />
              Phone:{' '}
              <a href="tel:4153473270" className="text-sky-400 hover:text-sky-300 underline">
                (415) 347-3270
              </a>
            </p>

            <div className="mt-12 pt-6 border-t border-gray-800">
              <Link href="/" className="text-sky-400 hover:text-sky-300 underline text-sm">
                &larr; Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
