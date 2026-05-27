import type { JsonValue } from '../json/parse'

export function countNodes(value: JsonValue | null): number {
  if (value === null) return 1
  if (typeof value !== 'object') return 1
  if (Array.isArray(value)) {
    return 1 + value.reduce((n, item) => n + countNodes(item), 0)
  }
  return 1 + Object.values(value).reduce((n, item) => n + countNodes(item), 0)
}

export function formatContentSize(content: string): string {
  const bytes = new Blob([content]).size
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}
