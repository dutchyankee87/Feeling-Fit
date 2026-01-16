'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

interface BezoekdichtheidChartProps {
  data: BezoekdichtheidBreakdown
}

const COLORS = {
  superActief: '#10b981', // emerald-500
  actief: '#34d399', // emerald-400
  risico: '#fbbf24', // amber-400
  slapend: '#f87171', // red-400
}

const LABELS = {
  superActief: 'Super Actief (3x+/week)',
  actief: 'Actief (1-2x/week)',
  risico: 'Risico (1x/2 weken)',
  slapend: 'Slapend (4+ weken)',
}

export function BezoekdichtheidChart({ data }: BezoekdichtheidChartProps) {
  const chartData = [
    { name: LABELS.superActief, value: data.superActief.count, color: COLORS.superActief },
    { name: LABELS.actief, value: data.actief.count, color: COLORS.actief },
    { name: LABELS.risico, value: data.risico.count, color: COLORS.risico },
    { name: LABELS.slapend, value: data.slapend.count, color: COLORS.slapend },
  ].filter(item => item.value > 0)

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value ?? 0} leden`, name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
