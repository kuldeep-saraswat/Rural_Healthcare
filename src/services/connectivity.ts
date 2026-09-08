import { useEffect } from 'react'
import { runPrototypeSync, useAppStore } from '@/store/useAppStore'
import { cacheEssential, readQueuedActions } from '@/services/offline/db'

/**
 * Connection state + prototype sync.
 *
 * - Tracks the real browser online/offline events.
 * - Adds a "simulate offline" switch so the offline workflow can be demoed on
 *   a machine that never actually loses its connection.
 * - Auto-detects a slow link (Network Information API) and offers low
 *   connectivity mode.
 * - On reconnect, drains the offline queue through a clearly-labelled demo sync.
 */

interface NetworkInformationLike {
  effectiveType?: string
  saveData?: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

export function readConnectionQuality(): { slow: boolean; effectiveType?: string } {
  if (typeof navigator === 'undefined') return { slow: false }
  const connection = (navigator as unknown as { connection?: NetworkInformationLike }).connection
  if (!connection) return { slow: false }
  const effectiveType = connection.effectiveType
  const slow =
    Boolean(connection.saveData) || effectiveType === '2g' || effectiveType === 'slow-2g'
  return { slow, effectiveType }
}

/** Mount once, near the app root. */
export function useConnectivityWatcher(): void {
  const setBrowserOnline = useAppStore((s) => s.setBrowserOnline)
  const hydrateOfflineQueue = useAppStore((s) => s.hydrateOfflineQueue)
  const setLowConnectivity = useAppStore((s) => s.setLowConnectivity)

  useEffect(() => {
    // Re-attach any queue rows that survived a page reload in IndexedDB.
    void readQueuedActions().then((items) => {
      if (items.length) hydrateOfflineQueue(items)
    })

    const goOnline = () => {
      setBrowserOnline(true)
      const state = useAppStore.getState()
      if (!state.simulatedOffline && state.offlineQueue.some((i) => i.status !== 'synced')) {
        void runPrototypeSync()
      }
    }
    const goOffline = () => {
      setBrowserOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    setBrowserOnline(navigator.onLine)

    const { slow } = readConnectionQuality()
    if (slow) setLowConnectivity(true)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [setBrowserOnline, hydrateOfflineQueue, setLowConnectivity])
}

/** Caches the records an ASHA must be able to read with no network. */
export function useOfflineCache(): void {
  const patients = useAppStore((s) => s.patients)
  const facilities = useAppStore((s) => s.facilities)
  const ashas = useAppStore((s) => s.ashas)
  const ambulances = useAppStore((s) => s.ambulances)

  useEffect(() => {
    void cacheEssential('patients', patients)
    void cacheEssential('facilities', facilities)
    void cacheEssential(
      'emergencyContacts',
      [
        ...ashas.map((a) => ({ label: `${a.name} (ASHA, ${a.village})`, phone: a.phone })),
        ...ambulances.map((a) => ({ label: a.code, phone: a.phone })),
        ...facilities
          .filter((f) => f.emergency)
          .map((f) => ({ label: f.name, phone: f.phone })),
      ].slice(0, 40),
    )
  }, [patients, facilities, ashas, ambulances])
}

/**
 * Single entry point for the "simulate offline" switch, so every surface that
 * offers it also drains the queue on reconnect.
 */
export function setOfflineSimulation(simulated: boolean): void {
  const store = useAppStore.getState()
  store.setSimulatedOffline(simulated)
  if (simulated) return
  const state = useAppStore.getState()
  if (state.browserOnline && state.offlineQueue.some((item) => item.status !== 'synced')) {
    void runPrototypeSync()
  }
}

export type ConnectionLabel = 'online' | 'offline' | 'syncing' | 'synced'

export function connectionLabel(state: {
  browserOnline: boolean
  simulatedOffline: boolean
  syncState: 'idle' | 'syncing' | 'synced'
}): ConnectionLabel {
  if (state.syncState === 'syncing') return 'syncing'
  if (!state.browserOnline || state.simulatedOffline) return 'offline'
  if (state.syncState === 'synced') return 'synced'
  return 'online'
}
