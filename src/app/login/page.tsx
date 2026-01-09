'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Activity, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('Onjuist wachtwoord')
      }
    } catch {
      setError('Er ging iets mis. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-brand flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-[var(--primary-50)] rounded-[var(--radius-lg)]">
              <Activity className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Feeling Fit</h1>
              <p className="text-sm text-slate-500">Dashboard</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer wachtwoord in"
                  className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-lg)] border border-[var(--border)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent
                           text-slate-900 placeholder:text-slate-400"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-sm text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 bg-[var(--primary)] text-white font-medium rounded-[var(--radius-lg)]
                       hover:bg-[var(--primary-600)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Laden...' : 'Inloggen'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Member Management System
        </p>
      </motion.div>
    </div>
  )
}
