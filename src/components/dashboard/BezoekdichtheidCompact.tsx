'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BezoekdichtheidCategory {
  count: number
  pct: number
}

interface BezoekdichtheidBreakdown {
  superActief: BezoekdichtheidCategory
  actief: BezoekdichtheidCategory
  risico: BezoekdichtheidCategory
  slapend: BezoekdichtheidCategory
}

interface BezoekdichtheidCompactProps {
  data: BezoekdichtheidBreakdown
  className?: string
}

const categories = [
  { key: 'superActief', label: 'Super', color: 'bg-emerald-500' },
  { key: 'actief', label: 'Actief', color: 'bg-emerald-400' },
  { key: 'risico', label: 'Risico', color: 'bg-amber-400' },
  { key: 'slapend', label: 'Slapend', color: 'bg-red-400' },
] as const

export function BezoekdichtheidCompact({ data, className }: BezoekdichtheidCompactProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
        {categories.map(({ key, color }) => {
          const pct = data[key].pct
          if (pct === 0) return null
          return (
            <motion.div
              key={key}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn(color)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {categories.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', color)} />
            <span className="text-slate-600">{label}</span>
            <span className="font-medium text-slate-900">{data[key].pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
