import React from 'react'
import type {SectionConfig} from '../utils/calculations'

interface SectionConfiguratorProps {
  section: SectionConfig
  onChange: (section: SectionConfig) => void
}

/**
 * Step 3: Configure a single flat section.
 * Later we can expand this to multiple sections and angled runs.
 */
export function SectionConfigurator({section, onChange}: SectionConfiguratorProps) {
  const handleLengthChange = (value: string) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    onChange({...section, lengthFeet: numeric})
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">3. Section length</h3>
      <p className="text-sm text-gray-400">
        For the MVP we&apos;ll start with a single straight section. You can think of this as one
        side of your deck or balcony.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-300">Section length</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={section.lengthFeet}
            onChange={(e) => handleLengthChange(e.target.value)}
            className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </label>
        <div className="text-xs text-gray-400 pb-2">feet (straight / flat)</div>
      </div>
    </div>
  )
}

