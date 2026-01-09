'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Users, UserX, Activity, Clock, MessageCircle, RefreshCw } from 'lucide-react'

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

export default function Dashboard() {
  const [riskMembers, setRiskMembers] = useState<RiskMember[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    totalMembers: 0,
    atRisk: 0,
    criticalRisk: 0,
    avgCheckIns: 0
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/members?filter=at-risk&limit=20')
      const data = await response.json()

      if (data.success) {
        const members: Member[] = data.data.members

        // Transform to RiskMember format
        const transformedMembers: RiskMember[] = members.map(m => {
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
            checkIns30Dagen: m.checkIns30Dagen
          }
        })

        setRiskMembers(transformedMembers)
        setStats(data.data.stats)

        // Generate actions based on risk members
        const generatedActions: Action[] = transformedMembers
          .filter(m => m.riskLevel === 'critical' || m.riskLevel === 'high')
          .slice(0, 5)
          .map((m, i) => ({
            id: `action-${i}`,
            type: 'whatsapp' as const,
            priority: m.riskLevel === 'critical' ? 1 : 2,
            title: m.riskLevel === 'critical'
              ? `Urgente check-in met ${m.name.split(' ')[0]}`
              : `Follow-up ${m.name.split(' ')[0]}`,
            description: m.daysSinceLastVisit > 90
              ? `Al ${m.daysSinceLastVisit} dagen niet gezien - persoonlijk bericht sturen`
              : m.checkIns30Dagen === 0
              ? 'Geen check-ins deze maand - motivatie check'
              : `Frequentie gedaald - ${m.checkIns30Dagen} check-ins in 30 dagen`,
            targetName: m.name,
            targetPhone: m.phone,
            dueTime: 'Vandaag'
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
    // Auto-refresh elke 5 minuten
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getActionIcon = (type: string) => {
    switch(type) {
      case 'call': return <PhoneCall className="h-4 w-4" />
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />
      default: return <MessageCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Feeling Fit Utrecht</h1>
                <p className="text-sm text-gray-500">Gym Operating System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {lastSync ? `Laatste sync: ${lastSync.toLocaleTimeString('nl-NL')}` : 'Nog niet gesynchroniseerd'}
              </span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Laden...' : 'Sync Nu'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actieve Leden</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk (Hoog+Kritiek)</p>
                <p className="text-2xl font-bold text-red-600">{loading ? '...' : stats.atRisk}</p>
              </div>
              <UserX className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kritiek Risico</p>
                <p className="text-2xl font-bold text-red-800">{loading ? '...' : stats.criticalRisk}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gem. Check-ins/Week</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.avgCheckIns}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Acties Vandaag</h2>
                <p className="text-sm text-gray-500">{actions.length} taken te doen</p>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Laden...</div>
                ) : actions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Geen acties vandaag</div>
                ) : (
                  actions.map(action => (
                    <div key={action.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`mt-1 p-2 rounded-full ${
                          action.priority === 1 ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          {getActionIcon(action.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-xs text-gray-400">{action.targetName}</span>
                            <span className="text-xs text-blue-600 font-medium">{action.dueTime}</span>
                          </div>
                        </div>
                        {action.targetPhone && (
                          <a
                            href={`https://wa.me/${action.targetPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Churn Risk - Top 4 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Hoogste Churn Risico</h2>
                <p className="text-sm text-gray-500">Leden die direct aandacht nodig hebben</p>
              </div>
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Laden...</div>
                ) : riskMembers.slice(0, 4).map(member => (
                  <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {member.phone || member.email || 'Geen contact'}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getRiskColor(member.riskLevel)}`}>
                            {member.riskLevel === 'critical' ? 'Kritiek' :
                             member.riskLevel === 'high' ? 'Hoog' :
                             member.riskLevel === 'medium' ? 'Medium' : 'Laag'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {member.daysSinceLastVisit < 999 ? `${member.daysSinceLastVisit} dagen` : 'Nooit bezocht'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{member.riskScore}</div>
                        <div className="text-xs text-gray-500">score</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alle Risico Leden */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Alle Risico Leden</h2>
                <p className="text-sm text-gray-500">{riskMembers.length} leden met verhoogd risico</p>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Laden...</div>
                ) : riskMembers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Geen risico leden gevonden</div>
                ) : (
                  riskMembers.slice(4).map(member => (
                    <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{member.producten.join(', ')}</p>
                          <div className="flex items-center mt-2 space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getRiskColor(member.riskLevel)}`}>
                              {member.riskLevel === 'critical' ? 'Kritiek' :
                               member.riskLevel === 'high' ? 'Hoog' :
                               member.riskLevel === 'medium' ? 'Medium' : 'Laag'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {member.daysSinceLastVisit < 999 ? `${member.daysSinceLastVisit}d` : 'Nooit'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{member.riskScore}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}