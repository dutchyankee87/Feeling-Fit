'use client'

import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, getRiskLabel } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/ProgressRing'

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

interface RiskMemberCardProps {
  member: RiskMember
  index?: number
  compact?: boolean
}

export function RiskMemberCard({ member, index = 0, compact = false }: RiskMemberCardProps) {
  const whatsappUrl = member.phone
    ? `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ backgroundColor: 'var(--muted)' }}
      className={cn(
        'p-4 transition-colors rounded-[var(--radius)] cursor-pointer',
        'border-b border-[var(--border)] last:border-0'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar with initials */}
          <div
            className={cn(
              'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              'text-sm font-semibold',
              member.riskLevel === 'critical' && 'bg-red-100 text-red-700',
              member.riskLevel === 'high' && 'bg-orange-100 text-orange-700',
              member.riskLevel === 'medium' && 'bg-yellow-100 text-yellow-700',
              member.riskLevel === 'low' && 'bg-green-100 text-green-700'
            )}
          >
            {member.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-slate-900 truncate">
              {member.name}
            </h3>
            {compact ? (
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {member.producten.join(', ') || 'Geen producten'}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                {member.phone || member.email || 'Geen contact'}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={member.riskLevel}
                size="sm"
                pulse={member.riskLevel === 'critical'}
              >
                {getRiskLabel(member.riskLevel)}
              </Badge>
              <span className="text-xs text-slate-400">
                {member.daysSinceLastVisit < 999
                  ? `${member.daysSinceLastVisit}d geleden`
                  : 'Nooit bezocht'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!compact && (
            <ProgressRing value={member.riskScore} size="sm" />
          )}
          {compact && (
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">{member.riskScore}</div>
              <div className="text-xs text-slate-400">score</div>
            </div>
          )}
          {whatsappUrl && !compact && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'p-2 rounded-full bg-green-100 text-green-600',
                'hover:bg-green-200 transition-colors'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
