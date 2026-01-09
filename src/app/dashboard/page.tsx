'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, UserX, AlertCircle, Clock } from 'lucide-react'

// Components
import { Header } from '@/components/dashboard/Header'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ActionItem } from '@/components/dashboard/ActionItem'
import { MemberList } from '@/components/dashboard/MemberList'
import { SearchFilter } from '@/components/dashboard/SearchFilter'
import { RiskTrendChart } from '@/components/dashboard/RiskTrendChart'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { SkeletonStatsCard } from '@/components/ui/Skeleton'

// Types
interface Member {
  klantRef: string
  voornaam: string
  achternaam: string
  volledigeNaam: string
  email: string
  telefoon: string
  producten: string[]
  totaalTarief: number
  status: string
  actiefSinds: string | null
  laatsteCheckIn: string | null
  checkIns30Dagen: number
  checkIns90Dagen: number
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

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

export default function Dashboard() {
  // Data state
  const [riskMembers, setRiskMembers] = useState<RiskMember[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    totalMembers: 0,
    atRisk: 0,
    criticalRisk: 0,
    avgCheckIns: 0,
  })

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [visitFilter, setVisitFilter] = useState('')
  const [sortBy, setSortBy] = useState('riskScore-desc')

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/members?filter=at-risk&limit=50')
      const data = await response.json()

      if (data.success) {
        const members: Member[] = data.data.members

        const transformedMembers: RiskMember[] = members.map((m) => {
          const lastCheckIn = m.laatsteCheckIn ? new Date(m.laatsteCheckIn) : null
          const daysSinceLastVisit = lastCheckIn
            ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
            : 999

          return {
            id: m.klantRef,
            name: m.volledigeNaam,
            email: m.email,
            phone: m.telefoon,
            lastCheckIn: lastCheckIn ? lastCheckIn.toLocaleDateString('nl-NL') : 'Nooit',
            riskLevel: m.riskLevel,
            riskScore: m.riskScore,
            daysSinceLastVisit,
            producten: m.producten,
            checkIns30Dagen: m.checkIns30Dagen,
          }
        })

        setRiskMembers(transformedMembers)
        setStats(data.data.stats)

        // Generate actions
        const generatedActions: Action[] = transformedMembers
          .filter((m) => m.riskLevel === 'critical' || m.riskLevel === 'high')
          .slice(0, 5)
          .map((m, i) => ({
            id: `action-${i}`,
            type: 'whatsapp' as const,
            priority: m.riskLevel === 'critical' ? 1 : 2,
            title:
              m.riskLevel === 'critical'
                ? `Urgente check-in met ${m.name.split(' ')[0]}`
                : `Follow-up ${m.name.split(' ')[0]}`,
            description:
              m.daysSinceLastVisit >= 999
                ? 'Nog nooit ingecheckt - kennismakingsgesprek?'
                : m.daysSinceLastVisit > 90
                ? `Al ${m.daysSinceLastVisit} dagen niet gezien`
                : m.checkIns30Dagen === 0
                ? 'Geen check-ins deze maand'
                : `${m.checkIns30Dagen} check-ins in 30 dagen`,
            targetName: m.name,
            targetPhone: m.phone,
            dueTime: 'Vandaag',
          }))

        setActions(generatedActions)
        setLastSync(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    let result = [...riskMembers]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.phone.includes(query)
      )
    }

    // Risk level filter
    if (riskFilter) {
      result = result.filter((m) => m.riskLevel === riskFilter)
    }

    // Visit status filter
    if (visitFilter === 'never') {
      result = result.filter((m) => m.daysSinceLastVisit >= 999)
    } else if (visitFilter === 'visited') {
      result = result.filter((m) => m.daysSinceLastVisit < 999)
    }

    // Sorting
    const [field, direction] = sortBy.split('-')
    result.sort((a, b) => {
      let comparison = 0
      if (field === 'riskScore') {
        comparison = a.riskScore - b.riskScore
      } else if (field === 'daysSince') {
        comparison = a.daysSinceLastVisit - b.daysSinceLastVisit
      } else if (field === 'name') {
        comparison = a.name.localeCompare(b.name)
      }
      return direction === 'desc' ? -comparison : comparison
    })

    return result
  }, [riskMembers, searchQuery, riskFilter, visitFilter, sortBy])

  // Count active filters
  const activeFilters = [searchQuery, riskFilter, visitFilter].filter(Boolean).length

  const clearFilters = () => {
    setSearchQuery('')
    setRiskFilter('')
    setVisitFilter('')
    setSortBy('riskScore-desc')
  }

  // Top risk members for spotlight
  const topRiskMembers = filteredMembers.slice(0, 4)
  const remainingMembers = filteredMembers.slice(4)

  return (
    <div className="min-h-screen bg-gradient-brand">
      <Header lastSync={lastSync} loading={loading} onSync={fetchData} />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <>
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
            </>
          ) : (
            <>
              <StatsCard
                title="Actieve Leden"
                value={stats.totalMembers}
                icon={Users}
                variant="default"
                delay={0}
              />
              <StatsCard
                title="At Risk"
                value={stats.atRisk}
                icon={UserX}
                variant="warning"
                delay={0.1}
              />
              <StatsCard
                title="Kritiek Risico"
                value={stats.criticalRisk}
                icon={AlertCircle}
                variant="danger"
                delay={0.2}
              />
              <StatsCard
                title="Gem. Check-ins/Week"
                value={stats.avgCheckIns}
                icon={Clock}
                variant="success"
                delay={0.3}
              />
            </>
          )}
        </motion.div>

        {/* Search & Filters */}
        <motion.div variants={itemVariants} className="mb-6">
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            riskFilter={riskFilter}
            onRiskFilterChange={setRiskFilter}
            visitFilter={visitFilter}
            onVisitFilterChange={setVisitFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            activeFilters={activeFilters}
            onClearFilters={clearFilters}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card hover={false} padding="none">
              <CardHeader className="px-6 py-4">
                <CardTitle>Acties Vandaag</CardTitle>
                <CardDescription>{actions.length} taken te doen</CardDescription>
              </CardHeader>
              <div className="px-2">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Laden...</div>
                ) : actions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Geen acties vandaag
                  </div>
                ) : (
                  actions.map((action, index) => (
                    <ActionItem key={action.id} action={action} index={index} />
                  ))
                )}
              </div>
            </Card>
          </motion.div>

          {/* Top Risk Members */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card hover={false} padding="none">
              <CardHeader className="px-6 py-4">
                <CardTitle>Hoogste Churn Risico</CardTitle>
                <CardDescription>Leden die direct aandacht nodig hebben</CardDescription>
              </CardHeader>
              <MemberList
                members={topRiskMembers}
                loading={loading}
                compact={false}
                maxHeight="auto"
                emptyMessage="Geen risico leden gevonden"
              />
            </Card>
          </motion.div>

          {/* All Risk Members */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card hover={false} padding="none">
              <CardHeader className="px-6 py-4">
                <CardTitle>Alle Risico Leden</CardTitle>
                <CardDescription>
                  {filteredMembers.length} leden
                  {activeFilters > 0 && ' (gefilterd)'}
                </CardDescription>
              </CardHeader>
              <MemberList
                members={remainingMembers}
                loading={loading}
                compact={true}
                maxHeight="24rem"
                emptyMessage={
                  activeFilters > 0
                    ? 'Geen leden gevonden met huidige filters'
                    : 'Geen overige risico leden'
                }
              />
            </Card>
          </motion.div>
        </div>

        {/* Risk Trend Chart */}
        <motion.div variants={itemVariants}>
          <RiskTrendChart />
        </motion.div>
      </motion.main>
    </div>
  )
}
