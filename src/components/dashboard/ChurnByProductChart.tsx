'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

interface ProductChurnRate {
  product: string
  activeCount: number
  endedCount: number
  totalCount: number
  churnRate: number
}

interface ChurnByProductChartProps {
  data: ProductChurnRate[]
}

function getChurnColor(rate: number): string {
  if (rate >= 50) return '#ef4444' // red-500
  if (rate >= 30) return '#f97316' // orange-500
  if (rate >= 15) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export function ChurnByProductChart({ data }: ChurnByProductChartProps) {
  // Take top 8 products by total count
  const chartData = data.slice(0, 8).map(item => ({
    ...item,
    // Truncate long product names
    displayName: item.product.length > 25 ? item.product.substring(0, 22) + '...' : item.product,
  }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            width={150}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [`${value ?? 0}%`, 'Churn Rate']}
            labelFormatter={(label) => chartData.find(d => d.displayName === label)?.product || String(label)}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey="churnRate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getChurnColor(entry.churnRate)} />
            ))}
            <LabelList
              dataKey="churnRate"
              position="right"
              formatter={(value) => `${value ?? 0}%`}
              style={{ fontSize: 11, fill: '#475569' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
