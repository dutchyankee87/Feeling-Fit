'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Euro, Moon, UserCheck, ArrowRight } from 'lucide-react'

// Components
import { Header } from '@/components/dashboard/Header'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { BezoekdichtheidChart } from '@/components/dashboard/BezoekdichtheidChart'
import { ChurnByProductChart } from '@/components/dashboard/ChurnByProductChart'
import { CheckInHeatmap } from '@/components/dashboard/CheckInHeatmap'
import { ContractDurationTable } from '@/components/dashboard/ContractDurationTable'
import { MetricsLegend } from '@/components/dashboard/MetricsLegend'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { SkeletonStatsCard, Skeleton } from '@/components/ui/Skeleton'

// Types
interface BezoekdichtheidCategory {
  count: number
  pct: number
}

interface BezoekdichtheidBreakdown {
  superActief: BezoekdichtheidCategory
  actief: BezoekdichtheidCategory
  risico: BezoekdichtheidCategory
  slapend: BezoekdichtheidCategory
}

interface ProductChurnRate {
  product: string
  activeCount: number
  endedCount: number
  totalCount: number
  churnRate: number
}

interface ProductDuration {
  product: string
  avgDays: number
  avgMonths: number
  count: number
}

interface CheckInHourData {
  hour: number
  avg: number
}

interface CheckInDayData {
  day: string
  avg: number
}

interface MTInsights {
  kennismakingShowUpRate: number
  kennismakingBookings: number
  kennismakingToLidConversion: number
  kennismakingClientsTotal: number
  avgLTV: number
  totalLTV: number
  churnRateByProduct: ProductChurnRate[]
  avgContractDurationByProduct: ProductDuration[]
  slapendeLedenPercentage: number
  slapendeLedenCount: number
  checkInsByHour: CheckInHourData[]
  checkInsByDay: CheckInDayData[]
  bezoekdichtheid: BezoekdichtheidBreakdown
  totalActiveMembers: number
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function InzichtenPage() {
  const [insights, setInsights] = useState<MTInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/insights')
      const data = await response.json()

      if (data.success) {
        setInsights(data.data)
        setLastSync(new Date())
      } else {
        setError(data.error || 'Er is een fout opgetreden')
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      setError('Kon de gegevens niet ophalen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="min-h-screen bg-gradient-brand">
      <Header lastSync={lastSync} loading={loading} onSync={fetchData} />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Page Title */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">MT Inzichten</h1>
          <p className="text-slate-600 mt-1">Strategische metrics voor het management team</p>
        </motion.div>

        {error ? (
          <motion.div variants={itemVariants}>
            <Card hover={false}>
              <div className="text-center py-12">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-slate-500 mt-2">Controleer of USE_TRAININ_API=true is ingesteld.</p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* KPI Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {loading ? (
                <>
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                  <SkeletonStatsCard />
                </>
              ) : insights && (
                <>
                  <StatsCard
                    title="Kennismaking Show-up"
                    value={`${insights.kennismakingShowUpRate}%`}
                    icon={UserCheck}
                    variant={insights.kennismakingShowUpRate >= 70 ? 'success' : insights.kennismakingShowUpRate < 50 ? 'warning' : 'default'}
                    delay={0}
                  />
                  <StatsCard
                    title="Conversie Rate"
                    value={`${insights.kennismakingToLidConversion}%`}
                    icon={TrendingUp}
                    variant={insights.kennismakingToLidConversion >= 50 ? 'success' : insights.kennismakingToLidConversion < 30 ? 'warning' : 'default'}
                    delay={0.1}
                  />
                  <StatsCard
                    title="Gem. LTV"
                    value={`€${insights.avgLTV}`}
                    icon={Euro}
                    variant="default"
                    delay={0.2}
                  />
                  <StatsCard
                    title="Slapende Leden"
                    value={`${insights.slapendeLedenPercentage}%`}
                    icon={Moon}
                    variant={insights.slapendeLedenPercentage > 20 ? 'danger' : insights.slapendeLedenPercentage > 10 ? 'warning' : 'success'}
                    delay={0.3}
                  />
                </>
              )}
            </motion.div>

            {/* Kennismaking Details */}
            {!loading && insights && (
              <motion.div variants={itemVariants} className="mb-8">
                <Card hover={false} padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">Kennismaking Funnel</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {insights.kennismakingClientsTotal} klanten met kennismaking product
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{insights.kennismakingBookings}</p>
                        <p className="text-xs text-slate-500">Boekingen</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{insights.kennismakingShowUpRate}%</p>
                        <p className="text-xs text-slate-500">Show-up</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-2xl font-bold text-[var(--primary)]">{insights.kennismakingToLidConversion}%</p>
                        <p className="text-xs text-slate-500">Conversie</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bezoekdichtheid Chart */}
              <motion.div variants={itemVariants}>
                <Card hover={false} padding="none">
                  <CardHeader className="px-6 py-4">
                    <CardTitle>Bezoekdichtheid</CardTitle>
                    <CardDescription>Activiteitsniveau leden (12 weken)</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    {loading ? (
                      <Skeleton height={280} />
                    ) : insights && (
                      <BezoekdichtheidChart data={insights.bezoekdichtheid} />
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Churn per Product */}
              <motion.div variants={itemVariants}>
                <Card hover={false} padding="none">
                  <CardHeader className="px-6 py-4">
                    <CardTitle>Churn per Product</CardTitle>
                    <CardDescription>Percentage beëindigde producten</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    {loading ? (
                      <Skeleton height={280} />
                    ) : insights && insights.churnRateByProduct.length > 0 ? (
                      <ChurnByProductChart data={insights.churnRateByProduct} />
                    ) : (
                      <div className="h-72 flex items-center justify-center text-slate-500">
                        Geen churn data beschikbaar
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Check-in Heatmap */}
            <motion.div variants={itemVariants} className="mb-8">
              <Card hover={false} padding="none">
                <CardHeader className="px-6 py-4">
                  <CardTitle>Check-in Patronen</CardTitle>
                  <CardDescription>Gemiddelde check-ins per dag en uur (laatste 90 dagen)</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  {loading ? (
                    <Skeleton height={200} />
                  ) : insights && (
                    <CheckInHeatmap
                      byHour={insights.checkInsByHour}
                      byDay={insights.checkInsByDay}
                    />
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Contract Duration & Legend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contract Duration */}
              <motion.div variants={itemVariants}>
                <Card hover={false} padding="none">
                  <CardHeader className="px-6 py-4">
                    <CardTitle>Gemiddelde Contractduur</CardTitle>
                    <CardDescription>Per product type</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6">
                    {loading ? (
                      <Skeleton height={200} />
                    ) : insights && (
                      <ContractDurationTable data={insights.avgContractDurationByProduct} />
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Legend */}
              <motion.div variants={itemVariants}>
                <Card hover={false} padding="md">
                  <MetricsLegend />
                </Card>
              </motion.div>
            </div>

            {/* Summary Stats */}
            {!loading && insights && (
              <motion.div variants={itemVariants} className="mt-8">
                <Card hover={false} padding="md">
                  <div className="flex flex-wrap gap-8 justify-center text-center">
                    <div>
                      <p className="text-3xl font-bold text-slate-900">{insights.totalActiveMembers}</p>
                      <p className="text-sm text-slate-500">Actieve Leden</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-600">€{insights.totalLTV.toLocaleString('nl-NL')}</p>
                      <p className="text-sm text-slate-500">Totale LTV</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-amber-600">{insights.slapendeLedenCount}</p>
                      <p className="text-sm text-slate-500">Slapende Leden</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.main>
    </div>
  )
}
