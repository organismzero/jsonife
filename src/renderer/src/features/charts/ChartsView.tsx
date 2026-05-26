import { BarChart2 } from 'lucide-react'
import type { JsonValue } from '../../lib/json/parse'

// Future hook: extract a numeric series from a JSON document for charting
export interface ChartSpec {
  type: 'bar' | 'line' | 'pie'
  labelPath: string
  valuePath: string
  title?: string
}

export function extractSeries(
  json: JsonValue,
  labelPath: string,
  valuePath: string
): Array<{ label: string; value: number }> {
  if (!Array.isArray(json)) return []
  return json.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
    const record = item as Record<string, JsonValue>
    const label = String(record[labelPath] ?? '')
    const value = Number(record[valuePath])
    if (isNaN(value)) return []
    return [{ label, value }]
  })
}

export function ChartsView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[hsl(var(--muted-foreground))]">
      <BarChart2 size={56} strokeWidth={1} />
      <p className="text-base font-medium">Charts — Coming soon</p>
      <p className="text-sm max-w-xs text-center">
        Future feature: create bar, line, and pie charts directly from your JSON data.
      </p>
    </div>
  )
}
