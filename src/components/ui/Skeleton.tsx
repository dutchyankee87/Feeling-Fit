'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-[var(--radius)]',
  }

  return (
    <div
      className={cn(
        'bg-slate-200 animate-pulse',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] p-6 border border-[var(--border)]">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonStatsCard() {
  return (
    <div className="bg-white rounded-[var(--radius-lg)] p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={100} height={14} />
          <Skeleton width={60} height={32} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  )
}

export function SkeletonMemberItem() {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton width={40} height={24} />
        <Skeleton width={30} height={10} />
      </div>
    </div>
  )
}
