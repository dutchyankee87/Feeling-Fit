'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
  colorByValue?: boolean
}

const sizeConfig = {
  sm: { size: 40, strokeWidth: 4, fontSize: 'text-xs' },
  md: { size: 56, strokeWidth: 5, fontSize: 'text-sm' },
  lg: { size: 72, strokeWidth: 6, fontSize: 'text-lg' },
}

function getColorByValue(value: number): string {
  if (value >= 70) return 'var(--risk-critical)'
  if (value >= 50) return 'var(--risk-high)'
  if (value >= 30) return 'var(--risk-medium)'
  return 'var(--risk-low)'
}

export function ProgressRing({
  value,
  max = 100,
  size = 'md',
  showValue = true,
  className,
  colorByValue = true,
}: ProgressRingProps) {
  const config = sizeConfig[size]
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value, max) / max
  const strokeDashoffset = circumference - progress * circumference

  const strokeColor = colorByValue ? getColorByValue(value) : 'var(--primary)'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={config.size}
        height={config.size}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={config.strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {showValue && (
        <span className={cn(
          'absolute font-bold text-slate-900',
          config.fontSize
        )}>
          {Math.round(value)}
        </span>
      )}
    </div>
  )
}
