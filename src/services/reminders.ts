import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient, currentUser } from '@/store/selectors'
import { buildDayDoses } from '@/services/medications'
import { formatClock, todayKey } from '@/lib/utils'

const TICK_MS = 60_000
/** A dose slot stays "just due" for this long before we stop nagging. */
const DUE_WINDOW_MIN = 30

/**
 * Medicine reminder ticker.
 *
 * When a dose from the patient's doctor-written schedule falls due while the
 * app is open, this raises an in-app notification once for that slot. The dose
 * text is copied from the prescription - nothing here decides a dose.
 *
 * In a real deployment the same trigger would also fire a push notification or
 * an SMS; in the prototype it stays inside the notification centre.
 */
export function useMedicationReminders(): void {
  const fired = useRef<Set<string>>(new Set())

  useEffect(() => {
    const tick = () => {
      const state = useAppStore.getState()
      const user = currentUser(state)
      const patient = currentPatient(state)
      if (!patient) return

      const doses = buildDayDoses(
        state.medicationSchedules.filter((s) => s.patientId === patient.id),
        state.medicationLogs.filter((l) => l.patientId === patient.id),
      )

      for (const dose of doses) {
        if (dose.state !== 'due') continue
        if (dose.minutesAway < -DUE_WINDOW_MIN) continue
        const key = `${todayKey()}|${dose.scheduleId}|${dose.time}`
        if (fired.current.has(key)) continue
        fired.current.add(key)
        useAppStore.getState().pushNotification({
          userId: user.id,
          title: 'Time to take your prescribed medicine',
          body: `${dose.medicineName} - ${dose.dose} at ${formatClock(dose.time)} (${
            dose.prescribedBy
          })`,
          kind: 'medication',
          actionPath: '/medications',
          actionLabel: 'Mark as taken',
        })
      }
    }

    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => {
      clearInterval(timer)
    }
  }, [])
}
