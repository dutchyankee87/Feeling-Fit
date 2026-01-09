'use client'

import { cn } from '@/lib/utils'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface BadgeProps {
  children: React.ReactNode
  variant?: RiskLevel | 'default' | 'primary'
  size?: 'sm' | 'md'
  pulse?: boolean
  className?: string
}

const variantClasses: Record<string, string> = {
  critical: 'bg-[var(--risk-critical-bg)] text-[var(--risk-critical)] border-[var(--risk-critical)]',
  high: 'bg-[var(--risk-high-bg)] text-[var(--risk-high)] border-[var(--risk-high)]',
  medium: 'bg-[var(--risk-medium-bg)] text-[var(--risk-medium)] border-[var(--risk-medium)]',
  low: 'bg-[var(--risk-low-bg)] text-[var(--risk-low)] border-[var(--risk-low)]',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-[var(--primary-50)] text-[var(--primary-700)] border-[var(--primary-200)]',
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  pulse = false,
  className
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        pulse && variant === 'critical' && 'animate-pulse-critical',
        className
      )}
    >
      {pulse && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          variant === 'critical' && 'bg-[var(--risk-critical)]',
          variant === 'high' && 'bg-[var(--risk-high)]',
        )} />
      )}
      {children}
    </span>
  )
}

export function getRiskLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    critical: 'Kritiek',
    high: 'Hoog',
    medium: 'Medium',
    low: 'Laag',
  }
  return labels[level]
}
