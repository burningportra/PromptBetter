import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FeedbackAggregate } from '../../shared/types'

const mockElectronAPI = {
  ping: vi.fn(),
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getHistory: vi.fn(),
  addHistoryEntry: vi.fn(),
  clearHistory: vi.fn(),
  getPresets: vi.fn(),
  setPreset: vi.fn(),
  deletePreset: vi.fn(),
  getFeedbackAggregates: vi.fn(),
  setFeedbackAggregate: vi.fn(),
}

vi.stubGlobal('window', { electronAPI: mockElectronAPI })

const { useFeedbackStore } = await import('./feedbackStore')

const makeFeedback = (id = 'fb-1'): FeedbackAggregate => ({
  id,
  thumbsUp: 5,
  thumbsDown: 1,
  lastUpdated: Date.now(),
})

describe('feedbackStore', () => {
  beforeEach(() => {
    useFeedbackStore.setState({ aggregates: [], hydrated: false })
    vi.clearAllMocks()
  })

  it('hydrates aggregates', () => {
    const fb = makeFeedback()
    useFeedbackStore.getState()._hydrate([fb])
    expect(useFeedbackStore.getState().aggregates).toEqual([fb])
    expect(useFeedbackStore.getState().hydrated).toBe(true)
  })

  it('updates existing aggregate', async () => {
    mockElectronAPI.setFeedbackAggregate.mockResolvedValue(undefined)
    const original = makeFeedback('fb-1')
    useFeedbackStore.getState()._hydrate([original])
    await useFeedbackStore.getState().updateAggregate({ ...original, thumbsUp: 10 })
    expect(useFeedbackStore.getState().aggregates[0].thumbsUp).toBe(10)
  })

  it('adds new aggregate if not found', async () => {
    mockElectronAPI.setFeedbackAggregate.mockResolvedValue(undefined)
    await useFeedbackStore.getState().updateAggregate(makeFeedback('new'))
    expect(useFeedbackStore.getState().aggregates).toHaveLength(1)
  })

  it('reverts on IPC failure', async () => {
    mockElectronAPI.setFeedbackAggregate.mockRejectedValue(new Error('IPC failed'))
    const original = makeFeedback('fb-1')
    useFeedbackStore.getState()._hydrate([original])
    await useFeedbackStore.getState().updateAggregate({ ...original, thumbsUp: 99 })
    expect(useFeedbackStore.getState().aggregates[0].thumbsUp).toBe(5)
  })
})
