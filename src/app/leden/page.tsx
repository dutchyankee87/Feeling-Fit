'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, MessageCircle, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react'

// Components
import { Header } from '@/components/dashboard/Header'
import { SearchFilter } from '@/components/dashboard/SearchFilter'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge, getRiskLabel } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

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

interface TableMember {
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
  checkIns90Dagen: number
  actiefSinds: string
  totaalTarief: number
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
  const [sortBy, setSortBy] = useState('name-asc')

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
            daysSinceLastVisit,
            producten: m.producten,
            checkIns30Dagen: m.checkIns30Dagen,
            checkIns90Dagen: m.checkIns90Dagen,
            actiefSinds: actiefSinds ? actiefSinds.toLocaleDateString('nl-NL') : 'Onbekend',
            totaalTarief: m.totaalTarief,
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
      } else if (field === 'checkIns') {
        comparison = a.checkIns30Dagen - b.checkIns30Dagen
      }
      return direction === 'desc' ? -comparison : comparison
    })

    return result
  }, [members, searchQuery, riskFilter, visitFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, riskFilter, visitFilter, sortBy])

  // Count active filters
  const activeFilters = [searchQuery, riskFilter, visitFilter].filter(Boolean).length

  const clearFilters = () => {
    setSearchQuery('')
    setRiskFilter('')
    setVisitFilter('')
    setSortBy('name-asc')
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
            sortBy={sortBy}
            onSortChange={setSortBy}
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
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Naam
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Contact
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Product(en)
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Laatste bezoek
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Check-ins (30d)
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      Risico
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
                        <td className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                      </tr>
                    ))
                  ) : paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={member.riskLevel}
                              size="sm"
                              pulse={member.riskLevel === 'critical'}
                            >
                              {getRiskLabel(member.riskLevel)}
                            </Badge>
                            <span className="text-xs text-slate-400">{member.riskScore}</span>
                          </div>
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
