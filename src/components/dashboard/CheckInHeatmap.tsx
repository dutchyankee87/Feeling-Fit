'use client'

import { cn } from '@/lib/utils'

interface CheckInHourData {
  hour: number
  avg: number
}

interface CheckInDayData {
  day: string
  avg: number
}

interface CheckInHeatmapProps {
  byHour: CheckInHourData[]
  byDay: CheckInDayData[]
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return 'bg-slate-100'
  const intensity = value / max

  if (intensity === 0) return 'bg-slate-100'
  if (intensity < 0.2) return 'bg-emerald-100'
  if (intensity < 0.4) return 'bg-emerald-200'
  if (intensity < 0.6) return 'bg-emerald-300'
  if (intensity < 0.8) return 'bg-emerald-400'
  return 'bg-emerald-500'
}

export function CheckInHeatmap({ byHour, byDay }: CheckInHeatmapProps) {
  const maxHour = Math.max(...byHour.map(h => h.avg))
  const maxDay = Math.max(...byDay.map(d => d.avg))

  return (
    <div className="space-y-6">
      {/* By Hour */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Per Uur (gem. check-ins)</h4>
        <div className="flex gap-1">
          {byHour.map(({ hour, avg }) => (
            <div key={hour} className="flex-1 text-center">
              <div
                className={cn(
                  'h-10 rounded transition-colors',
                  getHeatColor(avg, maxHour)
                )}
                title={`${hour}:00 - ${avg.toFixed(1)} gem.`}
              />
              <span className="text-xs text-slate-500 mt-1 block">
                {hour}
              </span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-xs text-slate-500 mr-1">Min</span>
          <div className="w-4 h-3 rounded bg-slate-100" />
          <div className="w-4 h-3 rounded bg-emerald-200" />
          <div className="w-4 h-3 rounded bg-emerald-300" />
          <div className="w-4 h-3 rounded bg-emerald-400" />
          <div className="w-4 h-3 rounded bg-emerald-500" />
          <span className="text-xs text-slate-500 ml-1">Max</span>
        </div>
      </div>

      {/* By Day */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Per Dag (gem. check-ins)</h4>
        <div className="flex gap-2">
          {byDay.map(({ day, avg }) => (
            <div key={day} className="flex-1 text-center">
              <div
                className={cn(
                  'h-12 rounded-lg flex items-center justify-center transition-colors',
                  getHeatColor(avg, maxDay)
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  avg > maxDay * 0.5 ? 'text-white' : 'text-slate-700'
                )}>
                  {avg.toFixed(1)}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-600 mt-1 block">
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
