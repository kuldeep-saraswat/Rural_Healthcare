import type { Language, Patient, RiskLevel } from '@/types'
import type { AppStore } from '@/store/useAppStore'

export type IntentId =
  | 'symptoms'
  | 'emergency'
  | 'ambulance'
  | 'doctor_consult'
  | 'nearby_doctor'
  | 'asha'
  | 'hospital'
  | 'phc'
  | 'chc'
  | 'diagnostic_test'
  | 'medicine_availability'
  | 'vaccine'
  | 'medical_camp'
  | 'health_kiosk'
  | 'referral_status'
  | 'follow_up'
  | 'health_record'
  | 'preventive_care'
  | 'weather_precaution'
  | 'outbreak_alert'
  | 'navigation'
  | 'unknown'

/** Interactive cards the assistant can attach to a reply. */
export type AiCard =
  | { kind: 'doctor'; doctorId: string; emergency?: boolean }
  | { kind: 'ambulance'; ambulanceId: string }
  | { kind: 'facility'; facilityId: string; note?: string }
  | { kind: 'medicine'; medicineId: string; facilityId: string }
  | { kind: 'test'; testId: string; facilityId: string }
  | { kind: 'vaccine'; vaccineId: string; facilityId: string }
  | { kind: 'camp'; campId: string }
  | { kind: 'kiosk'; facilityId: string }
  | { kind: 'asha'; ashaId: string }
  | { kind: 'referral'; referralId: string }
  | { kind: 'followUp'; followUpId: string }
  | { kind: 'alert'; alertId: string }
  | { kind: 'environment'; village: string }
  | { kind: 'medication'; scheduleId: string }
  | { kind: 'record'; patientId: string }
  | { kind: 'triage'; result: TriageResult }
  | { kind: 'link'; label: string; path: string; description?: string }

export interface AiRoute {
  path: string
  label: string
  /** When true the chat surface navigates immediately after replying. */
  auto?: boolean
}

export interface AiResolution {
  intent: IntentId
  emergency: boolean
  reply: string
  cards: AiCard[]
  route?: AiRoute
  /** Set when the assistant needs one more answer before it can act. */
  question?: string
  suggestions?: string[]
  /** Safety / prototype disclaimer shown under the reply. */
  notice?: string
}

export interface ExtractedEntities {
  testId?: string
  medicineId?: string
  vaccineId?: string
  village?: string
  durationDays?: number
  temperatureF?: number
  facilityType?: 'phc' | 'chc' | 'district_hospital' | 'medical_college' | 'diagnostic_centre'
  freeText: string
}

export interface NextStep {
  label: string
  path: string
  tone: 'primary' | 'default' | 'danger'
}

export interface TriageResult {
  symptomsSummary: string
  possibleCauses: string[]
  riskLevel: RiskLevel
  reasons: string[]
  nextSteps: NextStep[]
  redFlags: string[]
}

export type SymptomQuestion =
  | 'duration'
  | 'fever'
  | 'age'
  | 'conditions'
  | 'severity'
  | 'redflags'

export interface SymptomSession {
  symptomKeys: string[]
  rawInputs: string[]
  answers: Partial<Record<SymptomQuestion, string>>
  asked: SymptomQuestion[]
  pending?: SymptomQuestion
  redFlags: string[]
  complete: boolean
}

export interface AiContext {
  state: AppStore
  language: Language
  patient?: Patient
  /** Live symptom conversation, if one is running. */
  session: SymptomSession | null
}

export interface AiTurn {
  resolution: AiResolution
  session: SymptomSession | null
}
