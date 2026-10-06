'use client'

import {useState, type FormEvent} from 'react'
import {trackGAEvent} from '@/app/components/GoogleAnalytics'
import {trackMetaEvent} from '@/app/components/MetaPixel'
import {trackDataHashEvent} from '@/app/components/DataHashGateway'

const inputClass =
  'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-white'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [zip, setZip] = useState('')
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, email, phone, zip, message, date, time}),
      })
      const result = (await response.json()) as {error?: string}
      if (!response.ok) {
        throw new Error(result.error || 'Could not send your request')
      }

      setStatus('success')
      trackGAEvent('generate_lead', {
        event_category: 'contact',
        event_label: 'contact_form_submitted',
        currency: 'USD',
      })
      trackMetaEvent('Lead', {
        content_name: 'Contact Form',
        content_category: 'Contact',
      })
      trackDataHashEvent('Lead', {
        content_name: 'Contact Form',
        content_category: 'Contact',
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send your request')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-center text-white">
        Got it. We have you on the calendar and will confirm the visit.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label htmlFor="contact-name" className="block text-xs text-gray-400 mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-xs text-gray-400 mb-1">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-phone" className="block text-xs text-gray-400 mb-1">
            Phone
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-zip" className="block text-xs text-gray-400 mb-1">
            Zipcode
          </label>
          <input
            id="contact-zip"
            name="zip"
            type="text"
            autoComplete="postal-code"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-date" className="block text-xs text-gray-400 mb-1">
            Visit date <span className="text-red-400">*</span>
          </label>
          <input
            id="contact-date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-time" className="block text-xs text-gray-400 mb-1">
            Visit time, Pacific <span className="text-red-400">*</span>
          </label>
          <input
            id="contact-time"
            name="time"
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-xs text-gray-400 mb-1">
          Project notes
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={inputClass}
        />
      </div>
      {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center w-full px-8 py-4 bg-white text-gray-900 font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending...' : 'Request a site visit'}
      </button>
    </form>
  )
}
