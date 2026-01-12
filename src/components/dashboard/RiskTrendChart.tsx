'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

// Dynamic import for recharts to avoid SSR issues
const AreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false }
)
const Area = dynamic(
  () => import('recharts').then((mod) => mod.Area),
  { ssr: false }
)
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
)
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
)
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
)
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

interface RiskTrendChartProps {
  data?: { date: string; critical: number; high: number; medium: number }[]
}

// Generate mock data for demo
function generateMockData() {
  const data = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    data.push({
      date: date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }),
      critical: Math.floor(Math.random() * 5) + 2,
      high: Math.floor(Math.random() * 8) + 5,
      medium: Math.floor(Math.random() * 12) + 8,
    })
  }

  return data
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const chartData = useMemo(() => data || generateMockData(), [data])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card hover={false} padding="none">
        <div className="p-6 pb-0">
          <CardHeader className="p-0 border-0">
            <CardTitle>Risico Trend</CardTitle>
            <CardDescription>Aantal leden per risico niveau (30 dagen)</CardDescription>
          </CardHeader>
        </div>

        <CardContent className="p-0">
          <div className="h-64 w-full pr-4">
            {!isMounted ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="w-full h-48" variant="rectangular" />
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--risk-critical)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--risk-critical)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--risk-high)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--risk-high)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--risk-medium)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--risk-medium)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '12px',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  itemSorter={() => 0}
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stackId="1"
                  stroke="var(--risk-critical)"
                  fill="url(#criticalGradient)"
                  strokeWidth={2}
                  name="Kritiek"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stackId="1"
                  stroke="var(--risk-high)"
                  fill="url(#highGradient)"
                  strokeWidth={2}
                  name="Hoog"
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stackId="1"
                  stroke="var(--risk-medium)"
                  fill="url(#mediumGradient)"
                  strokeWidth={2}
                  name="Medium"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 py-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--risk-critical)]" />
              <span className="text-xs text-slate-600">Kritiek</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--risk-high)]" />
              <span className="text-xs text-slate-600">Hoog</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--risk-medium)]" />
              <span className="text-xs text-slate-600">Medium</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
