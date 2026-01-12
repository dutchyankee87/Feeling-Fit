'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, MessageCircle, Mail, Phone, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react'

// Components
import { Header } from '@/components/dashboard/Header'
import { SearchFilter } from '@/components/dashboard/SearchFilter'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge, getRiskLabel } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// Types
interface RiskFactor {
  name: string
  label: string
  points: number
}

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
  riskFactors: RiskFactor[]
  ltv: number
  aantalBetalingen: number
  laatsteBetaling: string | null
}

interface TableMember {
  id: string
  name: string
  email: string
  phone: string
  lastCheckIn: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  riskScore: number
  riskFactors: RiskFactor[]
  daysSinceLastVisit: number
  producten: string[]
  checkIns30Dagen: number
  checkIns90Dagen: number
  actiefSinds: string
  totaalTarief: number
  ltv: number
  aantalBetalingen: number
}

const ITEMS_PER_PAGE = 25

export default function LedenPage() {
  const [members, setMembers] = useState<TableMember[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [visitFilter, setVisitFilter] = useState('')

  // Column sorting state
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/members?filter=all&limit=500')
      const data = await response.json()

      if (data.success) {
        const rawMembers: Member[] = data.data.members

        const transformedMembers: TableMember[] = rawMembers.map((m) => {
          const lastCheckIn = m.laatsteCheckIn ? new Date(m.laatsteCheckIn) : null
          const actiefSinds = m.actiefSinds ? new Date(m.actiefSinds) : null
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
            riskFactors: m.riskFactors || [],
            daysSinceLastVisit,
            producten: m.producten,
            checkIns30Dagen: m.checkIns30Dagen,
            checkIns90Dagen: m.checkIns90Dagen,
            actiefSinds: actiefSinds ? actiefSinds.toLocaleDateString('nl-NL') : 'Onbekend',
            totaalTarief: m.totaalTarief,
            ltv: m.ltv || 0,
            aantalBetalingen: m.aantalBetalingen || 0,
          }
        })

        setMembers(transformedMembers)
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
  }, [fetchData])

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    let result = [...members]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.phone.includes(query) ||
          m.producten.some(p => p.toLowerCase().includes(query))
      )
    }

    // Risk level filter
    if (riskFilter) {
      result = result.filter((m) => m.riskLevel === riskFilter)
    }

    // Visit status filter
    if (visitFilter === 'never') {
      result = result.filter((m) => m.daysSinceLastVisit >= 900)
    } else if (visitFilter === 'visited') {
      result = result.filter((m) => m.daysSinceLastVisit < 900)
    }

    // Sorting by column
    result.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'daysSince':
          comparison = a.daysSinceLastVisit - b.daysSinceLastVisit
          break
        case 'checkIns':
          comparison = a.checkIns30Dagen - b.checkIns30Dagen
          break
        case 'riskScore':
          comparison = a.riskScore - b.riskScore
          break
        case 'ltv':
          comparison = a.ltv - b.ltv
          break
        case 'aantalBetalingen':
          comparison = a.aantalBetalingen - b.aantalBetalingen
          break
        case 'actiefSinds':
          comparison = a.actiefSinds.localeCompare(b.actiefSinds)
          break
        default:
          comparison = 0
      }
      return sortDirection === 'desc' ? -comparison : comparison
    })

    return result
  }, [members, searchQuery, riskFilter, visitFilter, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, riskFilter, visitFilter, sortColumn, sortDirection])

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort indicator component
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-[var(--primary)]" />
      : <ChevronDown className="h-3.5 w-3.5 text-[var(--primary)]" />
  }

  // Count active filters
  const activeFilters = [searchQuery, riskFilter, visitFilter].filter(Boolean).length

  const clearFilters = () => {
    setSearchQuery('')
    setRiskFilter('')
    setVisitFilter('')
    setSortColumn('name')
    setSortDirection('asc')
  }

  const formatDaysSince = (days: number) => {
    if (days >= 900) return 'Nooit'
    if (days === 0) return 'Vandaag'
    if (days === 1) return 'Gisteren'
    if (days < 7) return `${days} dagen`
    if (days < 30) return `${Math.floor(days / 7)} weken`
    if (days < 90) return `${Math.floor(days / 30)} maanden`
    return `${Math.floor(days / 30)} maanden`
  }

  return (
    <div className="min-h-screen bg-gradient-brand">
      <Header lastSync={lastSync} loading={loading} onSync={fetchData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[var(--primary)]" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Alle Leden</h1>
              <p className="text-sm text-slate-500">
                {loading ? 'Laden...' : `${filteredMembers.length} leden${activeFilters > 0 ? ' (gefilterd)' : ''}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            riskFilter={riskFilter}
            onRiskFilterChange={setRiskFilter}
            visitFilter={visitFilter}
            onVisitFilterChange={setVisitFilter}
            activeFilters={activeFilters}
            onClearFilters={clearFilters}
          />
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover={false} padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50">
                    <th
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Naam
                        <SortIndicator column="name" />
                      </div>
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Contact
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Product(en)
                    </th>
                    <th
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('daysSince')}
                    >
                      <div className="flex items-center gap-1">
                        Laatste bezoek
                        <SortIndicator column="daysSince" />
                      </div>
                    </th>
                    <th
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('checkIns')}
                    >
                      <div className="flex items-center gap-1">
                        Check-ins (30d)
                        <SortIndicator column="checkIns" />
                      </div>
                    </th>
                    <th
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('riskScore')}
                    >
                      <div className="flex items-center gap-1">
                        Risico
                        <SortIndicator column="riskScore" />
                      </div>
                    </th>
                    <th
                      className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort('ltv')}
                    >
                      <div className="flex items-center gap-1">
                        LTV
                        <SortIndicator column="ltv" />
                      </div>
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-40" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-12" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                      </tr>
                    ))
                  ) : paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        {activeFilters > 0
                          ? 'Geen leden gevonden met huidige filters'
                          : 'Geen leden gevonden'}
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
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
                            <div>
                              <div className="text-sm font-medium text-slate-900">{member.name}</div>
                              <div className="text-xs text-slate-500">Lid sinds {member.actiefSinds}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-600">{member.email || '-'}</div>
                          <div className="text-xs text-slate-400">{member.phone || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-600 max-w-[200px] truncate" title={member.producten.join(', ')}>
                            {member.producten.length > 0 ? member.producten.join(', ') : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-600">
                            {formatDaysSince(member.daysSinceLastVisit)}
                          </div>
                          {member.daysSinceLastVisit < 900 && (
                            <div className="text-xs text-slate-400">{member.lastCheckIn}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{member.checkIns30Dagen}</div>
                          <div className="text-xs text-slate-400">{member.checkIns90Dagen} (90d)</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 group relative">
                            <Badge
                              variant={member.riskLevel}
                              size="sm"
                              pulse={member.riskLevel === 'critical'}
                            >
                              {getRiskLabel(member.riskLevel)}
                            </Badge>
                            <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                              {member.riskScore}
                              {member.riskFactors.length > 0 && (
                                <Info className="h-3 w-3" />
                              )}
                            </button>
                            {member.riskFactors.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block">
                                <div className="bg-slate-800 text-white text-xs rounded-lg shadow-lg p-3 min-w-[220px]">
                                  <div className="font-medium mb-2">Risicofactoren:</div>
                                  <ul className="space-y-1.5">
                                    {member.riskFactors.map((factor, i) => (
                                      <li key={i} className="flex justify-between gap-3">
                                        <span className="text-slate-300">{factor.label}</span>
                                        <span className="text-orange-400 font-medium">+{factor.points}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="border-t border-slate-600 mt-2 pt-2 flex justify-between">
                                    <span className="font-medium">Totaal</span>
                                    <span className="font-bold text-orange-400">{member.riskScore}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {member.ltv > 0 ? `€${Math.round(member.ltv)}` : '-'}
                          </div>
                          {member.aantalBetalingen > 0 && (
                            <div className="text-xs text-slate-400">
                              {member.aantalBetalingen} betaling{member.aantalBetalingen !== 1 ? 'en' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {member.phone && (
                              <a
                                href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                            {member.phone && (
                              <a
                                href={`tel:${member.phone}`}
                                className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                title="Bellen"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                            {member.email && (
                              <a
                                href={`mailto:${member.email}`}
                                className="p-1.5 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                title="Email"
                              >
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <div className="text-sm text-slate-500">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} van {filteredMembers.length} leden
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      currentPage === 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                            currentPage === pageNum
                              ? 'bg-[var(--primary)] text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      currentPage === totalPages
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
