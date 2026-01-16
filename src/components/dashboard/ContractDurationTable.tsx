'use client'

interface ProductDuration {
  product: string
  avgDays: number
  avgMonths: number
  count: number
}

interface ContractDurationTableProps {
  data: ProductDuration[]
}

export function ContractDurationTable({ data }: ContractDurationTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Geen contractduur data beschikbaar
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Product</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Gem. Duur</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Aantal</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((item, index) => (
            <tr
              key={item.product}
              className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}
            >
              <td className="py-2.5 px-2 text-sm text-slate-900">
                {item.product.length > 30
                  ? item.product.substring(0, 27) + '...'
                  : item.product}
              </td>
              <td className="py-2.5 px-2 text-sm text-right font-medium text-slate-700">
                {item.avgMonths.toFixed(1)} mnd
              </td>
              <td className="py-2.5 px-2 text-sm text-right text-slate-500">
                {item.count}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
