import { create } from 'zustand'

export interface CompareShellMetrics {
  totalDiffs: number
  selectedCount: number
  adds: number
  removes: number
  replaces: number
  mergeReady: boolean
  applyToLeft: () => void
  applyToRight: () => void
}

interface CompareShellStore {
  metrics: CompareShellMetrics | null
  setMetrics: (metrics: CompareShellMetrics | null) => void
}

export const useCompareShellStore = create<CompareShellStore>((set) => ({
  metrics: null,
  setMetrics: (metrics) => set({ metrics })
}))
