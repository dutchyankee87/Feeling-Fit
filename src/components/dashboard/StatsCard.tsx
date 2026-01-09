'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  variant?: 'default' | 'danger' | 'warning' | 'success'
  loading?: boolean
  delay?: number
}

const variantStyles = {
  default: {
    icon: 'bg-[var(--primary-50)] text-[var(--primary)]',
    border: 'border-l-[var(--primary)]',
  },
  danger: {
    icon: 'bg-red-50 text-red-600',
    border: 'border-l-red-500',
  },
  warning: {
    icon: 'bg-orange-50 text-orange-600',
    border: 'border-l-orange-500',
  },
  success: {
    icon: 'bg-green-50 text-green-600',
    border: 'border-l-green-500',
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  loading = false,
  delay = 0,
}: StatsCardProps) {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      className={cn(
        'bg-white rounded-[var(--radius-lg)] p-5 border border-[var(--border)]',
        'shadow-[var(--shadow-card)] border-l-4',
        styles.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-[var(--radius-lg)]', styles.icon)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {loading ? (
              <Skeleton width={60} height={32} className="mt-1" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold text-slate-900 mt-0.5"
              >
                {value}
              </motion.p>
            )}
          </div>
        </div>
        {trend && !loading && (
          <div
            className={cn(
              'text-sm font-medium px-2 py-1 rounded-full',
              trend.direction === 'up'
                ? 'text-green-700 bg-green-50'
                : 'text-red-700 bg-red-50'
            )}
          >
            {trend.direction === 'up' ? '+' : ''}
            {trend.value}%
          </div>
        )}
      </div>
    </motion.div>
  )
}
