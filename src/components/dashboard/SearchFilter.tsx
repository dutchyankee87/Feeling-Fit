'use client'

import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  riskFilter: string
  onRiskFilterChange: (value: string) => void
  visitFilter: string
  onVisitFilterChange: (value: string) => void
  sortBy?: string
  onSortChange?: (value: string) => void
  activeFilters?: number
  onClearFilters?: () => void
}

const riskOptions = [
  { value: '', label: 'Alle risico niveaus' },
  { value: 'critical', label: 'Kritiek' },
  { value: 'high', label: 'Hoog' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Laag' },
]

const sortOptions = [
  { value: 'riskScore-desc', label: 'Risico (hoog → laag)' },
  { value: 'riskScore-asc', label: 'Risico (laag → hoog)' },
  { value: 'daysSince-desc', label: 'Laatste bezoek (oud → nieuw)' },
  { value: 'daysSince-asc', label: 'Laatste bezoek (nieuw → oud)' },
  { value: 'name-asc', label: 'Naam (A → Z)' },
  { value: 'name-desc', label: 'Naam (Z → A)' },
]

const visitOptions = [
  { value: '', label: 'Alle bezoekstatus' },
  { value: 'never', label: 'Nooit gezien' },
  { value: 'visited', label: '1+ keer geweest' },
]

export function SearchFilter({
  searchQuery,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  visitFilter,
  onVisitFilterChange,
  sortBy,
  onSortChange,
  activeFilters = 0,
  onClearFilters,
}: SearchFilterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Zoek op naam, email of telefoon..."
          className={cn(
            'w-full pl-10 pr-4 py-2.5 text-sm rounded-[var(--radius-lg)]',
            'border border-[var(--border)] bg-white',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent',
            'placeholder:text-slate-400'
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <Select
          value={riskFilter}
          onChange={(e) => onRiskFilterChange(e.target.value)}
          options={riskOptions}
          className="w-44"
        />

        <Select
          value={visitFilter}
          onChange={(e) => onVisitFilterChange(e.target.value)}
          options={visitOptions}
          className="w-40"
        />

        {sortBy !== undefined && onSortChange && (
          <Select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            options={sortOptions}
            className="w-52"
          />
        )}

        {activeFilters > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            <span>Wis filters ({activeFilters})</span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
