'use client'

import { motion } from 'framer-motion'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  lastSync: Date | null
  loading: boolean
  onSync: () => void
}

export function Header({ lastSync, loading, onSync }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--border)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-50)] rounded-[var(--radius-lg)]">
              <Activity className="h-7 w-7 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Feeling Fit</h1>
              <p className="text-sm text-slate-500">Member Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-slate-500">
              {lastSync
                ? `Laatste sync: ${lastSync.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
                : 'Nog niet gesynchroniseerd'
              }
            </span>
            <Button
              onClick={onSync}
              loading={loading}
              icon={
                <motion.div
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
              }
            >
              {loading ? 'Laden...' : 'Sync'}
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
