import type { DemoUser, Patient, Role } from '@/types'
import type { AppStore } from '@/store/useAppStore'

/**
 * Prototype role-based access + patient consent.
 *
 * Two gates must both pass before a record section is shown:
 *   1. the viewer's role is allowed to see that kind of information at all
 *   2. the patient's consent covers that viewer
 *
 * Admin/government users never see identifiable patient records here - they
 * only see aggregates.
 */

export type RecordSection =
  | 'identity'
  | 'contact'
  | 'conditions'
  | 'allergies'
  | 'medicines'
  | 'screenings'
  | 'consultations'
  | 'doctorNotes'
  | 'prescriptions'
  | 'labReports'
  | 'vaccinations'
  | 'referrals'
  | 'followUps'
  | 'household'
  | 'consent'

const ROLE_SECTIONS: Record<Role, RecordSection[]> = {
  patient: [
    'identity',
    'contact',
    'conditions',
    'allergies',
    'medicines',
    'screenings',
    'consultations',
    'doctorNotes',
    'prescriptions',
    'labReports',
    'vaccinations',
    'referrals',
    'followUps',
    'household',
    'consent',
  ],
  doctor: [
    'identity',
    'contact',
    'conditions',
    'allergies',
    'medicines',
    'screenings',
    'consultations',
    'doctorNotes',
    'prescriptions',
    'labReports',
    'vaccinations',
    'referrals',
    'followUps',
  ],
  asha: [
    'identity',
    'contact',
    'conditions',
    'allergies',
    'medicines',
    'screenings',
    'consultations',
    'vaccinations',
    'referrals',
    'followUps',
    'household',
  ],
  facility: [
    'identity',
    'contact',
    'conditions',
    'allergies',
    'medicines',
    'consultations',
    'doctorNotes',
    'prescriptions',
    'labReports',
    'referrals',
    'followUps',
  ],
  admin: [],
}

export interface AccessResult {
  allowed: boolean
  reason?: string
}

export interface Viewer {
  user: DemoUser
  role: Role
}

/** Does this viewer have any clinical relationship with the patient? */
export function hasCareRelationship(state: AppStore, user: DemoUser, patient: Patient): boolean {
  switch (user.role) {
    case 'patient':
      return user.patientId === patient.id
    case 'doctor': {
      const treated = state.consultations.some(
        (c) => c.patientId === patient.id && c.doctorId === user.doctorId,
      )
      const referredHere = state.referrals.some(
        (r) =>
          r.patientId === patient.id &&
          (r.toDoctorId === user.doctorId || r.toFacilityId === user.facilityId),
      )
      const emergencyHere = state.emergencyRequests.some(
        (e) =>
          e.patientId === patient.id &&
          (e.assignedDoctorId === user.doctorId || e.destinationFacilityId === user.facilityId),
      )
      const ownFacilityPatient = state.consultations.some(
        (c) => c.patientId === patient.id && c.facilityId === user.facilityId,
      )
      return treated || referredHere || emergencyHere || ownFacilityPatient
    }
    case 'asha':
      return patient.ashaId === user.ashaId
    case 'facility': {
      const referred = state.referrals.some(
        (r) => r.patientId === patient.id && r.toFacilityId === user.facilityId,
      )
      const seenHere = state.consultations.some(
        (c) => c.patientId === patient.id && c.facilityId === user.facilityId,
      )
      const emergency = state.emergencyRequests.some(
        (e) => e.patientId === patient.id && e.destinationFacilityId === user.facilityId,
      )
      return referred || seenHere || emergency
    }
    case 'admin':
      return false
    default:
      return false
  }
}

function consentCovers(user: DemoUser, patient: Patient): AccessResult {
  if (user.role === 'patient') {
    // A patient account may only ever open its own record.
    return user.patientId === patient.id
      ? { allowed: true }
      : { allowed: false, reason: 'A patient account can only open its own record.' }
  }
  if (user.role === 'doctor') {
    return patient.consent.shareWithTreatingDoctors
      ? { allowed: true }
      : { allowed: false, reason: 'Patient has not consented to share the record with doctors.' }
  }
  if (user.role === 'asha') {
    return patient.consent.shareWithAsha
      ? { allowed: true }
      : { allowed: false, reason: 'Patient has not consented to share the record with ASHA workers.' }
  }
  if (user.role === 'facility') {
    return patient.consent.shareWithReferralFacility
      ? { allowed: true }
      : { allowed: false, reason: 'Patient has not consented to share the record with facilities.' }
  }
  return { allowed: false, reason: 'Admin users only see anonymised aggregates.' }
}

export function canViewSection(
  state: AppStore,
  user: DemoUser,
  patient: Patient,
  section: RecordSection,
): AccessResult {
  if (!ROLE_SECTIONS[user.role].includes(section)) {
    return { allowed: false, reason: `Not visible to a ${user.role} account.` }
  }
  const consent = consentCovers(user, patient)
  if (!consent.allowed) return consent
  if (!hasCareRelationship(state, user, patient)) {
    return { allowed: false, reason: 'No active care relationship with this patient.' }
  }
  return { allowed: true }
}

/** Patients a viewer is authorised to open at all. */
export function authorisedPatients(state: AppStore, user: DemoUser): Patient[] {
  if (user.role === 'admin') return []
  return state.patients.filter(
    (p) => hasCareRelationship(state, user, p) && consentCovers(user, p).allowed,
  )
}

export const ROLE_LABEL: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  asha: 'ASHA worker',
  facility: 'Hospital / PHC staff',
  admin: 'Admin / Government',
}

export const ROLE_HOME: Record<Role, string> = {
  patient: '/',
  doctor: '/doctor',
  asha: '/asha',
  facility: '/facility',
  admin: '/admin',
}
