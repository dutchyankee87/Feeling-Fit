'use client'

import { Info } from 'lucide-react'

interface MetricDefinition {
  name: string
  description: string
}

const metrics: MetricDefinition[] = [
  {
    name: 'Show-up Rate',
    description: 'Percentage van geboekte kennismakingen waarbij de klant daadwerkelijk aanwezig was.',
  },
  {
    name: 'Conversie Rate',
    description: 'Percentage van kennismaking-klanten die daarna een ander product (abonnement) aanschaft.',
  },
  {
    name: 'Gem. LTV',
    description: 'Gemiddelde totale omzet per lid sinds 1 januari 2024.',
  },
  {
    name: 'Churn Rate',
    description: 'Percentage van producten dat beëindigd is (expired/cancelled) ten opzichte van het totaal.',
  },
  {
    name: 'Contractduur',
    description: 'Gemiddelde tijd (in maanden) dat een product actief is per type.',
  },
  {
    name: 'Slapende Leden',
    description: 'Percentage van actieve leden dat 4 of meer weken niet is geweest.',
  },
  {
    name: 'Super Actief',
    description: 'Leden die gemiddeld 3x of meer per week komen (over 12 weken).',
  },
  {
    name: 'Actief',
    description: 'Leden die gemiddeld 1-2x per week komen (over 12 weken).',
  },
  {
    name: 'Risico',
    description: 'Leden die gemiddeld 1x per 2 weken of minder komen (over 12 weken).',
  },
  {
    name: 'Slapend',
    description: 'Leden die 4 of meer weken niet zijn geweest.',
  },
]

export function MetricsLegend() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700 mb-4">
        <Info className="h-5 w-5" />
        <h4 className="font-semibold">Metric Definities</h4>
      </div>
      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="border-l-2 border-slate-200 pl-3">
            <dt className="text-sm font-medium text-slate-900">{metric.name}</dt>
            <dd className="text-sm text-slate-600 mt-0.5">{metric.description}</dd>
          </div>
        ))}
      </div>
    </div>
  )
}
