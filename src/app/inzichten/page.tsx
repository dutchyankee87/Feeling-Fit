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

interface KennismakingMonthData {
  month: string
  monthLabel: string
  totalClients: number
  totalBookings: number
  bookedClients: number
  bookedRate: number
  convertedClients: number
  conversionRate: number
}

interface KennismakingFunnelData {
  totalClients: number
  totalBookings: number
  bookedClients: number
  bookedRate: number
  convertedClients: number
  conversionRate: number
}

interface MTInsights {
  kennismakingBookedRate: number
  kennismakingBookings: number
  kennismakingToLidConversion: number
  kennismakingClientsTotal: number
  kennismakingRecent: KennismakingFunnelData
  kennismakingAllTime: KennismakingFunnelData
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
  ptClientCount: number
  fitnessClientCount: number
  ptRatioPercentage: number
  kennismakingByMonth: KennismakingMonthData[]
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
                    title="Kennismaking Geboekt"
                    value={`${insights.kennismakingBookedRate}%`}
                    icon={UserCheck}
                    variant={insights.kennismakingBookedRate >= 70 ? 'success' : insights.kennismakingBookedRate < 50 ? 'warning' : 'default'}
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

            {/* PT vs Fitness Verdeling */}
            {!loading && insights && (
              <motion.div variants={itemVariants} className="mb-8">
                <Card hover={false} padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">PT vs Fitness Verdeling</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Verhouding Personal Training vs regulier fitness
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-[var(--primary)]">{insights.ptClientCount}</p>
                        <p className="text-xs text-slate-500">PT Klanten</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{insights.fitnessClientCount}</p>
                        <p className="text-xs text-slate-500">Fitness Klanten</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{insights.ptRatioPercentage}%</p>
                        <p className="text-xs text-slate-500">PT Ratio</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Kennismaking Details — Laatste 13 maanden */}
            {!loading && insights && (
              <motion.div variants={itemVariants} className="mb-4">
                <Card hover={false} padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">Kennismaking Funnel — Laatste 13 maanden</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Boekingen binnen het trial-venster (tot conversie of max 28 dagen na start)
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{insights.kennismakingRecent.totalClients}</p>
                        <p className="text-xs text-slate-500">Kennismakingen</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{insights.kennismakingRecent.bookedRate}%</p>
                        <p className="text-xs text-slate-500">Geboekt ({insights.kennismakingRecent.bookedClients})</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-2xl font-bold text-[var(--primary)]">{insights.kennismakingRecent.conversionRate}%</p>
                        <p className="text-xs text-slate-500">Conversie ({insights.kennismakingRecent.convertedClients})</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Kennismaking Details — All-time */}
            {!loading && insights && (
              <motion.div variants={itemVariants} className="mb-8">
                <Card hover={false} padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-700">Kennismaking Funnel — All-time</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Alle kennismakingen sinds begin (boekingen alleen zichtbaar vanaf 13 maanden geleden)
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-xl font-semibold text-slate-700">{insights.kennismakingAllTime.totalClients}</p>
                        <p className="text-xs text-slate-500">Kennismakingen</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-xl font-semibold text-emerald-700">{insights.kennismakingAllTime.bookedRate}%</p>
                        <p className="text-xs text-slate-500">Geboekt ({insights.kennismakingAllTime.bookedClients})</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300" />
                      <div>
                        <p className="text-xl font-semibold text-[var(--primary)]">{insights.kennismakingAllTime.conversionRate}%</p>
                        <p className="text-xs text-slate-500">Conversie ({insights.kennismakingAllTime.convertedClients})</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Kennismaking Funnel per Maand */}
            {!loading && insights && insights.kennismakingByMonth && (
              <motion.div variants={itemVariants} className="mb-8">
                <Card hover={false} padding="none">
                  <CardHeader className="px-6 py-4">
                    <CardTitle>Kennismaking Funnel per Maand</CardTitle>
                    <CardDescription>Laatste 12 maanden</CardDescription>
                  </CardHeader>
                  <div className="px-6 pb-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="pb-2 pr-4">Maand</th>
                          <th className="pb-2 pr-4 text-right">Kennismakingen</th>
                          <th className="pb-2 pr-4 text-right">Geboekt</th>
                          <th className="pb-2 pr-4 text-right">% Geboekt</th>
                          <th className="pb-2 pr-4 text-right">Geconverteerd</th>
                          <th className="pb-2 text-right">% Conversie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights.kennismakingByMonth.map(m => (
                          <tr key={m.month} className="border-b border-slate-100">
                            <td className="py-2 pr-4 font-medium">{m.monthLabel}</td>
                            <td className="py-2 pr-4 text-right">{m.totalClients}</td>
                            <td className="py-2 pr-4 text-right">{m.bookedClients}</td>
                            <td className="py-2 pr-4 text-right">
                              <span className={m.bookedRate >= 70 ? 'text-emerald-600 font-medium' : m.bookedRate > 0 && m.bookedRate < 50 ? 'text-red-500 font-medium' : ''}>
                                {m.totalClients > 0 ? `${m.bookedRate}%` : '-'}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right">{m.convertedClients}</td>
                            <td className="py-2 text-right">
                              <span className={m.conversionRate >= 50 ? 'text-emerald-600 font-medium' : m.conversionRate > 0 && m.conversionRate < 30 ? 'text-red-500 font-medium' : ''}>
                                {m.bookedClients > 0 ? `${m.conversionRate}%` : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
