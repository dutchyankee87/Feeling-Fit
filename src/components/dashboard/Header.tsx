'use client'

import { motion } from 'framer-motion'
import { Activity, RefreshCw, AlertTriangle, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  lastSync: Date | null
  loading: boolean
  onSync: () => void
}

export function Header({ lastSync, loading, onSync }: HeaderProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', label: 'Churn Risico', icon: AlertTriangle },
    { href: '/leden', label: 'Ledenlijst', icon: Users },
    { href: '/inzichten', label: 'MT Inzichten', icon: BarChart3 },
  ]

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--border)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-[var(--primary-50)] rounded-[var(--radius-lg)]">
                <Activity className="h-6 w-6 md:h-7 md:w-7 text-[var(--primary)]" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-900">Feeling Fit</h1>
                <p className="text-sm text-slate-500">Member Management System</p>
              </div>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Navigation - Mobile */}
            <nav className="flex md:hidden items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-slate-600 bg-slate-100'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden lg:block text-sm text-slate-500">
              {lastSync
                ? `Laatste sync: ${lastSync.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
                : 'Nog niet gesynchroniseerd'
              }
            </span>
            <Button
              onClick={onSync}
              loading={loading}
              size="sm"
              className="md:hidden"
              icon={
                <motion.div
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
              }
            >
              Sync
            </Button>
            <Button
              onClick={onSync}
              loading={loading}
              className="hidden md:flex"
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
