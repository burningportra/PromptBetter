import { create } from 'zustand'
import type { FeedbackAggregate } from '../../shared/types'

interface FeedbackState {
  aggregates: FeedbackAggregate[]
  hydrated: boolean

  _hydrate: (aggregates: FeedbackAggregate[]) => void
  updateAggregate: (aggregate: FeedbackAggregate) => Promise<void>
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  aggregates: [],
  hydrated: false,

  _hydrate: (aggregates) => set({ aggregates, hydrated: true }),

  updateAggregate: async (aggregate) => {
    const previous = get().aggregates
    const idx = previous.findIndex((a) => a.id === aggregate.id)
    const updated =
      idx >= 0 ? previous.map((a) => (a.id === aggregate.id ? aggregate : a)) : [...previous, aggregate]
    set({ aggregates: updated })
    try {
      await window.electronAPI.setFeedbackAggregate(aggregate)
    } catch (err) {
      console.error('[feedbackStore] Failed to persist feedback aggregate:', err)
      set({ aggregates: previous })
    }
  },
}))
