'use client'

import { motion } from 'framer-motion'
import { RiskMemberCard } from './RiskMemberCard'
import { SkeletonMemberItem } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface RiskMember {
  id: string
  name: string
  email: string
  phone: string
  lastCheckIn: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  riskScore: number
  daysSinceLastVisit: number
  producten: string[]
  checkIns30Dagen: number
}

interface MemberListProps {
  members: RiskMember[]
  loading?: boolean
  compact?: boolean
  maxHeight?: string
  emptyMessage?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export function MemberList({
  members,
  loading = false,
  compact = false,
  maxHeight = '24rem',
  emptyMessage = 'Geen leden gevonden',
}: MemberListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonMemberItem key={i} />
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'overflow-y-auto custom-scrollbar',
      )}
      style={{ maxHeight }}
    >
      {members.map((member, index) => (
        <RiskMemberCard
          key={member.id}
          member={member}
          index={index}
          compact={compact}
        />
      ))}
    </motion.div>
  )
}
