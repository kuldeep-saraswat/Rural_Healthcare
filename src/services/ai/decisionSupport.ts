import type { Facility, FollowUp, Patient, RiskLevel, Village } from '@/types'
import type { AppStore } from '@/store/useAppStore'
import { bucketFollowUp } from '@/store/selectors'
import { daysBetween, formatDate, pct, todayKey } from '@/lib/utils'

/**
 * AI decision *support*.
 *
 * Everything here summarises or ranks data that a human then acts on. Nothing
 * in this file changes clinical state, prescribes, or decides on its own -
 * every screen that renders it carries a "decision support only" label.
 */

export interface RecordSummary {
  headline: string
  lines: string[]
  openIssues: string[]
  generatedFrom: string
}

/** Long history -> short doctor-readable summary. */
export function summariseRecord(state: AppStore, patientId: string): RecordSummary {
  const patient = state.patients.find((p) => p.id === patientId)
  if (!patient) {
    return {
      headline: 'No record found',
      lines: [],
      openIssues: [],
      generatedFrom: 'no data',
    }
  }
  const consultations = state.consultations
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const prescriptions = state.prescriptions.filter((p) => p.patientId === patientId)
  const reports = state.labReports
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const referrals = state.referrals.filter((r) => r.patientId === patientId)
  const followUps = state.followUps.filter((f) => f.patientId === patientId)
  const screenings = state.screenings
    .filter((s) => s.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const lines: string[] = []
  lines.push(
    `${patient.age}y ${patient.gender}, ${patient.village}. Blood group ${patient.bloodGroup}.`,
  )
  lines.push(
    patient.conditions.length
      ? `Known conditions: ${patient.conditions.join('; ')}.`
      : 'No long-term condition recorded.',
  )
  lines.push(
    patient.allergies.length
      ? `Allergies: ${patient.allergies.join(', ')}.`
      : 'No known drug allergy recorded.',
  )
  if (patient.currentMedicines.length) {
    lines.push(`On: ${patient.currentMedicines.join(', ')}.`)
  }
  if (consultations[0]) {
    lines.push(
      `Last seen ${formatDate(consultations[0].date)} by ${consultations[0].doctorName} at ${
        consultations[0].facilityName
      } - ${consultations[0].assessment}`,
    )
  }
  const abnormal = reports.flatMap((r) => r.lines.filter((l) => l.flag)).slice(0, 4)
  if (abnormal.length) {
    lines.push(
      `Abnormal results: ${abnormal.map((l) => `${l.label} ${l.value}`).join(', ')}.`,
    )
  }
  if (screenings[0]) {
    const s = screenings[0]
    const parts = [
      s.bpSystolic && s.bpDiastolic ? `BP ${s.bpSystolic}/${s.bpDiastolic}` : null,
      s.bloodSugar ? `sugar ${s.bloodSugar}` : null,
      s.spo2 ? `SpO2 ${s.spo2}%` : null,
    ].filter(Boolean)
    if (parts.length) lines.push(`Last ASHA screening (${formatDate(s.date)}): ${parts.join(', ')}.`)
  }

  const openIssues: string[] = []
  for (const referral of referrals) {
    if (referral.status !== 'completed' && referral.status !== 'cancelled') {
      openIssues.push(
        `Open referral to ${
          state.facilities.find((f) => f.id === referral.toFacilityId)?.name ?? 'facility'
        } - status: ${referral.status.replace('_', ' ')}${
          referral.dropOffFlagged ? ' (patient has not reached)' : ''
        }`,
      )
    }
  }
  for (const followUp of followUps) {
    const bucket = bucketFollowUp(followUp)
    if (bucket === 'overdue') openIssues.push(`Overdue follow-up: ${followUp.reason}`)
    if (bucket === 'today') openIssues.push(`Follow-up due today: ${followUp.reason}`)
  }
  const dueVaccines = state.vaccinations.filter(
    (v) => v.patientId === patientId && v.status !== 'given',
  )
  for (const vaccine of dueVaccines) {
    openIssues.push(
      `${vaccine.vaccineName} dose ${vaccine.doseNumber} ${vaccine.status}${
        vaccine.dueDate ? ` (due ${formatDate(vaccine.dueDate)})` : ''
      }`,
    )
  }

  return {
    headline: `${patient.name} - ${patient.mainIssue}`,
    lines,
    openIssues,
    generatedFrom: `${consultations.length} consultation(s), ${prescriptions.length} prescription(s), ${reports.length} report(s), ${screenings.length} screening(s)`,
  }
}

// ---------------------------------------------------------------------------
// Referral support: suggested care level
// ---------------------------------------------------------------------------

export interface CareLevelSuggestion {
  level: Facility['type']
  label: string
  rationale: string[]
  urgency: 'routine' | 'urgent' | 'emergency'
}

export function suggestCareLevel(input: {
  riskLevel: RiskLevel
  needsImaging?: boolean
  needsSpecialist?: boolean
  needsSurgery?: boolean
  isMaternal?: boolean
  age?: number
}): CareLevelSuggestion {
  const rationale: string[] = []
  let level: Facility['type'] = 'phc'
  let urgency: CareLevelSuggestion['urgency'] = 'routine'

  if (input.riskLevel === 'high') {
    level = 'district_hospital'
    urgency = 'emergency'
    rationale.push('High risk level reported')
  } else if (input.riskLevel === 'medium') {
    level = 'chc'
    urgency = 'urgent'
    rationale.push('Medium risk level reported')
  } else {
    rationale.push('Low risk level - primary care is usually enough')
  }
  if (input.needsSpecialist) {
    level = 'medical_college'
    rationale.push('Specialist opinion required')
  }
  if (input.needsImaging && level === 'phc') {
    level = 'district_hospital'
    rationale.push('Advanced imaging is not available at a PHC')
  }
  if (input.needsSurgery && level !== 'medical_college') {
    level = 'district_hospital'
    rationale.push('Surgical facility required')
  }
  if (input.isMaternal && level !== 'district_hospital' && level !== 'medical_college') {
    level = 'chc'
    rationale.push('Institutional delivery needs 24x7 obstetric cover')
  }
  if ((input.age ?? 0) >= 65 && urgency === 'routine') {
    urgency = 'urgent'
    rationale.push('Age above 65 - earlier review advised')
  }

  const labels: Record<Facility['type'], string> = {
    phc: 'Primary Health Centre',
    chc: 'Community Health Centre',
    district_hospital: 'District Hospital',
    medical_college: 'Government Medical College',
    diagnostic_centre: 'Diagnostic Centre',
    pharmacy: 'Pharmacy',
    kiosk: 'Health Kiosk',
  }

  return { level, label: labels[level], rationale, urgency }
}

// ---------------------------------------------------------------------------
// Follow-up risk (drives ASHA alerts)
// ---------------------------------------------------------------------------

export interface FollowUpRisk {
  followUp: FollowUp
  patient?: Patient
  daysOverdue: number
  severity: 'watch' | 'act_now'
  reason: string
}

export function followUpRisks(state: AppStore, ashaId?: string): FollowUpRisk[] {
  const today = todayKey()
  return state.followUps
    .filter((f) => f.status === 'scheduled')
    .filter((f) => (ashaId ? f.ashaId === ashaId : true))
    .map((followUp) => {
      const daysOverdue = -daysBetween(followUp.dueDate, today)
      const patient = state.patients.find((p) => p.id === followUp.patientId)
      const highRiskProgram = ['tb', 'maternal', 'child'].includes(followUp.program)
      const severity: FollowUpRisk['severity'] =
        daysOverdue >= 3 || (daysOverdue >= 1 && highRiskProgram) ? 'act_now' : 'watch'
      return {
        followUp,
        patient,
        daysOverdue,
        severity,
        reason:
          daysOverdue > 0
            ? `${daysOverdue} day(s) overdue${highRiskProgram ? ' on a high-priority programme' : ''}`
            : 'Due soon',
      }
    })
    .filter((risk) => risk.daysOverdue >= 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}

// ---------------------------------------------------------------------------
// Resource demand prediction (from mock historical counts)
// ---------------------------------------------------------------------------

export interface DemandPrediction {
  village: Village
  currentDemand: number
  predictedNextWeek: number
  trend: 'rising' | 'steady' | 'falling'
  shortages: string[]
}

export function predictDemand(state: AppStore): DemandPrediction[] {
  return state.villages
    .map((village) => {
      const patients = state.patients.filter((p) => p.village === village.name)
      const openFollowUps = state.followUps.filter(
        (f) =>
          f.status === 'scheduled' &&
          patients.some((p) => p.id === f.patientId),
      ).length
      const openReferrals = state.referrals.filter(
        (r) => r.status !== 'completed' && patients.some((p) => p.id === r.patientId),
      ).length
      const currentDemand = village.demandIndex
      // Deliberately simple and explainable: open work items nudge the index.
      const delta = openFollowUps * 2 + openReferrals * 3 - 4
      const predictedNextWeek = Math.max(0, Math.min(100, currentDemand + delta))
      const trend: DemandPrediction['trend'] =
        predictedNextWeek > currentDemand + 2
          ? 'rising'
          : predictedNextWeek < currentDemand - 2
            ? 'falling'
            : 'steady'

      const shortages: string[] = []
      const phc = state.facilities.find((f) => f.id === village.nearestPhcId)
      if (phc) {
        const doctorsAvailable = state.doctors.filter(
          (d) => d.facilityId === phc.id && d.status === 'available',
        ).length
        if (doctorsAvailable === 0) shortages.push('No doctor available at the nearest PHC')
        const lowMeds = phc.medicines.filter((m) => m.status !== 'available')
        if (lowMeds.length) shortages.push(`${lowMeds.length} medicine(s) low or out of stock`)
        const lowVaccines = phc.vaccines.filter((v) => v.status !== 'available')
        if (lowVaccines.length) shortages.push(`${lowVaccines.length} vaccine(s) low or out of stock`)
        const unavailableTests = phc.tests.filter((t) => t.status !== 'available')
        if (unavailableTests.length) {
          shortages.push(`${unavailableTests.length} test(s) not available locally`)
        }
      }
      return { village, currentDemand, predictedNextWeek, trend, shortages }
    })
    .sort((a, b) => b.predictedNextWeek - a.predictedNextWeek)
}

// ---------------------------------------------------------------------------
// Facility pressure
// ---------------------------------------------------------------------------

export interface FacilityPressure {
  facility: Facility
  bedOccupancyPct: number
  icuOccupancyPct: number
  activeReferrals: number
  incomingEmergencies: number
  level: 'normal' | 'watch' | 'high'
  notes: string[]
}

export function facilityPressure(state: AppStore): FacilityPressure[] {
  return state.facilities
    .filter((f) => f.beds.total > 0)
    .map((facility) => {
      const bedOccupancyPct = pct(facility.beds.occupied, facility.beds.total)
      const icuOccupancyPct = pct(facility.icu.occupied, facility.icu.total)
      const activeReferrals = state.referrals.filter(
        (r) =>
          r.toFacilityId === facility.id && r.status !== 'completed' && r.status !== 'cancelled',
      ).length
      const incomingEmergencies = state.emergencyRequests.filter(
        (e) =>
          e.destinationFacilityId === facility.id &&
          !['completed', 'no_ambulance'].includes(e.status),
      ).length

      const notes: string[] = []
      if (bedOccupancyPct >= 85) notes.push('Bed occupancy above 85%')
      if (facility.icu.total > 0 && icuOccupancyPct >= 80) notes.push('ICU occupancy above 80%')
      if (activeReferrals >= 2) notes.push(`${activeReferrals} referrals in progress`)
      if (incomingEmergencies > 0) notes.push(`${incomingEmergencies} incoming emergency case(s)`)
      const availableDoctorCount = state.doctors.filter(
        (d) => d.facilityId === facility.id && d.status === 'available',
      ).length
      if (facility.doctorIds.length && availableDoctorCount === 0) {
        notes.push('No doctor currently marked available')
      }

      const level: FacilityPressure['level'] =
        bedOccupancyPct >= 90 || (facility.icu.total > 0 && icuOccupancyPct >= 90)
          ? 'high'
          : notes.length
            ? 'watch'
            : 'normal'

      return {
        facility,
        bedOccupancyPct,
        icuOccupancyPct,
        activeReferrals,
        incomingEmergencies,
        level,
        notes,
      }
    })
    .sort((a, b) => b.bedOccupancyPct - a.bedOccupancyPct)
}

export const DECISION_SUPPORT_DISCLAIMER =
  'AI decision support only. These are summaries and rankings of demo data for a human to act on - RuralCare AI never makes clinical decisions on its own.'
