/**
 * RuralCare AI domain model.
 *
 * Everything in this prototype is fictional demo data. No real patients,
 * facilities, government datasets or outbreak reports are represented here.
 */

export type Role = 'patient' | 'doctor' | 'asha' | 'facility' | 'admin'

export type Language = 'en' | 'hi' | 'mr'

/** Stock-style availability, used for medicines, vaccines and tests. */
export type StockStatus = 'available' | 'low' | 'out'

/** Person/equipment style availability. */
export type ServiceStatus = 'available' | 'unavailable'

export type RiskLevel = 'low' | 'medium' | 'high'

export type Urgency = 'routine' | 'urgent' | 'emergency'

export type FacilityType =
  | 'phc'
  | 'chc'
  | 'district_hospital'
  | 'medical_college'
  | 'diagnostic_centre'
  | 'pharmacy'
  | 'kiosk'

export interface DemoUser {
  id: string
  name: string
  role: Role
  village: string
  /** Linked domain record for the role. */
  patientId?: string
  doctorId?: string
  ashaId?: string
  facilityId?: string
  subtitle: string
}

// ---------------------------------------------------------------------------
// Catalogues
// ---------------------------------------------------------------------------

export interface TestCatalogItem {
  id: string
  name: string
  shortName: string
  category: 'imaging' | 'pathology' | 'cardiology' | 'screening'
  aliases: string[]
  typicalPriceInr: number
}

export interface MedicineCatalogItem {
  id: string
  name: string
  generic: string
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'ointment'
  aliases: string[]
}

export interface VaccineCatalogItem {
  id: string
  name: string
  eligibility: string
  doses: number
  aliases: string[]
}

// ---------------------------------------------------------------------------
// Facilities & resources
// ---------------------------------------------------------------------------

export interface FacilityStockEntry {
  itemId: string
  status: StockStatus
  updatedAt: string
  /** Vaccines only. */
  nextSlot?: string
}

export interface FacilityTestEntry {
  itemId: string
  status: ServiceStatus
  updatedAt: string
  reportInHours: number
}

export interface BedCount {
  total: number
  occupied: number
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  village: string
  address: string
  phone: string
  distanceKm: number
  timings: string
  openNow: boolean
  emergency: boolean
  telemedicine: boolean
  services: string[]
  doctorIds: string[]
  ambulanceIds: string[]
  beds: BedCount
  icu: BedCount
  tests: FacilityTestEntry[]
  medicines: FacilityStockEntry[]
  vaccines: FacilityStockEntry[]
  /** Health-kiosk only: the assisted services offered at the kiosk. */
  kioskServices?: string[]
  notes?: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  facilityId: string
  phone: string
  status: ServiceStatus
  emergencyAvailable: boolean
  telemedicine: boolean
  languages: Language[]
  experienceYears: number
  nextSlot: string
  updatedAt: string
}

export type AmbulanceStatus = 'available' | 'busy' | 'offline'

export interface Ambulance {
  id: string
  code: string
  facilityId: string
  village: string
  status: AmbulanceStatus
  distanceKm: number
  etaMin: number
  driverName: string
  phone: string
  hasOxygen: boolean
  currentRequestId?: string
}

export interface AshaWorker {
  id: string
  name: string
  village: string
  villagesCovered: string[]
  phone: string
  distanceKm: number
  status: ServiceStatus
  patientIds: string[]
  householdIds: string[]
}

// ---------------------------------------------------------------------------
// Patient record
// ---------------------------------------------------------------------------

export interface ConsentRecord {
  shareWithTreatingDoctors: boolean
  shareWithReferralFacility: boolean
  shareWithAsha: boolean
  shareAnonymisedWithAdmin: boolean
  updatedAt: string
}

export interface Patient {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string
  village: string
  householdId?: string
  ashaId?: string
  bloodGroup: string
  allergies: string[]
  conditions: string[]
  currentMedicines: string[]
  mainIssue: string
  lastVisit?: string
  registeredBy: 'self' | 'asha' | 'kiosk' | 'facility'
  consent: ConsentRecord
  pendingSync?: boolean
}

export interface Household {
  id: string
  code: string
  village: string
  address: string
  headName: string
  memberPatientIds: string[]
  lastVisit?: string
  needs: string[]
  notes?: string
  pendingSync?: boolean
}

export type ConsultationMode = 'in_person' | 'video' | 'phone' | 'kiosk'

export interface Consultation {
  id: string
  patientId: string
  doctorId: string
  doctorName: string
  facilityId: string
  facilityName: string
  date: string
  mode: ConsultationMode
  symptoms: string
  assessment: string
  observations: string
  testsAdvised: string[]
  riskLevel: RiskLevel
  emergency: boolean
  prescriptionId?: string
  referralId?: string
  followUpId?: string
}

export type DoseTiming = 'before_food' | 'after_food' | 'anytime'

export type DoseFrequency = 'od' | 'bd' | 'tds' | 'qid' | 'sos'

export interface PrescriptionItem {
  id: string
  medicineName: string
  /** Verbatim from the prescribing doctor. Never derived by the app. */
  dose: string
  frequency: DoseFrequency
  timing: DoseTiming
  durationDays: number
  times: string[]
  instructions?: string
}

export interface Prescription {
  id: string
  consultationId?: string
  patientId: string
  doctorId: string
  doctorName: string
  date: string
  items: PrescriptionItem[]
  advice: string
}

export interface MedicationSchedule {
  id: string
  patientId: string
  prescriptionId: string
  itemId: string
  medicineName: string
  dose: string
  timing: DoseTiming
  frequency: DoseFrequency
  times: string[]
  startDate: string
  endDate: string
  active: boolean
  prescribedBy: string
}

export interface MedicationLog {
  id: string
  scheduleId: string
  patientId: string
  /** yyyy-mm-dd */
  date: string
  /** HH:mm slot this log belongs to. */
  time: string
  status: 'taken' | 'skipped'
  recordedAt: string
}

export interface LabReport {
  id: string
  patientId: string
  testName: string
  facilityId: string
  facilityName: string
  date: string
  summary: string
  lines: { label: string; value: string; reference: string; flag?: 'high' | 'low' }[]
}

export interface VaccinationRecord {
  id: string
  patientId: string
  vaccineId: string
  vaccineName: string
  doseNumber: number
  status: 'given' | 'due' | 'overdue'
  date?: string
  dueDate?: string
  facilityName?: string
}

export interface Screening {
  id: string
  patientId: string
  byAshaId: string
  date: string
  bpSystolic?: number
  bpDiastolic?: number
  bloodSugar?: number
  weightKg?: number
  temperatureF?: number
  pulse?: number
  spo2?: number
  notes: string
  riskLevel: RiskLevel
  pendingSync?: boolean
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export type ReferralStatus =
  | 'created'
  | 'accepted'
  | 'patient_reached'
  | 'consultation'
  | 'treatment'
  | 'completed'
  | 'cancelled'

export const REFERRAL_FLOW: ReferralStatus[] = [
  'created',
  'accepted',
  'patient_reached',
  'consultation',
  'treatment',
  'completed',
]

export interface ReferralEvent {
  status: ReferralStatus
  at: string
  by: string
  note?: string
}

export interface Referral {
  id: string
  patientId: string
  fromDoctorId?: string
  fromAshaId?: string
  fromFacilityId: string
  toFacilityId: string
  toDoctorId?: string
  reason: string
  symptoms: string
  notes: string
  urgency: Urgency
  transportRequired: boolean
  recommendedFacilityType: FacilityType
  status: ReferralStatus
  createdAt: string
  /** Deadline used by the drop-off detector. */
  expectedArrivalBy: string
  history: ReferralEvent[]
  attachments: {
    consultationIds: string[]
    prescriptionIds: string[]
    labReportIds: string[]
  }
  dropOffFlagged: boolean
  escalated: boolean
  contactAttempts: { at: string; by: string; method: 'call' | 'message'; outcome: string }[]
  pendingSync?: boolean
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export type FollowUpProgram =
  | 'diabetes'
  | 'hypertension'
  | 'tb'
  | 'maternal'
  | 'child'
  | 'elderly'
  | 'chronic'
  | 'general'

export type FollowUpStatus = 'scheduled' | 'completed' | 'missed'

export interface FollowUp {
  id: string
  patientId: string
  doctorId?: string
  ashaId?: string
  program: FollowUpProgram
  dueDate: string
  status: FollowUpStatus
  reason: string
  notes?: string
  createdAt: string
  completedAt?: string
  relatedConsultationId?: string
  relatedReferralId?: string
  pendingSync?: boolean
}

// ---------------------------------------------------------------------------
// Camps, kiosks, emergencies, alerts
// ---------------------------------------------------------------------------

export interface MedicalCamp {
  id: string
  name: string
  village: string
  organiserFacilityId: string
  date: string
  startTime: string
  endTime: string
  doctorIds: string[]
  services: string[]
  tests: string[]
  medicines: string[]
  slotsTotal: number
  distanceKm: number
  status: 'upcoming' | 'ongoing' | 'completed'
  contactAshaId?: string
  mobileUnit: boolean
}

export interface CampRegistration {
  id: string
  campId: string
  patientId: string
  registeredBy: string
  registeredAt: string
  attended: boolean
  source: 'patient' | 'asha' | 'kiosk'
  pendingSync?: boolean
}

export interface AssistedSession {
  id: string
  patientId: string
  kioskFacilityId?: string
  byUserId: string
  startedAt: string
  step: number
  screeningId?: string
  consultationId?: string
  referralId?: string
  followUpId?: string
  notes: string
  status: 'in_progress' | 'completed'
}

export type EmergencyStatus =
  | 'requested'
  | 'ambulance_assigned'
  | 'hospital_alerted'
  | 'en_route'
  | 'patient_reached'
  | 'in_treatment'
  | 'completed'
  | 'no_ambulance'

export interface EmergencyRequest {
  id: string
  patientId: string
  patientName: string
  patientAge: number
  requestedByUserId: string
  createdAt: string
  symptoms: string
  riskLevel: RiskLevel
  village: string
  ambulanceId?: string
  destinationFacilityId?: string
  assignedDoctorId?: string
  etaMin?: number
  status: EmergencyStatus
  timeline: { status: EmergencyStatus; at: string; note: string }[]
  emergencyPrepared: boolean
}

export type AlertKind = 'outbreak' | 'weather' | 'advisory'

export interface HealthAlert {
  id: string
  kind: AlertKind
  severity: 'info' | 'warning' | 'severe'
  title: string
  summary: string
  areas: string[]
  precautions: string[]
  symptomsToWatch: string[]
  whatToDo: string[]
  whatToAvoid: string[]
  createdAt: string
  expiresAt: string
  createdBy: string
  /** Always true in this prototype - shown as a "Demo alert" badge in the UI. */
  demo: boolean
}

export type WeatherCondition = 'heat' | 'rain' | 'flood' | 'cold' | 'normal'

export interface EnvironmentReading {
  village: string
  condition: WeatherCondition
  temperatureC: number
  humidityPct: number
  rainfallMm: number
  updatedAt: string
  headline: string
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  kind: 'emergency' | 'referral' | 'followup' | 'medication' | 'alert' | 'camp' | 'sync' | 'info'
  createdAt: string
  read: boolean
  actionPath?: string
  actionLabel?: string
}

// ---------------------------------------------------------------------------
// Offline
// ---------------------------------------------------------------------------

export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'failed'

export type OfflineActionKind =
  | 'register_patient'
  | 'add_screening'
  | 'create_referral'
  | 'add_follow_up'
  | 'camp_registration'
  | 'save_note'
  | 'mark_patient_reached'

export interface OfflineQueueItem {
  id: string
  kind: OfflineActionKind
  label: string
  payload: unknown
  createdAt: string
  status: SyncStatus
  syncedAt?: string
  byUserId: string
}

export interface FieldNote {
  id: string
  byUserId: string
  patientId?: string
  text: string
  createdAt: string
  pendingSync?: boolean
}

// ---------------------------------------------------------------------------
// Village access summary
// ---------------------------------------------------------------------------

export type AccessLevel = 'good' | 'moderate' | 'limited'

export interface Village {
  id: string
  name: string
  population: number
  nearestPhcId: string
  nearestChcId: string
  nearestHospitalId: string
  kioskFacilityId?: string
  ashaId?: string
  /** Demo indicator only - not an official government metric. */
  accessLevel: AccessLevel
  demandIndex: number
}
