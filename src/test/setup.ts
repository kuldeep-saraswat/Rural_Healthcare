import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { useAppStore } from '@/store/useAppStore'

// jsdom does not implement scrolling; the app calls it on every navigation.
window.scrollTo = () => undefined

// jsdom has no SpeechRecognition, which is exactly the graceful-fallback case
// the voice UI must handle.

beforeEach(() => {
  window.localStorage.clear()
  useAppStore.getState().resetDemoData()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
