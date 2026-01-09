'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface Action {
  id: string
  type: 'call' | 'whatsapp' | 'email'
  priority: number
  title: string
  description: string
  targetName: string
  targetPhone: string
  dueTime: string
}

interface ActionItemProps {
  action: Action
  index?: number
}

const typeConfig = {
  call: {
    icon: Phone,
    color: 'bg-blue-100 text-blue-600',
    action: 'Bel',
    actionColor: 'bg-blue-600 hover:bg-blue-700',
  },
  whatsapp: {
    icon: MessageCircle,
    color: 'bg-green-100 text-green-600',
    action: 'WhatsApp',
    actionColor: 'bg-green-600 hover:bg-green-700',
  },
  email: {
    icon: Mail,
    color: 'bg-purple-100 text-purple-600',
    action: 'Email',
    actionColor: 'bg-purple-600 hover:bg-purple-700',
  },
}

export function ActionItem({ action, index = 0 }: ActionItemProps) {
  const config = typeConfig[action.type]
  const Icon = config.icon

  const getActionUrl = () => {
    if (action.type === 'whatsapp' && action.targetPhone) {
      const phone = action.targetPhone.replace(/[^0-9]/g, '')
      return `https://wa.me/${phone}`
    }
    if (action.type === 'call' && action.targetPhone) {
      return `tel:${action.targetPhone}`
    }
    return '#'
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'p-4 hover:bg-slate-50 transition-colors rounded-[var(--radius)]',
        'border-b border-[var(--border)] last:border-0'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 p-2 rounded-full shrink-0',
            config.color,
            action.priority === 1 && 'ring-2 ring-red-200'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-slate-900 truncate">
                {action.title}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                {action.description}
              </p>
            </div>
            {action.priority === 1 && (
              <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                Urgent
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{action.targetName}</span>
              <span className="text-[var(--primary)] font-medium">{action.dueTime}</span>
            </div>

            {action.targetPhone && (
              <a
                href={getActionUrl()}
                target={action.type === 'whatsapp' ? '_blank' : undefined}
                rel={action.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
                className={cn(
                  'text-xs px-3 py-1.5 text-white rounded-full font-medium',
                  'transition-colors',
                  config.actionColor
                )}
              >
                {config.action}
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
