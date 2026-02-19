import React from 'react'
import type {SectionConfig} from '../utils/calculations'

interface SectionsConfiguratorProps {
  sections: SectionConfig[]
  onChange: (sections: SectionConfig[]) => void
}

// We start at 2 because the initial section in QuoteBuilder uses "1".
let nextSectionId = 2

function createSection(): SectionConfig {
  return {
    id: String(nextSectionId++),
    lengthFeet: 10,
    type: 'flat',
  }
}

/**
 * Step 3: Configure one or more sections.
 * Users can add/remove sections and choose between flat and angled (45°) runs.
 */
export function SectionsConfigurator({sections, onChange}: SectionsConfiguratorProps) {
  const handleLengthChange = (id: string, value: string) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    onChange(
      sections.map((section) =>
        section.id === id ? {...section, lengthFeet: numeric} : section,
      ),
    )
  }

  const handleTypeChange = (id: string, type: SectionConfig['type']) => {
    onChange(
      sections.map((section) =>
        section.id === id ? {...section, type} : section,
      ),
    )
  }

  const handleAddSection = () => {
    onChange([...sections, createSection()])
  }

  const handleRemoveSection = (id: string) => {
    if (sections.length <= 1) return
    onChange(sections.filter((section) => section.id !== id))
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">4. Railing sections</h3>
      <p className="text-sm text-gray-400">
        Outline your railing dimensions by adjusting the length, angle, and adding sections.
      </p>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="bg-gray-900 border border-gray-800 rounded-md p-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">
                  Section {index + 1}
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(section.id)}
                    className="text-[11px] text-gray-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-gray-300">
                    Length (feet)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={section.lengthFeet}
                    onChange={(e) => handleLengthChange(section.id, e.target.value)}
                    className="w-full rounded-md bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-gray-300">Type</span>
                  <select
                    value={section.type}
                    onChange={(e) =>
                      handleTypeChange(section.id, e.target.value as SectionConfig['type'])
                    }
                    className="w-full rounded-md bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    <option value="flat">Flat / level</option>
                    <option value="angled">Angled (45°)</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddSection}
        className="inline-flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-900"
      >
        <span className="text-base leading-none">+</span>
        Add another section
      </button>
    </div>
  )
}

