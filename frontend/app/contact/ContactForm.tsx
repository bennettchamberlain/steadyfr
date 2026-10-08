'use client'

import {useState, useEffect} from 'react'
import {
  trackGAEvent,
  trackGoogleAdsConversion,
  CONTACT_CONVERSION_SEND_TO,
} from '@/app/components/GoogleAnalytics'
import {trackMetaEvent} from '@/app/components/MetaPixel'
import {trackDataHashEvent} from '@/app/components/DataHashGateway'

// ---- pure helpers -------------------------------------------------------
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
const phoneOk = (v: string) => {
  const d = (v || '').replace(/\D/g, '')
  return d.length === 10 || (d.length === 11 && d[0] === '1')
}
function formatPhone(v: string) {
  let d = (v || '').replace(/\D/g, '')
  if (d.length > 10 && d[0] === '1') d = d.slice(1)
  d = d.slice(0, 10)
  const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6, 10)
  if (d.length > 6) return `(${a}) ${b}-${c}`
  if (d.length > 3) return `(${a}) ${b}`
  if (d.length > 0) return `(${a}`
  return ''
}
const fmtTime = (h: number, m: number) => {
  const ap = h < 12 ? 'AM' : 'PM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}
const midnight = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function addBusinessDays(d: Date, n: number) {
  const r = midnight(d)
  let a = 0
  while (a < n) {
    r.setDate(r.getDate() + 1)
    const wd = r.getDay()
    if (wd !== 0 && wd !== 6) a++
  }
  return r
}
function windowFor(kind: 'shop' | 'call', date: Date): [number, number] | null {
  const wd = date.getDay()
  if (kind === 'shop') return wd >= 1 && wd <= 5 ? [9 * 60, 17 * 60] : null
  if (wd === 0) return null
  if (wd === 6) return [11 * 60, 13 * 60]
  const early = midnight(date) >= addBusinessDays(new Date(), 3)
  return [early ? 9 * 60 : 10 * 60, 18 * 60]
}
function daySlotMins(kind: 'shop' | 'call', date: Date): number[] {
  const today = midnight(new Date())
  const d0 = midnight(date)
  if (kind === 'shop') {
    const min = midnight(new Date())
    min.setDate(min.getDate() + 8)
    if (d0 < min) return []
  } else if (d0 < today) return []
  if (kind === 'call' && date.getDay() === 6) {
    const tue = midnight(date)
    tue.setDate(tue.getDate() - 4)
    if (new Date() >= tue) return []
  }
  const win = windowFor(kind, date)
  if (!win) return []
  const step = kind === 'shop' ? 60 : 30
  const now = new Date()
  const buffer =
    kind === 'call' && d0.getTime() === today.getTime()
      ? now.getHours() * 60 + now.getMinutes() + 60
      : -1
  const out: number[] = []
  for (let m = win[0]; m + step <= win[1]; m += step) {
    if (m < buffer) continue
    out.push(m)
  }
  return out
}
const slotLabel = (kind: 'shop' | 'call', m: number) => {
  const h = Math.floor(m / 60), mm = m % 60
  return kind === 'shop'
    ? `${fmtTime(h, mm)} – ${fmtTime(Math.floor((m + 60) / 60), (m + 60) % 60)}`
    : fmtTime(h, mm)
}
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmtDate = (iso: string) => {
  try {
    return new Date(iso + 'T00:00').toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})
  } catch {
    return iso
  }
}
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
const readFileBase64 = (file: File): Promise<{name: string; type: string; data: string}> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result)
      res({name: file.name, type: file.type, data: s.slice(s.indexOf(',') + 1)})
    }
    r.onerror = rej
    r.readAsDataURL(file)
  })

const PATHS: Record<string, {t: string; d: string}> = {
  scheduleCall: {t: 'Schedule a call', d: "Pick a time and date convenient for you, and we'll give you a call!"},
  visitShop: {t: 'Visit the shop', d: 'Come see our work in person.'},
}

// ---- styles -------------------------------------------------------------
const inputCls =
  'w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-sky-500 placeholder:text-gray-500'
const labelCls = 'block font-mono text-[11px] tracking-wider uppercase text-gray-400 mb-1.5'
const glCls = 'font-mono text-[11px] tracking-wider uppercase text-gray-400 mb-2'
const chip = (sel: boolean) =>
  `px-4 py-2 rounded-full text-sm border cursor-pointer transition-colors ${
    sel ? 'bg-sky-500/15 border-sky-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
  }`
const btnPrimary =
  'px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-60'
const btnGhost =
  'px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors'

interface State {
  name: string; email: string; phone: string; company: string
  path: string; convenience: boolean; visitDate: string; slot: string
  calYear: number; calMonth: number
  street: string; city: string; region: string; zip: string; propType: string
  mode: string; location: string[]; railType: string[]; application: string[]; infill: string[]
  files: File[]; additional: string
  idx: number; submitting: boolean; submitted: boolean; submitError: string
  errName: string; errEmail: string; errPhone: string; errContact: string
  booked: Record<string, Array<[number, number]>>
}

const now = new Date()
const initial: State = {
  name: '', email: '', phone: '', company: '',
  path: '', convenience: false, visitDate: '', slot: '',
  calYear: now.getFullYear(), calMonth: now.getMonth(),
  street: '', city: '', region: '', zip: '', propType: '',
  mode: '', location: [], railType: [], application: [], infill: [],
  files: [], additional: '',
  idx: 0, submitting: false, submitted: false, submitError: '',
  errName: '', errEmail: '', errPhone: '', errContact: '',
  booked: {},
}

export default function ContactForm() {
  const [s, setS] = useState<State>(initial)
  const set = (patch: Partial<State>) => setS((prev) => ({...prev, ...patch}))

  // Pull existing bookings from Notion so already-taken times are greyed out.
  useEffect(() => {
    const startD = midnight(new Date())
    const endD = midnight(new Date())
    endD.setDate(endD.getDate() + 120)
    fetch(`/api/availability?start=${toIso(startD)}&end=${toIso(endD)}`)
      .then((r) => (r.ok ? r.json() : {booked: {}}))
      .then((d) => setS((prev) => ({...prev, booked: d.booked || {}})))
      .catch(() => {})
  }, [])

  const slotStep = (k: 'shop' | 'call') => (k === 'shop' ? 60 : 30)
  const overlapsBooked = (iso: string, m: number, dur: number) =>
    (s.booked[iso] || []).some(([x, y]) => m < y && x < m + dur)
  // Rule-based slots minus anything already booked in Notion.
  const availMins = (k: 'shop' | 'call', date: Date) =>
    daySlotMins(k, date).filter((m) => !overlapsBooked(toIso(date), m, slotStep(k)))

  const hasBiz = !!s.company.trim()
  const effPath = hasBiz ? s.path : 'scheduleCall'
  const kind: 'shop' | 'call' = effPath === 'visitShop' ? 'shop' : 'call'

  function computeSteps(): string[] {
    const seq = ['info']
    if (hasBiz) {
      seq.push('path')
      if (!s.path) return seq
    }
    seq.push('schedule', 'property', 'specs', 'review')
    return seq
  }
  const seq = computeSteps()
  const idx = Math.min(s.idx, seq.length - 1)
  const cur = seq[idx]
  const reviewIdx = seq.indexOf('review')

  const step1Valid = !!s.name.trim() && emailOk(s.email) && phoneOk(s.phone)
  const canSkip = step1Valid && reviewIdx >= 0 && cur !== 'review'

  function advance() {
    if (cur === 'info') {
      if (!step1Valid) {
        set({
          errName: s.name.trim() ? '' : 'Please add your name.',
          errEmail: !s.email.trim() ? 'Email is required.' : !emailOk(s.email) ? 'Enter a valid email address.' : '',
          errPhone: !s.phone.trim() ? 'Phone is required.' : !phoneOk(s.phone) ? 'Enter a valid phone number.' : '',
          errContact: '',
        })
        return
      }
    }
    if (cur === 'path' && !s.path) return
    set({idx: idx + 1})
  }

  async function submit() {
    set({submitting: true, submitError: ''})
    let files: {name: string; type: string; data: string}[] = []
    try {
      files = await Promise.all(s.files.map(readFileBase64))
    } catch {
      files = []
    }
    const payload = {
      name: s.name, email: s.email, phone: s.phone, company: s.company,
      path: effPath, convenience: s.convenience, visitDate: s.visitDate, slot: s.slot,
      street: s.street, city: s.city, region: s.region, zip: s.zip, propType: s.propType,
      mode: s.mode, location: s.location, railType: s.railType, application: s.application, infill: s.infill,
      additional: s.additional, files,
    }
    try {
      const res = await fetch('/api/send-contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => ({}))) as {error?: string; notionError?: string}
      if (!res.ok) {
        const message = body.notionError || body.error || 'Could not send. Email sales@steadyfnr.com directly.'
        console.error('[steady contact] /api/send-contact', res.status, body)
        set({submitting: false, submitError: message})
        return
      }
      trackGAEvent('generate_lead', {event_category: 'contact', event_label: 'contact_form', currency: 'USD'})
      trackMetaEvent('Lead', {content_name: 'Contact Form', content_category: 'Contact'})
      trackDataHashEvent('Lead', {content_name: 'Contact Form', content_category: 'Contact'})
      trackGoogleAdsConversion(CONTACT_CONVERSION_SEND_TO)
      set({submitting: false, submitted: true})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send. Email sales@steadyfnr.com directly.'
      console.error('[steady contact]', message)
      set({submitting: false, submitError: message})
    }
  }

  function reset() {
    setS({...initial, calYear: new Date().getFullYear(), calMonth: new Date().getMonth()})
  }

  // ---- sub-renders ------------------------------------------------------
  const SegChips = ({label, field, opts}: {label: string; field: 'location' | 'railType' | 'application' | 'infill'; opts: string[]}) => (
    <div className="mb-[18px]">
      <div className={glCls}>{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {opts.map((o) => (
          <button key={o} type="button" className={chip(s[field].includes(o))} onClick={() => set({[field]: toggle(s[field], o)} as Partial<State>)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  function CallWeek() {
    const today = midnight(new Date())
    // After 6 PM Pacific (end of the business day) roll the 8-day window forward a
    // day. Computed here on render/page load — an already-open page is never
    // force-reloaded when the clock hits 6.
    const pacHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date()),
    )
    const startOffset = pacHour >= 18 ? 1 : 0
    const days = Array.from({length: 8}, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + startOffset + i)
      return d
    })
    const sets = days.map((d) => new Set(availMins('call', d)))
    const all = new Set<number>()
    sets.forEach((st) => st.forEach((m) => all.add(m)))
    const rows = [...all].sort((a, b) => a - b)
    if (!rows.length) return <p className="text-gray-400 text-sm">No call availability in the next 8 days.</p>
    const DW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    return (
      <div className="overflow-x-auto">
        <div className="grid gap-[3px] min-w-[340px]" style={{gridTemplateColumns: 'auto repeat(8, minmax(28px, 1fr))'}}>
          <div />
          {days.map((d) => (
            <div key={toIso(d)} className="text-center font-mono pb-0.5">
              <span className="block text-[11px] text-white">{DW[d.getDay()]}</span>
              <span className="block text-[9.5px] text-gray-500">{d.getMonth() + 1}/{d.getDate()}</span>
            </div>
          ))}
          {rows.map((m) => (
            <WeekRow key={m} m={m} days={days} sets={sets} />
          ))}
        </div>
      </div>
    )
  }
  function WeekRow({m, days, sets}: {m: number; days: Date[]; sets: Set<number>[]}) {
    const label = fmtTime(Math.floor(m / 60), m % 60)
    return (
      <>
        <div className="font-mono text-[10px] text-gray-400 text-right pr-1.5 self-center whitespace-nowrap">
          {m % 60 === 0 ? label : ''}
        </div>
        {days.map((d, i) => {
          const iso = toIso(d)
          if (!sets[i].has(m)) return <div key={iso} className="h-4" />
          const sel = s.visitDate === iso && s.slot === label
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${iso} ${label}`}
              className={`h-4 rounded border transition-colors ${sel ? 'bg-sky-500 border-sky-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
              onClick={() => set({visitDate: iso, slot: label, convenience: false})}
            />
          )
        })}
      </>
    )
  }

  function MonthCalendar() {
    const y = s.calYear, m = s.calMonth
    const first = new Date(y, m, 1)
    const startDow = first.getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const monthName = first.toLocaleString('en-US', {month: 'long', year: 'numeric'})
    const cells: React.ReactNode[] = []
    for (let i = 0; i < startDow; i++) cells.push(<div key={`e${i}`} />)
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d)
      const iso = toIso(date)
      const dis = availMins('shop', date).length === 0
      const sel = s.visitDate === iso
      cells.push(
        <button
          key={iso}
          type="button"
          disabled={dis}
          onClick={() => set({visitDate: iso, slot: '', convenience: false})}
          className={`aspect-square rounded-lg border text-[13.5px] transition-colors ${
            sel
              ? 'bg-sky-500 border-sky-500 text-white'
              : dis
                ? 'bg-gray-800/40 border-transparent text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 border-gray-700 text-white hover:border-gray-500'
          }`}
        >
          {d}
        </button>,
      )
    }
    const shift = (delta: number) => {
      let nm = m + delta, ny = y
      if (nm < 0) {nm = 11; ny--}
      if (nm > 11) {nm = 0; ny++}
      set({calMonth: nm, calYear: ny})
    }
    return (
      <div className="border border-gray-700 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white hover:border-gray-500">‹</button>
          <span className="text-[15px] font-semibold text-white">{monthName}</span>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 text-white hover:border-gray-500">›</button>
        </div>
        <div className="grid grid-cols-7 gap-[5px] mb-[5px]">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d} className="font-mono text-[10.5px] text-gray-500 text-center">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[5px]">{cells}</div>
      </div>
    )
  }

  function Slots() {
    if (!s.visitDate) return null
    const d = new Date(s.visitDate + 'T00:00')
    const all = daySlotMins(kind, d) // rule-based; already-booked ones are shown greyed out
    if (!all.length) return <p className="text-gray-400 text-sm">No availability that day — pick another.</p>
    const iso = toIso(d)
    return (
      <div className="mb-[18px]">
        <div className={glCls}>{kind === 'shop' ? 'Available times · 1 hr' : 'Available times · 30 min'}</div>
        <div className="grid gap-2.5" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))'}}>
          {all.map((m) => {
            const t = slotLabel(kind, m)
            const taken = overlapsBooked(iso, m, slotStep(kind))
            const sel = s.slot === t
            return (
              <button
                key={m}
                type="button"
                disabled={taken}
                onClick={() => !taken && set({slot: t})}
                className={`rounded-lg border py-2.5 px-1.5 text-[13px] font-mono transition-colors ${
                  taken
                    ? 'bg-gray-800/40 border-transparent text-gray-600 line-through cursor-not-allowed'
                    : sel
                      ? 'bg-sky-500/15 border-sky-500 text-white cursor-pointer'
                      : 'bg-gray-800 border-gray-700 text-white hover:border-gray-500 cursor-pointer'
                }`}>
                {t}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function summaryRows(): Array<[string, string]> {
    const rows: Array<[string, string]> = []
    const add = (k: string, v?: string | string[]) => {
      const val = Array.isArray(v) ? v.join(', ') : v
      if (val && val.trim()) rows.push([k, val])
    }
    add('Name', s.name); add('Email', s.email); add('Phone', s.phone); add('Company / firm', s.company)
    add('Connect via', effPath ? PATHS[effPath].t : '')
    if (s.convenience) add('Scheduling', effPath === 'visitShop' ? "Flexible — we'll reach out to find a time" : 'Flexible — contact at your convenience')
    else if (s.visitDate) add(effPath === 'visitShop' ? 'Shop visit' : 'Call time', fmtDate(s.visitDate) + (s.slot ? ` · ${s.slot}` : ''))
    const addr = [s.street, s.city, [s.region, s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    add('Property', addr); add('Property type', s.propType)
    if (s.mode === 'talk') add('Project', 'Still deciding — wants to talk')
    if (s.mode === 'specs') {add('Location', s.location); add('Rail type', s.railType); add('Application', s.application); add('Infill', s.infill)}
    if (s.files.length) add('Files', s.files.map((f) => f.name))
    add('Notes', s.additional)
    return rows
  }

  // ---- success ----------------------------------------------------------
  if (s.submitted) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-sky-500/15 border border-sky-500/50 text-sky-400 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="text-2xl font-bold text-white mb-1.5">Thanks, {(s.name || 'there').split(' ')[0]}!</h2>
        <p className="text-gray-400 text-[15px] mb-6">We&apos;ve got your message and will be in touch shortly.</p>
        <div className="max-w-md mx-auto text-left">
          {summaryRows().map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 border-b border-gray-800 last:border-0">
              <span className="font-mono text-[13px] text-gray-400">{k}</span>
              <span className="text-[14px] text-white text-right break-words">{v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- step body --------------------------------------------------------
  let body: React.ReactNode = null
  if (cur === 'info') {
    body = (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">Personal info</h2>
        <p className="text-gray-400 text-sm mb-[18px]">Start here. You can submit at any point once this is filled.</p>
        {s.errContact && <div className="mb-4 rounded-lg border border-red-400/35 bg-red-400/10 text-red-300 text-[13.5px] px-3 py-2.5">{s.errContact}</div>}
        <div className="mb-4">
          <label className={labelCls} htmlFor="c_name">Name<span className="text-sky-400 ml-0.5">*</span></label>
          <input id="c_name" className={inputCls} placeholder="Jordan Reyes" value={s.name} onChange={(e) => set({name: e.target.value, errName: ''})} />
          {s.errName && <div className="text-red-300 text-[13px] mt-1.5">{s.errName}</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="c_email">Email<span className="text-sky-400 ml-0.5">*</span></label>
            <input id="c_email" type="email" className={inputCls} placeholder="you@email.com" value={s.email} onChange={(e) => set({email: e.target.value, errEmail: '', errContact: ''})} />
            {s.errEmail && <div className="text-red-300 text-[13px] mt-1.5">{s.errEmail}</div>}
          </div>
          <div>
            <label className={labelCls} htmlFor="c_phone">Phone<span className="text-sky-400 ml-0.5">*</span></label>
            <input id="c_phone" type="tel" className={inputCls} placeholder="(415) 555-0100" value={s.phone} onChange={(e) => set({phone: formatPhone(e.target.value), errPhone: '', errContact: ''})} />
            {s.errPhone && <div className="text-red-300 text-[13px] mt-1.5">{s.errPhone}</div>}
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls} htmlFor="c_company">Company / firm <span className="text-gray-500 normal-case tracking-normal">— optional</span></label>
          <input id="c_company" className={inputCls} placeholder="e.g. Harbor Architects" value={s.company} onChange={(e) => set({company: e.target.value})} />
        </div>
      </>
    )
  } else if (cur === 'path') {
    body = (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">How would you like to connect?</h2>
        <p className="text-gray-400 text-sm mb-[18px]">You can change this later.</p>
        <div className="flex flex-col gap-3">
          {['scheduleCall', 'visitShop'].map((key) => (
            <button key={key} type="button" onClick={() => set({path: key})}
              className={`text-left rounded-xl border p-4 transition-colors ${s.path === key ? 'bg-sky-500/15 border-sky-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
              <div className="text-[15.5px] font-semibold text-white">{PATHS[key].t}</div>
              <div className="text-[13px] text-gray-400 mt-0.5">{PATHS[key].d}</div>
            </button>
          ))}
        </div>
      </>
    )
  } else if (cur === 'schedule') {
    body = effPath === 'visitShop' ? (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">Book your shop visit</h2>
        <p className="text-gray-400 text-sm mb-[18px]">Pick a date, then choose a one-hour time block.</p>
        <MonthCalendar />
        <Slots />
        <button type="button" onClick={() => set({convenience: !s.convenience, visitDate: s.convenience ? s.visitDate : '', slot: s.convenience ? s.slot : ''})}
          className={`block w-full mt-4 rounded-xl border px-4 py-3.5 text-sm text-center transition-colors ${s.convenience ? 'bg-sky-500/15 border-sky-500 text-white' : 'bg-gray-800 border-gray-600 border-dashed text-white hover:border-sky-500/50'}`}>
          Scheduling Can Be Hard: Click Here And We&apos;ll Reach Out To Find A Time That Works
        </button>
      </>
    ) : (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">Schedule a call</h2>
        <p className="text-gray-400 text-sm mb-[18px]">Tap a 30-minute slot.</p>
        <CallWeek />
        {s.visitDate && s.slot && !s.convenience && (
          <p className="text-gray-400 text-sm mt-3">Selected: <b className="text-white">{fmtDate(s.visitDate)} · {s.slot}</b></p>
        )}
        <button type="button" onClick={() => set({convenience: !s.convenience, visitDate: s.convenience ? s.visitDate : '', slot: s.convenience ? s.slot : ''})}
          className={`block w-full mt-4 rounded-xl border px-4 py-3.5 text-sm text-center transition-colors ${s.convenience ? 'bg-sky-500/15 border-sky-500 text-white' : 'bg-gray-800 border-gray-600 border-dashed text-white hover:border-sky-500/50'}`}>
          Scheduling Can Be Hard: Click Here And We&apos;ll Contact You
        </button>
      </>
    )
  } else if (cur === 'property') {
    body = (
      <>
        <h2 className="text-xl font-semibold text-white mb-[18px]">Property info</h2>
        <div className="mb-[18px]">
          <div className={glCls}>Property type</div>
          <div className="flex flex-wrap gap-2.5">
            {['Residential', 'Commercial'].map((t) => (
              <button key={t} type="button" className={chip(s.propType === t)} onClick={() => set({propType: t})}>{t}</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className={labelCls} htmlFor="c_street">Street address</label>
          <input id="c_street" className={inputCls} placeholder="123 Shoreline Dr" value={s.street} onChange={(e) => set({street: e.target.value})} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr_1fr] gap-3">
          <div>
            <label className={labelCls} htmlFor="c_city">City</label>
            <input id="c_city" className={inputCls} placeholder="San Francisco" value={s.city} onChange={(e) => set({city: e.target.value})} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c_region">State</label>
            <input id="c_region" className={inputCls} placeholder="CA" value={s.region} onChange={(e) => set({region: e.target.value})} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c_zip">Zip code</label>
            <input id="c_zip" className={inputCls} placeholder="94121" value={s.zip} onChange={(e) => set({zip: e.target.value})} />
          </div>
        </div>
      </>
    )
  } else if (cur === 'specs') {
    body = (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">What are you looking for?</h2>
        <p className="text-gray-400 text-sm mb-[18px]">Give us the gist, or tell us you&apos;d rather just talk it through.</p>
        <div className="flex flex-wrap gap-2.5 mb-[18px]">
          <button type="button" className={chip(s.mode === 'specs')} onClick={() => set({mode: 'specs'})}>I have project specs</button>
          <button type="button" className={chip(s.mode === 'talk')} onClick={() => set({mode: 'talk'})}>Still deciding / want to talk</button>
        </div>
        {s.mode === 'specs' && (
          <>
            <SegChips label="Location" field="location" opts={['Interior', 'Exterior']} />
            <SegChips label="Rail type" field="railType" opts={['Guardrail', 'Handrail']} />
            <SegChips label="Application" field="application" opts={['Stairs', 'Deck', 'Other']} />
            <SegChips label="Infill" field="infill" opts={['Cable Rail', 'Picket', 'Slat', 'No Infill', 'Custom', 'Not sure']} />
          </>
        )}
        {s.mode === 'talk' && (
          <div className="rounded-lg border border-sky-500/50 bg-sky-500/15 text-white text-sm px-3 py-2.5 mb-[18px]">No problem — we&apos;ll walk through the options together when we connect.</div>
        )}
        <div className="mb-4">
          <label className={labelCls} htmlFor="c_files">Photos / files <span className="text-gray-500 normal-case tracking-normal">— optional</span></label>
          <input id="c_files" type="file" multiple accept="image/*,.pdf,.heic" className="w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border file:border-gray-700 file:bg-gray-800 file:text-white file:px-3 file:py-2 file:cursor-pointer"
            onChange={(e) => set({files: Array.from(e.target.files || [])})} />
          {s.files.length > 0 && <p className="text-gray-400 text-sm mt-2">{s.files.length} file{s.files.length > 1 ? 's' : ''} added — {s.files.map((f) => f.name).join(', ')}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="c_add">Additional information <span className="text-gray-500 normal-case tracking-normal">— optional</span></label>
          <textarea id="c_add" className={`${inputCls} min-h-[88px] resize-y`} placeholder="Approx. linear feet, timeline, style references, anything else…" value={s.additional} onChange={(e) => set({additional: e.target.value})} />
        </div>
      </>
    )
  } else if (cur === 'review') {
    body = (
      <>
        <h2 className="text-xl font-semibold text-white mb-1">Review &amp; send</h2>
        <p className="text-gray-400 text-sm mb-[18px]">Here&apos;s what we&apos;ll receive.</p>
        <div>
          {summaryRows().map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 border-b border-gray-800 last:border-0">
              <span className="font-mono text-[13px] text-gray-400">{k}</span>
              <span className="text-[14px] text-white text-right break-words">{v}</span>
            </div>
          ))}
          {!summaryRows().length && <p className="text-gray-400 text-sm">Nothing entered yet.</p>}
        </div>
        {s.submitError && <div className="mt-4 rounded-lg border border-red-400/35 bg-red-400/10 text-red-300 text-[13.5px] px-3 py-2.5">{s.submitError}</div>}
      </>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-xs tracking-wide text-gray-400">Step {idx + 1} of {seq.length}{seq.length === 2 ? ' +' : ''}</span>
      </div>
      <div className="flex gap-1.5 mb-6">
        {seq.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < idx ? 'bg-sky-500' : i === idx ? 'bg-sky-500/50' : 'bg-gray-700'}`} />
        ))}
      </div>

      <div>{body}</div>

      <div className="flex items-center gap-2.5 mt-6 flex-wrap">
        {idx > 0 && <button type="button" className={btnGhost} onClick={() => set({idx: Math.max(0, idx - 1)})}>Back</button>}
        <div className="flex-1" />
        {canSkip && (
          <button type="button" onClick={() => set({idx: reviewIdx})}
            className="px-5 py-2.5 rounded-lg bg-transparent border border-sky-500/50 text-sky-400 hover:bg-sky-500/10 transition-colors inline-flex flex-col items-start leading-tight">
            <span className="text-[15px] font-semibold">Forms Can Be Long</span>
            <span className="text-[11px] text-gray-500 font-normal">Skip to the end</span>
          </button>
        )}
        {cur === 'review' ? (
          <button type="button" className={btnPrimary} disabled={s.submitting} onClick={submit}>
            {s.submitting ? 'Sending…' : 'Send request'}
          </button>
        ) : (
          <button type="button" className={btnPrimary} onClick={advance}>Continue</button>
        )}
      </div>
    </div>
  )
}
