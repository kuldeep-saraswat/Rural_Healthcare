import type {
  AppNotification,
  AshaWorker,
  DemoUser,
  Doctor,
  Facility,
  FollowUp,
  MedicalCamp,
  Patient,
  Referral,
} from '@/types'
import type { AppStore } from '@/store/useAppStore'
import { MEDICINE_CATALOG, TEST_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import { daysBetween, todayKey } from '@/lib/utils'

/**
 * Pure derivations over store slices. Components select raw arrays (stable
 * references) and call these in render, which keeps zustand selectors cheap.
 */

export function currentUser(state: AppStore): DemoUser {
  return state.users.find((u) => u.id === state.currentUserId) ?? state.users[0]
}

export function currentPatient(state: AppStore): Patient | undefined {
  const user = currentUser(state)
  if (user.patientId) return state.patients.find((p) => p.id === user.patientId)
  return undefined
}

// ---------------------------------------------------------------------------
// Availability - shared by the AI router, the finder pages and the dashboards
// ---------------------------------------------------------------------------

export interface DoctorWithFacility {
  doctor: Doctor
  facility?: Facility
}

export function availableDoctors(
  doctors: Doctor[],
  facilities: Facility[],
  options: { emergencyOnly?: boolean; telemedicineOnly?: boolean; specialty?: string } = {},
): DoctorWithFacility[] {
  return doctors
    .filter((d) => d.status === 'available')
    .filter((d) => (options.emergencyOnly ? d.emergencyAvailable : true))
    .filter((d) => (options.telemedicineOnly ? d.telemedicine : true))
    .filter((d) =>
      options.specialty
        ? d.specialty.toLowerCase().includes(options.specialty.toLowerCase())
        : true,
    )
    .map((doctor) => ({ doctor, facility: facilities.find((f) => f.id === doctor.facilityId) }))
    .sort((a, b) => (a.facility?.distanceKm ?? 99) - (b.facility?.distanceKm ?? 99))
}

export interface TestAvailability {
  facility: Facility
  reportInHours: number
  test: (typeof TEST_CATALOG)[number]
}

export function findTestAvailability(facilities: Facility[], query: string): TestAvailability[] {
  const q = query.trim().toLowerCase()
  const matches = TEST_CATALOG.filter(
    (t) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.aliases.some((a) => a.includes(q)),
  )
  const out: TestAvailability[] = []
  for (const test of matches) {
    for (const facility of facilities) {
      const entry = facility.tests.find((t) => t.itemId === test.id)
      if (entry && entry.status === 'available') {
        out.push({ facility, reportInHours: entry.reportInHours, test })
      }
    }
  }
  return out.sort((a, b) => a.facility.distanceKm - b.facility.distanceKm)
}

export interface MedicineAvailability {
  facility: Facility
  status: 'available' | 'low' | 'out'
  updatedAt: string
  medicine: (typeof MEDICINE_CATALOG)[number]
}

export function findMedicineAvailability(
  facilities: Facility[],
  query: string,
): MedicineAvailability[] {
  const q = query.trim().toLowerCase()
  const matches = MEDICINE_CATALOG.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.generic.toLowerCase().includes(q) ||
      m.aliases.some((a) => a.includes(q)),
  )
  const out: MedicineAvailability[] = []
  for (const medicine of matches) {
    for (const facility of facilities) {
      const entry = facility.medicines.find((m) => m.itemId === medicine.id)
      if (entry) {
        out.push({ facility, status: entry.status, updatedAt: entry.updatedAt, medicine })
      }
    }
  }
  const rank = { available: 0, low: 1, out: 2 }
  return out.sort(
    (a, b) => rank[a.status] - rank[b.status] || a.facility.distanceKm - b.facility.distanceKm,
  )
}

export interface VaccineAvailability {
  facility: Facility
  status: 'available' | 'low' | 'out'
  nextSlot?: string
  vaccine: (typeof VACCINE_CATALOG)[number]
}

export function findVaccineAvailability(
  facilities: Facility[],
  query: string,
): VaccineAvailability[] {
  const q = query.trim().toLowerCase()
  const matches = VACCINE_CATALOG.filter(
    (v) => !q || v.name.toLowerCase().includes(q) || v.aliases.some((a) => a.includes(q)),
  )
  const out: VaccineAvailability[] = []
  for (const vaccine of matches) {
    for (const facility of facilities) {
      const entry = facility.vaccines.find((v) => v.itemId === vaccine.id)
      if (entry) {
        out.push({ facility, status: entry.status, nextSlot: entry.nextSlot, vaccine })
      }
    }
  }
  const rank = { available: 0, low: 1, out: 2 }
  return out.sort(
    (a, b) => rank[a.status] - rank[b.status] || a.facility.distanceKm - b.facility.distanceKm,
  )
}

export function availableAmbulances(state: Pick<AppStore, 'ambulances'>) {
  return state.ambulances
    .filter((a) => a.status === 'available')
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export function nearestEmergencyFacility(facilities: Facility[]): Facility | undefined {
  return facilities
    .filter((f) => f.emergency)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .find(Boolean)
}

export function ashaForPatient(ashas: AshaWorker[], patient?: Patient): AshaWorker | undefined {
  if (!patient) return ashas[0]
  return ashas.find((a) => a.id === patient.ashaId) ?? ashas.find((a) => a.village === patient.village)
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export type FollowUpBucket = 'overdue' | 'today' | 'upcoming' | 'completed' | 'missed'

export function bucketFollowUp(followUp: FollowUp): FollowUpBucket {
  if (followUp.status === 'completed') return 'completed'
  if (followUp.status === 'missed') return 'missed'
  const diff = daysBetween(followUp.dueDate, todayKey())
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return 'upcoming'
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export function referralsForPatient(referrals: Referral[], patientId?: string): Referral[] {
  if (!patientId) return []
  return referrals
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function droppedOffReferrals(referrals: Referral[]): Referral[] {
  return referrals.filter((r) => r.dropOffFlagged && r.status !== 'completed')
}

// ---------------------------------------------------------------------------
// Camps
// ---------------------------------------------------------------------------

export function campSlotsLeft(
  camp: MedicalCamp,
  registrations: { campId: string }[],
): number {
  return Math.max(0, camp.slotsTotal - registrations.filter((r) => r.campId === camp.id).length)
}

export function upcomingCamps(camps: MedicalCamp[]): MedicalCamp[] {
  return camps
    .filter((c) => c.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function notificationsFor(
  notifications: AppNotification[],
  userId: string,
): AppNotification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadCount(notifications: AppNotification[], userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export function alertsForVillage<T extends { areas: string[]; expiresAt: string }>(
  alerts: T[],
  village: string,
): T[] {
  const now = Date.now()
  return alerts.filter((a) => a.areas.includes(village) && new Date(a.expiresAt).getTime() > now)
}
