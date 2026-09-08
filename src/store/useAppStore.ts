import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Ambulance,
  AmbulanceStatus,
  AppNotification,
  AssistedSession,
  CampRegistration,
  ConsentRecord,
  Consultation,
  DemoUser,
  Doctor,
  EmergencyRequest,
  EmergencyStatus,
  Facility,
  FieldNote,
  FollowUp,
  HealthAlert,
  Household,
  Language,
  LabReport,
  MedicalCamp,
  MedicationLog,
  MedicationSchedule,
  OfflineActionKind,
  OfflineQueueItem,
  Patient,
  Prescription,
  PrescriptionItem,
  Referral,
  ReferralStatus,
  RiskLevel,
  Role,
  Screening,
  ServiceStatus,
  StockStatus,
  SyncStatus,
  VaccinationRecord,
  Village,
} from '@/types'
import { createSeedData } from '@/data/seed'
import { addDays, newId, nowIso, todayKey } from '@/lib/utils'
import { buildSchedulesFromPrescription } from '@/services/medications'
import {
  cacheEssential,
  clearSyncedActions,
  saveQueuedAction,
  updateQueuedAction,
} from '@/services/offline/db'

export type SyncState = 'idle' | 'syncing' | 'synced'

interface Entities {
  villages: Village[]
  facilities: Facility[]
  doctors: Doctor[]
  ambulances: Ambulance[]
  ashas: ReturnType<typeof createSeedData>['ashas']
  patients: Patient[]
  households: Household[]
  consultations: Consultation[]
  prescriptions: Prescription[]
  medicationSchedules: MedicationSchedule[]
  medicationLogs: MedicationLog[]
  labReports: LabReport[]
  vaccinations: VaccinationRecord[]
  screenings: Screening[]
  referrals: Referral[]
  followUps: FollowUp[]
  camps: MedicalCamp[]
  campRegistrations: CampRegistration[]
  assistedSessions: AssistedSession[]
  emergencyRequests: EmergencyRequest[]
  alerts: HealthAlert[]
  environment: ReturnType<typeof createSeedData>['environment']
  notifications: AppNotification[]
  offlineQueue: OfflineQueueItem[]
  fieldNotes: FieldNote[]
  users: DemoUser[]
}

interface SessionState {
  currentUserId: string
  language: Language
  lowConnectivity: boolean
  simulatedOffline: boolean
  browserOnline: boolean
  syncState: SyncState
  lastSyncAt?: string
  /** Emergency request the patient UI is currently tracking. */
  activeEmergencyId?: string
}

export interface NewConsultationInput {
  patientId: string
  doctorId: string
  symptoms: string
  assessment: string
  observations: string
  testsAdvised: string[]
  riskLevel: RiskLevel
  emergency: boolean
  mode: Consultation['mode']
}

export interface NewPrescriptionInput {
  patientId: string
  doctorId: string
  consultationId?: string
  advice: string
  items: Omit<PrescriptionItem, 'id'>[]
}

export interface NewReferralInput {
  patientId: string
  fromDoctorId?: string
  fromAshaId?: string
  fromFacilityId: string
  toFacilityId: string
  toDoctorId?: string
  reason: string
  symptoms: string
  notes: string
  urgency: Referral['urgency']
  transportRequired: boolean
  recommendedFacilityType: Facility['type']
  attachments?: Partial<Referral['attachments']>
  expectedArrivalDays?: number
}

export interface NewFollowUpInput {
  patientId: string
  doctorId?: string
  ashaId?: string
  program: FollowUp['program']
  afterDays: number
  reason: string
  notes?: string
  relatedConsultationId?: string
  relatedReferralId?: string
}

export interface NewPatientInput {
  name: string
  age: number
  gender: Patient['gender']
  phone: string
  village: string
  householdId?: string
  bloodGroup: string
  allergies: string[]
  conditions: string[]
  mainIssue: string
  ashaId?: string
  registeredBy: Patient['registeredBy']
}

export interface NewScreeningInput {
  patientId: string
  byAshaId: string
  bpSystolic?: number
  bpDiastolic?: number
  bloodSugar?: number
  weightKg?: number
  temperatureF?: number
  pulse?: number
  spo2?: number
  notes: string
}

export interface NewAlertInput {
  kind: HealthAlert['kind']
  severity: HealthAlert['severity']
  title: string
  summary: string
  areas: string[]
  precautions: string[]
  symptomsToWatch: string[]
  whatToDo: string[]
  whatToAvoid: string[]
  expiryDays: number
  createdBy: string
}

export interface NewCampInput {
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
  mobileUnit: boolean
  contactAshaId?: string
}

interface Actions {
  // session
  login: (userId: string) => void
  setLanguage: (language: Language) => void
  setLowConnectivity: (on: boolean) => void
  setSimulatedOffline: (on: boolean) => void
  setBrowserOnline: (online: boolean) => void
  resetDemoData: () => void
  hydrateOfflineQueue: (items: OfflineQueueItem[]) => void

  // resources
  setDoctorStatus: (doctorId: string, status: ServiceStatus) => void
  setDoctorEmergencyAvailable: (doctorId: string, on: boolean) => void
  setFacilityTestStatus: (facilityId: string, testId: string, status: ServiceStatus) => void
  setFacilityMedicineStatus: (facilityId: string, medicineId: string, status: StockStatus) => void
  setFacilityVaccineStatus: (facilityId: string, vaccineId: string, status: StockStatus) => void
  setAmbulanceStatus: (ambulanceId: string, status: AmbulanceStatus) => void
  setBedOccupancy: (facilityId: string, kind: 'beds' | 'icu', occupied: number) => void

  // emergency
  requestEmergency: (input: {
    patientId: string
    symptoms: string
    riskLevel: RiskLevel
    requestedByUserId: string
  }) => { requestId?: string; reason?: 'no_ambulance' }
  advanceEmergency: (requestId: string, status: EmergencyStatus, note?: string) => void
  prepareEmergency: (requestId: string) => void
  assignEmergencyDoctor: (requestId: string, doctorId: string) => void
  clearActiveEmergency: () => void

  // clinical
  createConsultation: (input: NewConsultationInput) => string
  createPrescription: (input: NewPrescriptionInput) => string
  logDose: (scheduleId: string, time: string, status: 'taken' | 'skipped') => void
  updateConsent: (patientId: string, consent: Partial<ConsentRecord>) => void

  // referrals
  createReferral: (input: NewReferralInput) => string
  advanceReferral: (referralId: string, status: ReferralStatus, by: string, note?: string) => void
  recordReferralContact: (
    referralId: string,
    by: string,
    method: 'call' | 'message',
    outcome: string,
  ) => void
  escalateReferral: (referralId: string, by: string) => void
  detectReferralDropOffs: () => void

  // follow-ups
  createFollowUp: (input: NewFollowUpInput) => string
  completeFollowUp: (followUpId: string, note?: string) => void
  markFollowUpMissed: (followUpId: string) => void

  // patients / ASHA
  registerPatient: (input: NewPatientInput) => string
  addScreening: (input: NewScreeningInput) => string
  addFieldNote: (byUserId: string, text: string, patientId?: string) => void
  updateVaccinationStatus: (recordId: string, status: VaccinationRecord['status']) => void

  // camps
  registerForCamp: (
    campId: string,
    patientId: string,
    registeredBy: string,
    source: CampRegistration['source'],
  ) => string | undefined
  cancelCampRegistration: (registrationId: string) => void
  markCampAttended: (registrationId: string, attended: boolean) => void
  createCamp: (input: NewCampInput) => string

  // assisted mode
  startAssistedSession: (patientId: string, byUserId: string, kioskFacilityId?: string) => string
  updateAssistedSession: (sessionId: string, patch: Partial<AssistedSession>) => void

  // alerts + notifications
  createAlert: (input: NewAlertInput) => string
  deleteAlert: (alertId: string) => void
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void

  // offline
  enqueueOffline: (kind: OfflineActionKind, label: string, payload: unknown) => void
  setQueueItemStatus: (id: string, status: SyncStatus) => void
  setSyncState: (state: SyncState) => void
  finishSync: () => void
}

export type AppStore = Entities & SessionState & Actions

const seed = createSeedData()

const initialEntities = (): Entities => {
  const data = createSeedData()
  return {
    villages: data.villages,
    facilities: data.facilities,
    doctors: data.doctors,
    ambulances: data.ambulances,
    ashas: data.ashas,
    patients: data.patients,
    households: data.households,
    consultations: data.consultations,
    prescriptions: data.prescriptions,
    medicationSchedules: data.medicationSchedules,
    medicationLogs: data.medicationLogs,
    labReports: data.labReports,
    vaccinations: data.vaccinations,
    screenings: data.screenings,
    referrals: data.referrals,
    followUps: data.followUps,
    camps: data.camps,
    campRegistrations: data.campRegistrations,
    assistedSessions: data.assistedSessions,
    emergencyRequests: data.emergencyRequests,
    alerts: data.alerts,
    environment: data.environment,
    notifications: data.notifications,
    offlineQueue: data.offlineQueue,
    fieldNotes: data.fieldNotes,
    users: data.users,
  }
}

const initialSession = (): SessionState => ({
  currentUserId: 'u_ramesh',
  language: 'hi',
  lowConnectivity: false,
  simulatedOffline: false,
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncState: 'idle',
})

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialEntities(),
      ...initialSession(),

      // ---------------------------------------------------------------- session
      login: (userId) => {
        set({ currentUserId: userId })
      },
      setLanguage: (language) => {
        set({ language })
      },
      setLowConnectivity: (lowConnectivity) => {
        set({ lowConnectivity })
      },
      setSimulatedOffline: (simulatedOffline) => {
        set({ simulatedOffline })
      },
      setBrowserOnline: (browserOnline) => {
        set({ browserOnline })
      },
      resetDemoData: () => {
        set({ ...initialEntities(), ...initialSession() })
      },
      hydrateOfflineQueue: (items) => {
        const existing = get().offlineQueue
        const ids = new Set(existing.map((i) => i.id))
        const merged = [...existing, ...items.filter((i) => !ids.has(i.id))]
        set({ offlineQueue: merged })
      },

      // -------------------------------------------------------------- resources
      setDoctorStatus: (doctorId, status) => {
        set((s) => ({
          doctors: s.doctors.map((d) =>
            d.id === doctorId
              ? {
                  ...d,
                  status,
                  emergencyAvailable: status === 'unavailable' ? false : d.emergencyAvailable,
                  nextSlot: status === 'available' ? 'Available now' : 'Not available today',
                  updatedAt: nowIso(),
                }
              : d,
          ),
        }))
      },
      setDoctorEmergencyAvailable: (doctorId, on) => {
        set((s) => ({
          doctors: s.doctors.map((d) =>
            d.id === doctorId ? { ...d, emergencyAvailable: on, updatedAt: nowIso() } : d,
          ),
        }))
      },
      setFacilityTestStatus: (facilityId, testId, status) => {
        set((s) => ({
          facilities: s.facilities.map((f) =>
            f.id === facilityId
              ? {
                  ...f,
                  tests: f.tests.some((t) => t.itemId === testId)
                    ? f.tests.map((t) =>
                        t.itemId === testId ? { ...t, status, updatedAt: nowIso() } : t,
                      )
                    : [...f.tests, { itemId: testId, status, updatedAt: nowIso(), reportInHours: 24 }],
                }
              : f,
          ),
        }))
      },
      setFacilityMedicineStatus: (facilityId, medicineId, status) => {
        set((s) => ({
          facilities: s.facilities.map((f) =>
            f.id === facilityId
              ? {
                  ...f,
                  medicines: f.medicines.some((m) => m.itemId === medicineId)
                    ? f.medicines.map((m) =>
                        m.itemId === medicineId ? { ...m, status, updatedAt: nowIso() } : m,
                      )
                    : [...f.medicines, { itemId: medicineId, status, updatedAt: nowIso() }],
                }
              : f,
          ),
        }))
      },
      setFacilityVaccineStatus: (facilityId, vaccineId, status) => {
        set((s) => ({
          facilities: s.facilities.map((f) =>
            f.id === facilityId
              ? {
                  ...f,
                  vaccines: f.vaccines.some((v) => v.itemId === vaccineId)
                    ? f.vaccines.map((v) =>
                        v.itemId === vaccineId ? { ...v, status, updatedAt: nowIso() } : v,
                      )
                    : [...f.vaccines, { itemId: vaccineId, status, updatedAt: nowIso() }],
                }
              : f,
          ),
        }))
      },
      setAmbulanceStatus: (ambulanceId, status) => {
        set((s) => ({
          ambulances: s.ambulances.map((a) => (a.id === ambulanceId ? { ...a, status } : a)),
        }))
      },
      setBedOccupancy: (facilityId, kind, occupied) => {
        set((s) => ({
          facilities: s.facilities.map((f) => {
            if (f.id !== facilityId) return f
            const current = f[kind]
            const clamped = Math.max(0, Math.min(current.total, occupied))
            return { ...f, [kind]: { ...current, occupied: clamped } }
          }),
        }))
      },

      // -------------------------------------------------------------- emergency
      requestEmergency: ({ patientId, symptoms, riskLevel, requestedByUserId }) => {
        const state = get()
        const patient = state.patients.find((p) => p.id === patientId)
        if (!patient) return { reason: 'no_ambulance' }

        const available = state.ambulances
          .filter((a) => a.status === 'available')
          .sort((a, b) => a.distanceKm - b.distanceKm)
        const ambulance = available[0]

        const destination = state.facilities
          .filter((f) => f.emergency && f.beds.total > f.beds.occupied)
          .sort((a, b) => a.distanceKm - b.distanceKm)[0]

        const requestId = newId('er')
        if (!ambulance) {
          const request: EmergencyRequest = {
            id: requestId,
            patientId,
            patientName: patient.name,
            patientAge: patient.age,
            requestedByUserId,
            createdAt: nowIso(),
            symptoms,
            riskLevel,
            village: patient.village,
            status: 'no_ambulance',
            emergencyPrepared: false,
            timeline: [
              {
                status: 'no_ambulance',
                at: nowIso(),
                note: 'No demo ambulance is free right now. Emergency hospital and ASHA contacts shown instead.',
              },
            ],
          }
          set((s) => ({
            emergencyRequests: [request, ...s.emergencyRequests],
            activeEmergencyId: requestId,
          }))
          return { requestId, reason: 'no_ambulance' }
        }

        const request: EmergencyRequest = {
          id: requestId,
          patientId,
          patientName: patient.name,
          patientAge: patient.age,
          requestedByUserId,
          createdAt: nowIso(),
          symptoms,
          riskLevel,
          village: patient.village,
          ambulanceId: ambulance.id,
          destinationFacilityId: destination?.id,
          etaMin: ambulance.etaMin,
          status: 'hospital_alerted',
          emergencyPrepared: false,
          timeline: [
            { status: 'requested', at: nowIso(), note: 'Demo emergency request raised.' },
            {
              status: 'ambulance_assigned',
              at: nowIso(),
              note: `${ambulance.code} assigned (demo dispatch - no real ambulance has been sent).`,
            },
            {
              status: 'hospital_alerted',
              at: nowIso(),
              note: destination
                ? `Pre-arrival alert sent to ${destination.name} (demo).`
                : 'No emergency facility with free beds found in demo data.',
            },
          ],
        }

        set((s) => ({
          emergencyRequests: [request, ...s.emergencyRequests],
          ambulances: s.ambulances.map((a) =>
            a.id === ambulance.id ? { ...a, status: 'busy', currentRequestId: requestId } : a,
          ),
          activeEmergencyId: requestId,
        }))

        // Notify the receiving facility desk and the patient's ASHA.
        const facilityUsers = state.users.filter(
          (u) => u.role === 'facility' && u.facilityId === destination?.id,
        )
        const ashaUsers = state.users.filter(
          (u) => u.role === 'asha' && u.ashaId === patient.ashaId,
        )
        for (const user of [...facilityUsers, ...ashaUsers]) {
          get().pushNotification({
            userId: user.id,
            title: 'Incoming emergency (demo)',
            body: `${patient.name}, ${patient.age} - ${symptoms.slice(0, 70)}. ETA ${ambulance.etaMin} min.`,
            kind: 'emergency',
            actionPath: user.role === 'facility' ? '/facility/emergency' : '/asha',
            actionLabel: 'Open',
          })
        }
        return { requestId }
      },

      advanceEmergency: (requestId, status, note) => {
        set((s) => ({
          emergencyRequests: s.emergencyRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status,
                  timeline: [
                    ...r.timeline,
                    { status, at: nowIso(), note: note ?? 'Status updated (demo).' },
                  ],
                }
              : r,
          ),
        }))
        // Completing an emergency frees the ambulance again.
        if (status === 'completed') {
          const request = get().emergencyRequests.find((r) => r.id === requestId)
          if (request?.ambulanceId) {
            set((s) => ({
              ambulances: s.ambulances.map((a) =>
                a.id === request.ambulanceId
                  ? { ...a, status: 'available', currentRequestId: undefined }
                  : a,
              ),
            }))
          }
        }
      },

      prepareEmergency: (requestId) => {
        set((s) => ({
          emergencyRequests: s.emergencyRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  emergencyPrepared: true,
                  timeline: [
                    ...r.timeline,
                    {
                      status: r.status,
                      at: nowIso(),
                      note: 'Emergency bay prepared by facility staff (demo).',
                    },
                  ],
                }
              : r,
          ),
        }))
      },

      assignEmergencyDoctor: (requestId, doctorId) => {
        const doctor = get().doctors.find((d) => d.id === doctorId)
        set((s) => ({
          emergencyRequests: s.emergencyRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  assignedDoctorId: doctorId,
                  timeline: [
                    ...r.timeline,
                    {
                      status: r.status,
                      at: nowIso(),
                      note: `${doctor?.name ?? 'Doctor'} assigned to the incoming case (demo).`,
                    },
                  ],
                }
              : r,
          ),
        }))
      },

      clearActiveEmergency: () => {
        set({ activeEmergencyId: undefined })
      },

      // --------------------------------------------------------------- clinical
      createConsultation: (input) => {
        const state = get()
        const doctor = state.doctors.find((d) => d.id === input.doctorId)
        const facility = state.facilities.find((f) => f.id === doctor?.facilityId)
        const id = newId('c')
        const consultation: Consultation = {
          id,
          patientId: input.patientId,
          doctorId: input.doctorId,
          doctorName: doctor?.name ?? 'Doctor',
          facilityId: facility?.id ?? '',
          facilityName: facility?.name ?? 'Facility',
          date: todayKey(),
          mode: input.mode,
          symptoms: input.symptoms,
          assessment: input.assessment,
          observations: input.observations,
          testsAdvised: input.testsAdvised,
          riskLevel: input.riskLevel,
          emergency: input.emergency,
        }
        set((s) => ({
          consultations: [consultation, ...s.consultations],
          patients: s.patients.map((p) =>
            p.id === input.patientId ? { ...p, lastVisit: todayKey() } : p,
          ),
        }))
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === input.patientId,
        )
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: 'Consultation notes added',
            body: `${doctor?.name ?? 'Your doctor'} added notes to your health record.`,
            kind: 'info',
            actionPath: '/records',
            actionLabel: 'View record',
          })
        }
        return id
      },

      createPrescription: (input) => {
        const state = get()
        const doctor = state.doctors.find((d) => d.id === input.doctorId)
        const id = newId('rx')
        const prescription: Prescription = {
          id,
          consultationId: input.consultationId,
          patientId: input.patientId,
          doctorId: input.doctorId,
          doctorName: doctor?.name ?? 'Doctor',
          date: todayKey(),
          advice: input.advice,
          items: input.items.map((item) => ({ ...item, id: newId('rxi') })),
        }
        const schedules = buildSchedulesFromPrescription(prescription, newId)
        set((s) => ({
          prescriptions: [prescription, ...s.prescriptions],
          medicationSchedules: [...schedules, ...s.medicationSchedules],
          consultations: input.consultationId
            ? s.consultations.map((c) =>
                c.id === input.consultationId ? { ...c, prescriptionId: id } : c,
              )
            : s.consultations,
          patients: s.patients.map((p) =>
            p.id === input.patientId
              ? {
                  ...p,
                  currentMedicines: Array.from(
                    new Set([...p.currentMedicines, ...prescription.items.map((i) => i.medicineName)]),
                  ),
                }
              : p,
          ),
        }))
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === input.patientId,
        )
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: 'New prescription and medicine reminders',
            body: `${doctor?.name ?? 'Your doctor'} prescribed ${prescription.items.length} medicine(s). Reminders are set from the prescription.`,
            kind: 'medication',
            actionPath: '/medications',
            actionLabel: 'View reminders',
          })
        }
        return id
      },

      logDose: (scheduleId, time, status) => {
        const dateKey = todayKey()
        set((s) => {
          const existing = s.medicationLogs.find(
            (l) => l.scheduleId === scheduleId && l.date === dateKey && l.time === time,
          )
          const schedule = s.medicationSchedules.find((sc) => sc.id === scheduleId)
          if (!schedule) return {}
          if (existing) {
            return {
              medicationLogs: s.medicationLogs.map((l) =>
                l.id === existing.id ? { ...l, status, recordedAt: nowIso() } : l,
              ),
            }
          }
          const log: MedicationLog = {
            id: newId('mlog'),
            scheduleId,
            patientId: schedule.patientId,
            date: dateKey,
            time,
            status,
            recordedAt: nowIso(),
          }
          return { medicationLogs: [...s.medicationLogs, log] }
        })
      },

      updateConsent: (patientId, consent) => {
        set((s) => ({
          patients: s.patients.map((p) =>
            p.id === patientId
              ? { ...p, consent: { ...p.consent, ...consent, updatedAt: nowIso() } }
              : p,
          ),
        }))
      },

      // -------------------------------------------------------------- referrals
      createReferral: (input) => {
        const state = get()
        const id = newId('ref')
        const offline = !state.browserOnline || state.simulatedOffline
        const referral: Referral = {
          id,
          patientId: input.patientId,
          fromDoctorId: input.fromDoctorId,
          fromAshaId: input.fromAshaId,
          fromFacilityId: input.fromFacilityId,
          toFacilityId: input.toFacilityId,
          toDoctorId: input.toDoctorId,
          reason: input.reason,
          symptoms: input.symptoms,
          notes: input.notes,
          urgency: input.urgency,
          transportRequired: input.transportRequired,
          recommendedFacilityType: input.recommendedFacilityType,
          status: 'created',
          createdAt: nowIso(),
          expectedArrivalBy: addDays(input.expectedArrivalDays ?? 2).toISOString(),
          history: [
            {
              status: 'created',
              at: nowIso(),
              by: input.fromDoctorId
                ? (state.doctors.find((d) => d.id === input.fromDoctorId)?.name ?? 'Doctor')
                : (state.ashas.find((a) => a.id === input.fromAshaId)?.name ?? 'Health worker'),
              note: offline
                ? 'Created offline - queued for prototype sync.'
                : 'Referral created with patient record attached.',
            },
          ],
          attachments: {
            consultationIds: input.attachments?.consultationIds ?? [],
            prescriptionIds: input.attachments?.prescriptionIds ?? [],
            labReportIds: input.attachments?.labReportIds ?? [],
          },
          dropOffFlagged: false,
          escalated: false,
          contactAttempts: [],
          pendingSync: offline,
        }
        set((s) => ({ referrals: [referral, ...s.referrals] }))

        if (offline) {
          get().enqueueOffline('create_referral', `Referral for ${input.patientId}`, { id })
          return id
        }

        const patient = state.patients.find((p) => p.id === input.patientId)
        const toFacility = state.facilities.find((f) => f.id === input.toFacilityId)
        for (const user of state.users.filter(
          (u) => u.role === 'facility' && u.facilityId === input.toFacilityId,
        )) {
          get().pushNotification({
            userId: user.id,
            title: 'New incoming referral',
            body: `${patient?.name ?? 'Patient'} referred from ${
              state.facilities.find((f) => f.id === input.fromFacilityId)?.name ?? 'a facility'
            }. Urgency: ${input.urgency}.`,
            kind: 'referral',
            actionPath: '/facility/referrals',
            actionLabel: 'Review referral',
          })
        }
        for (const user of state.users.filter(
          (u) => u.role === 'asha' && u.ashaId === patient?.ashaId,
        )) {
          get().pushNotification({
            userId: user.id,
            title: 'Patient referred - please support travel',
            body: `${patient?.name ?? 'Patient'} referred to ${toFacility?.name ?? 'a facility'}.`,
            kind: 'referral',
            actionPath: '/asha/referrals',
            actionLabel: 'Track referral',
          })
        }
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === input.patientId,
        )
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: 'You have been referred',
            body: `Please visit ${toFacility?.name ?? 'the referred facility'}. Track the status any time.`,
            kind: 'referral',
            actionPath: '/referrals',
            actionLabel: 'Track referral',
          })
        }
        return id
      },

      advanceReferral: (referralId, status, by, note) => {
        set((s) => ({
          referrals: s.referrals.map((r) =>
            r.id === referralId
              ? {
                  ...r,
                  status,
                  dropOffFlagged: status === 'created' ? r.dropOffFlagged : false,
                  history: [...r.history, { status, at: nowIso(), by, note }],
                }
              : r,
          ),
        }))
        const state = get()
        const referral = state.referrals.find((r) => r.id === referralId)
        if (!referral) return
        const patient = state.patients.find((p) => p.id === referral.patientId)
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === referral.patientId,
        )
        const labels: Record<ReferralStatus, string> = {
          created: 'Referral created',
          accepted: 'Referral accepted by the facility',
          patient_reached: 'Marked as reached at the facility',
          consultation: 'Consultation started at the facility',
          treatment: 'Treatment started',
          completed: 'Referral completed',
          cancelled: 'Referral cancelled',
        }
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: labels[status],
            body: note ?? `Status updated by ${by}.`,
            kind: 'referral',
            actionPath: '/referrals',
            actionLabel: 'Track referral',
          })
        }
        for (const user of state.users.filter(
          (u) => u.role === 'asha' && u.ashaId === patient?.ashaId,
        )) {
          get().pushNotification({
            userId: user.id,
            title: `${patient?.name ?? 'Patient'}: ${labels[status]}`,
            body: note ?? `Updated by ${by}.`,
            kind: 'referral',
            actionPath: '/asha/referrals',
            actionLabel: 'Open',
          })
        }
      },

      recordReferralContact: (referralId, by, method, outcome) => {
        set((s) => ({
          referrals: s.referrals.map((r) =>
            r.id === referralId
              ? {
                  ...r,
                  contactAttempts: [...r.contactAttempts, { at: nowIso(), by, method, outcome }],
                }
              : r,
          ),
        }))
      },

      escalateReferral: (referralId, by) => {
        set((s) => ({
          referrals: s.referrals.map((r) =>
            r.id === referralId
              ? {
                  ...r,
                  escalated: true,
                  history: [
                    ...r.history,
                    {
                      status: r.status,
                      at: nowIso(),
                      by,
                      note: 'Escalated to the PHC medical officer (demo).',
                    },
                  ],
                }
              : r,
          ),
        }))
        const state = get()
        const referral = state.referrals.find((r) => r.id === referralId)
        for (const user of state.users.filter(
          (u) => u.role === 'facility' && u.facilityId === referral?.fromFacilityId,
        )) {
          get().pushNotification({
            userId: user.id,
            title: 'Referral escalated by ASHA',
            body: 'A referred patient has not reached the facility. Please review.',
            kind: 'referral',
            actionPath: '/facility/referrals',
            actionLabel: 'Review',
          })
        }
      },

      detectReferralDropOffs: () => {
        const state = get()
        const now = Date.now()
        const newlyFlagged: Referral[] = []
        const referrals = state.referrals.map((r) => {
          const unreached = r.status === 'created' || r.status === 'accepted'
          const overdue = new Date(r.expectedArrivalBy).getTime() < now
          if (unreached && overdue && !r.dropOffFlagged) {
            newlyFlagged.push(r)
            return { ...r, dropOffFlagged: true }
          }
          return r
        })
        if (!newlyFlagged.length) return
        set({ referrals })
        for (const referral of newlyFlagged) {
          const patient = state.patients.find((p) => p.id === referral.patientId)
          for (const user of state.users.filter(
            (u) => u.role === 'asha' && u.ashaId === patient?.ashaId,
          )) {
            get().pushNotification({
              userId: user.id,
              title: 'Referral follow-up required',
              body: `${patient?.name ?? 'Patient'} has not reached ${
                state.facilities.find((f) => f.id === referral.toFacilityId)?.name ?? 'the facility'
              }.`,
              kind: 'referral',
              actionPath: '/asha/referrals',
              actionLabel: 'Open referral',
            })
          }
        }
      },

      // ------------------------------------------------------------ follow-ups
      createFollowUp: (input) => {
        const state = get()
        const id = newId('fu')
        const offline = !state.browserOnline || state.simulatedOffline
        const patient = state.patients.find((p) => p.id === input.patientId)
        const followUp: FollowUp = {
          id,
          patientId: input.patientId,
          doctorId: input.doctorId,
          ashaId: input.ashaId ?? patient?.ashaId,
          program: input.program,
          dueDate: addDays(input.afterDays).toISOString().slice(0, 10),
          status: 'scheduled',
          reason: input.reason,
          notes: input.notes,
          createdAt: nowIso(),
          relatedConsultationId: input.relatedConsultationId,
          relatedReferralId: input.relatedReferralId,
          pendingSync: offline,
        }
        set((s) => ({
          followUps: [followUp, ...s.followUps],
          consultations: input.relatedConsultationId
            ? s.consultations.map((c) =>
                c.id === input.relatedConsultationId ? { ...c, followUpId: id } : c,
              )
            : s.consultations,
        }))
        if (offline) {
          get().enqueueOffline('add_follow_up', `Follow-up for ${patient?.name ?? 'patient'}`, { id })
          return id
        }
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === input.patientId,
        )
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: `Follow-up after ${input.afterDays} days`,
            body: input.reason,
            kind: 'followup',
            actionPath: '/follow-ups',
            actionLabel: 'View follow-up',
          })
        }
        for (const user of state.users.filter(
          (u) => u.role === 'asha' && u.ashaId === followUp.ashaId,
        )) {
          get().pushNotification({
            userId: user.id,
            title: `Follow-up set for ${patient?.name ?? 'a patient'}`,
            body: `${input.reason} - due in ${input.afterDays} days.`,
            kind: 'followup',
            actionPath: '/asha/follow-ups',
            actionLabel: 'Open',
          })
        }
        return id
      },

      completeFollowUp: (followUpId, note) => {
        set((s) => ({
          followUps: s.followUps.map((f) =>
            f.id === followUpId
              ? {
                  ...f,
                  status: 'completed',
                  completedAt: nowIso(),
                  notes: note ? `${f.notes ? `${f.notes} | ` : ''}${note}` : f.notes,
                }
              : f,
          ),
        }))
      },

      markFollowUpMissed: (followUpId) => {
        set((s) => ({
          followUps: s.followUps.map((f) => (f.id === followUpId ? { ...f, status: 'missed' } : f)),
        }))
      },

      // ------------------------------------------------------------- ASHA data
      registerPatient: (input) => {
        const state = get()
        const offline = !state.browserOnline || state.simulatedOffline
        const id = newId('p')
        const patient: Patient = {
          id,
          name: input.name,
          age: input.age,
          gender: input.gender,
          phone: input.phone,
          village: input.village,
          householdId: input.householdId,
          ashaId: input.ashaId,
          bloodGroup: input.bloodGroup,
          allergies: input.allergies,
          conditions: input.conditions,
          currentMedicines: [],
          mainIssue: input.mainIssue,
          registeredBy: input.registeredBy,
          consent: {
            shareWithTreatingDoctors: true,
            shareWithReferralFacility: true,
            shareWithAsha: true,
            shareAnonymisedWithAdmin: true,
            updatedAt: nowIso(),
          },
          pendingSync: offline,
        }
        set((s) => ({
          patients: [patient, ...s.patients],
          ashas: s.ashas.map((a) =>
            a.id === input.ashaId ? { ...a, patientIds: [id, ...a.patientIds] } : a,
          ),
          households: input.householdId
            ? s.households.map((h) =>
                h.id === input.householdId
                  ? { ...h, memberPatientIds: [...h.memberPatientIds, id] }
                  : h,
              )
            : s.households,
        }))
        if (offline) {
          get().enqueueOffline('register_patient', `New patient: ${input.name}`, { id })
        }
        return id
      },

      addScreening: (input) => {
        const state = get()
        const offline = !state.browserOnline || state.simulatedOffline
        const id = newId('scr')
        // Risk banding here is a screening triage aid, not a diagnosis.
        let riskLevel: RiskLevel = 'low'
        if (
          (input.bpSystolic ?? 0) >= 160 ||
          (input.bpDiastolic ?? 0) >= 100 ||
          (input.bloodSugar ?? 0) >= 250 ||
          (input.spo2 ?? 100) < 92
        ) {
          riskLevel = 'high'
        } else if (
          (input.bpSystolic ?? 0) >= 140 ||
          (input.bpDiastolic ?? 0) >= 90 ||
          (input.bloodSugar ?? 0) >= 160 ||
          (input.temperatureF ?? 0) >= 101
        ) {
          riskLevel = 'medium'
        }
        const screening: Screening = {
          id,
          patientId: input.patientId,
          byAshaId: input.byAshaId,
          date: todayKey(),
          bpSystolic: input.bpSystolic,
          bpDiastolic: input.bpDiastolic,
          bloodSugar: input.bloodSugar,
          weightKg: input.weightKg,
          temperatureF: input.temperatureF,
          pulse: input.pulse,
          spo2: input.spo2,
          notes: input.notes,
          riskLevel,
          pendingSync: offline,
        }
        set((s) => ({
          screenings: [screening, ...s.screenings],
          patients: s.patients.map((p) =>
            p.id === input.patientId ? { ...p, lastVisit: todayKey() } : p,
          ),
        }))
        if (offline) {
          const name = state.patients.find((p) => p.id === input.patientId)?.name ?? 'patient'
          get().enqueueOffline('add_screening', `Screening for ${name}`, { id })
        }
        return id
      },

      addFieldNote: (byUserId, text, patientId) => {
        const state = get()
        const offline = !state.browserOnline || state.simulatedOffline
        const note: FieldNote = {
          id: newId('note'),
          byUserId,
          patientId,
          text,
          createdAt: nowIso(),
          pendingSync: offline,
        }
        set((s) => ({ fieldNotes: [note, ...s.fieldNotes] }))
        if (offline) {
          get().enqueueOffline('save_note', 'Field note saved offline', { id: note.id })
        }
      },

      updateVaccinationStatus: (recordId, status) => {
        set((s) => ({
          vaccinations: s.vaccinations.map((v) =>
            v.id === recordId
              ? { ...v, status, date: status === 'given' ? todayKey() : v.date }
              : v,
          ),
        }))
      },

      // ------------------------------------------------------------------ camps
      registerForCamp: (campId, patientId, registeredBy, source) => {
        const state = get()
        const camp = state.camps.find((c) => c.id === campId)
        if (!camp) return undefined
        const taken = state.campRegistrations.filter((r) => r.campId === campId).length
        if (taken >= camp.slotsTotal) return undefined
        if (state.campRegistrations.some((r) => r.campId === campId && r.patientId === patientId)) {
          return undefined
        }
        const offline = !state.browserOnline || state.simulatedOffline
        const id = newId('creg')
        const registration: CampRegistration = {
          id,
          campId,
          patientId,
          registeredBy,
          registeredAt: nowIso(),
          attended: false,
          source,
          pendingSync: offline,
        }
        set((s) => ({ campRegistrations: [registration, ...s.campRegistrations] }))
        if (offline) {
          get().enqueueOffline('camp_registration', `Camp registration for ${camp.name}`, { id })
          return id
        }
        const patientUser = state.users.find(
          (u) => u.role === 'patient' && u.patientId === patientId,
        )
        if (patientUser) {
          get().pushNotification({
            userId: patientUser.id,
            title: 'Registered for medical camp',
            body: `${camp.name} on ${camp.date}, ${camp.startTime} - ${camp.endTime}.`,
            kind: 'camp',
            actionPath: '/camps',
            actionLabel: 'View camp',
          })
        }
        return id
      },

      cancelCampRegistration: (registrationId) => {
        set((s) => ({
          campRegistrations: s.campRegistrations.filter((r) => r.id !== registrationId),
        }))
      },

      markCampAttended: (registrationId, attended) => {
        set((s) => ({
          campRegistrations: s.campRegistrations.map((r) =>
            r.id === registrationId ? { ...r, attended } : r,
          ),
        }))
      },

      createCamp: (input) => {
        const id = newId('camp')
        const camp: MedicalCamp = {
          id,
          name: input.name,
          village: input.village,
          organiserFacilityId: input.organiserFacilityId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          doctorIds: input.doctorIds,
          services: input.services,
          tests: input.tests,
          medicines: input.medicines,
          slotsTotal: input.slotsTotal,
          distanceKm:
            get().villages.find((v) => v.name === input.village) && input.village === 'Kalyanpur'
              ? 0.5
              : 8,
          status: 'upcoming',
          contactAshaId: input.contactAshaId,
          mobileUnit: input.mobileUnit,
        }
        set((s) => ({ camps: [camp, ...s.camps] }))
        const state = get()
        for (const user of state.users) {
          if (
            (user.role === 'patient' || user.role === 'asha') &&
            user.village === input.village
          ) {
            get().pushNotification({
              userId: user.id,
              title: 'New medical camp near you',
              body: `${input.name} on ${input.date}, ${input.startTime} - ${input.endTime}.`,
              kind: 'camp',
              actionPath: user.role === 'asha' ? '/asha/camps' : '/camps',
              actionLabel: 'View camp',
            })
          }
        }
        return id
      },

      // ---------------------------------------------------------- assisted mode
      startAssistedSession: (patientId, byUserId, kioskFacilityId) => {
        const id = newId('as')
        const session: AssistedSession = {
          id,
          patientId,
          kioskFacilityId,
          byUserId,
          startedAt: nowIso(),
          step: 0,
          notes: '',
          status: 'in_progress',
        }
        set((s) => ({ assistedSessions: [session, ...s.assistedSessions] }))
        return id
      },

      updateAssistedSession: (sessionId, patch) => {
        set((s) => ({
          assistedSessions: s.assistedSessions.map((a) =>
            a.id === sessionId ? { ...a, ...patch } : a,
          ),
        }))
      },

      // --------------------------------------------------------------- alerts
      createAlert: (input) => {
        const id = newId('alert')
        const alert: HealthAlert = {
          id,
          kind: input.kind,
          severity: input.severity,
          title: input.title,
          summary: input.summary,
          areas: input.areas,
          precautions: input.precautions,
          symptomsToWatch: input.symptomsToWatch,
          whatToDo: input.whatToDo,
          whatToAvoid: input.whatToAvoid,
          createdAt: nowIso(),
          expiresAt: addDays(input.expiryDays).toISOString(),
          createdBy: input.createdBy,
          demo: true,
        }
        set((s) => ({ alerts: [alert, ...s.alerts] }))
        const state = get()
        for (const user of state.users) {
          const covers =
            user.role === 'patient'
              ? input.areas.includes(user.village)
              : user.role === 'asha'
                ? (state.ashas
                    .find((a) => a.id === user.ashaId)
                    ?.villagesCovered.some((v) => input.areas.includes(v)) ?? false)
                : false
          if (!covers) continue
          get().pushNotification({
            userId: user.id,
            title: `Demo health alert: ${input.title}`,
            body: input.summary.slice(0, 120),
            kind: 'alert',
            actionPath: user.role === 'asha' ? '/asha/alerts' : '/alerts',
            actionLabel: 'See precautions',
          })
        }
        return id
      },

      deleteAlert: (alertId) => {
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== alertId) }))
      },

      pushNotification: (n) => {
        const notification: AppNotification = {
          ...n,
          id: newId('n'),
          createdAt: nowIso(),
          read: false,
        }
        set((s) => ({ notifications: [notification, ...s.notifications].slice(0, 120) }))
      },

      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }))
      },

      markAllNotificationsRead: (userId) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        }))
      },

      // --------------------------------------------------------------- offline
      enqueueOffline: (kind, label, payload) => {
        const item: OfflineQueueItem = {
          id: newId('q'),
          kind,
          label,
          payload,
          createdAt: nowIso(),
          status: 'queued',
          byUserId: get().currentUserId,
        }
        set((s) => ({ offlineQueue: [item, ...s.offlineQueue] }))
        void saveQueuedAction(item)
      },

      setQueueItemStatus: (id, status) => {
        set((s) => ({
          offlineQueue: s.offlineQueue.map((i) =>
            i.id === id
              ? { ...i, status, syncedAt: status === 'synced' ? nowIso() : i.syncedAt }
              : i,
          ),
        }))
        const item = get().offlineQueue.find((i) => i.id === id)
        if (item) void updateQueuedAction(item)
      },

      setSyncState: (syncState) => {
        set({ syncState })
      },

      finishSync: () => {
        const at = nowIso()
        set((s) => ({
          syncState: 'synced',
          lastSyncAt: at,
          offlineQueue: s.offlineQueue.map((i) =>
            i.status === 'synced' ? i : { ...i, status: 'synced', syncedAt: at },
          ),
          patients: s.patients.map((p) => (p.pendingSync ? { ...p, pendingSync: false } : p)),
          screenings: s.screenings.map((x) => (x.pendingSync ? { ...x, pendingSync: false } : x)),
          referrals: s.referrals.map((x) => (x.pendingSync ? { ...x, pendingSync: false } : x)),
          followUps: s.followUps.map((x) => (x.pendingSync ? { ...x, pendingSync: false } : x)),
          campRegistrations: s.campRegistrations.map((x) =>
            x.pendingSync ? { ...x, pendingSync: false } : x,
          ),
          fieldNotes: s.fieldNotes.map((x) => (x.pendingSync ? { ...x, pendingSync: false } : x)),
          households: s.households.map((x) => (x.pendingSync ? { ...x, pendingSync: false } : x)),
        }))
        void cacheEssential('lastSyncAt', at)
      },
    }),
    {
      name: 'ruralcare-ai-demo',
      version: 3,
      partialize: (state) => {
        // Persist domain data + preferences, never transient sync/connection flags.
        const {
          syncState: _syncState,
          browserOnline: _browserOnline,
          simulatedOffline: _simulatedOffline,
          ...rest
        } = state
        return rest as AppStore
      },
      migrate: () => ({ ...initialEntities(), ...initialSession() }) as never,
    },
  ),
)

/** Convenience: true when the app should behave as if there is no network. */
export function isEffectivelyOffline(state: Pick<AppStore, 'browserOnline' | 'simulatedOffline'>) {
  return !state.browserOnline || state.simulatedOffline
}

export const DEMO_USERS = seed.users

/** Runs the prototype sync: queued -> syncing -> synced. */
export async function runPrototypeSync(): Promise<void> {
  const store = useAppStore.getState()
  const queued = store.offlineQueue.filter((i) => i.status !== 'synced')
  if (!queued.length) {
    store.setSyncState('synced')
    setTimeout(() => {
      useAppStore.getState().setSyncState('idle')
    }, 1800)
    return
  }
  store.setSyncState('syncing')
  for (const item of queued) {
    useAppStore.getState().setQueueItemStatus(item.id, 'syncing')
    await new Promise((resolve) => setTimeout(resolve, 350))
    useAppStore.getState().setQueueItemStatus(item.id, 'synced')
  }
  useAppStore.getState().finishSync()
  // Synced rows no longer need to sit in offline storage.
  void clearSyncedActions()
  useAppStore.getState().pushNotification({
    userId: useAppStore.getState().currentUserId,
    title: 'Data synced successfully (demo)',
    body: `${queued.length} offline action(s) synced to the prototype store.`,
    kind: 'sync',
  })
  setTimeout(() => {
    useAppStore.getState().setSyncState('idle')
  }, 2500)
}

export type { Role }
