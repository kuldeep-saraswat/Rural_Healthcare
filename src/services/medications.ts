import type {
  DoseFrequency,
  MedicationLog,
  MedicationSchedule,
  Prescription,
  PrescriptionItem,
} from '@/types'
import { addDays, minutesUntil, toDateKey, todayKey } from '@/lib/utils'

/**
 * Default reminder clock-times per frequency. These are *reminder times only* -
 * the dose itself always comes verbatim from the prescribing doctor and the
 * doctor can override these times when writing the prescription.
 */
export const FREQUENCY_TIMES: Record<DoseFrequency, string[]> = {
  od: ['08:00'],
  bd: ['08:00', '20:00'],
  tds: ['08:00', '14:00', '20:00'],
  qid: ['06:00', '12:00', '18:00', '22:00'],
  sos: [],
}

export const FREQUENCY_LABEL: Record<DoseFrequency, string> = {
  od: 'Once a day',
  bd: 'Twice a day',
  tds: 'Three times a day',
  qid: 'Four times a day',
  sos: 'Only when needed (SOS)',
}

export const TIMING_LABEL = {
  before_food: 'Before food',
  after_food: 'After food',
  anytime: 'Any time',
} as const

/**
 * Turns a doctor's prescription into medication schedules.
 * Nothing here invents a dose - `item.dose` is copied through untouched.
 */
export function buildSchedulesFromPrescription(
  prescription: Prescription,
  makeId: (prefix: string) => string,
  startDate: Date = new Date(),
): MedicationSchedule[] {
  return prescription.items
    .filter((item) => item.frequency !== 'sos')
    .map((item) => ({
      id: makeId('sch'),
      patientId: prescription.patientId,
      prescriptionId: prescription.id,
      itemId: item.id,
      medicineName: item.medicineName,
      dose: item.dose,
      timing: item.timing,
      frequency: item.frequency,
      times: item.times.length ? item.times : FREQUENCY_TIMES[item.frequency],
      startDate: toDateKey(startDate),
      endDate: toDateKey(addDays(Math.max(item.durationDays - 1, 0), startDate)),
      active: true,
      prescribedBy: prescription.doctorName,
    }))
}

export function defaultTimesFor(frequency: DoseFrequency): string[] {
  return [...FREQUENCY_TIMES[frequency]]
}

export interface DoseSlot {
  scheduleId: string
  medicineName: string
  dose: string
  timing: MedicationSchedule['timing']
  time: string
  /** 'taken' | 'skipped' from the log, otherwise derived from the clock. */
  state: 'taken' | 'skipped' | 'due' | 'upcoming'
  minutesAway: number
  prescriptionId: string
  prescribedBy: string
}

/** Builds today's dose timeline for a patient by merging schedules with logs. */
export function buildDayDoses(
  schedules: MedicationSchedule[],
  logs: MedicationLog[],
  dateKey: string = todayKey(),
): DoseSlot[] {
  const slots: DoseSlot[] = []
  for (const schedule of schedules) {
    if (!schedule.active) continue
    if (dateKey < schedule.startDate || dateKey > schedule.endDate) continue
    for (const time of schedule.times) {
      const log = logs.find(
        (l) => l.scheduleId === schedule.id && l.date === dateKey && l.time === time,
      )
      const minutesAway = minutesUntil(time)
      slots.push({
        scheduleId: schedule.id,
        medicineName: schedule.medicineName,
        dose: schedule.dose,
        timing: schedule.timing,
        time,
        state: log ? log.status : minutesAway <= 0 ? 'due' : 'upcoming',
        minutesAway,
        prescriptionId: schedule.prescriptionId,
        prescribedBy: schedule.prescribedBy,
      })
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * Seeds a believable "already taken" history for demo schedules: any slot more
 * than an hour in the past today counts as taken.
 */
export function seedTodayLogs(
  schedules: MedicationSchedule[],
  makeId: (prefix: string) => string,
): MedicationLog[] {
  const dateKey = todayKey()
  const logs: MedicationLog[] = []
  for (const schedule of schedules) {
    if (dateKey < schedule.startDate || dateKey > schedule.endDate) continue
    for (const time of schedule.times) {
      if (minutesUntil(time) < -60) {
        logs.push({
          id: makeId('mlog'),
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          date: dateKey,
          time,
          status: 'taken',
          recordedAt: new Date().toISOString(),
        })
      }
    }
  }
  return logs
}

export function nextDose(slots: DoseSlot[]): DoseSlot | undefined {
  return slots.find((s) => s.state === 'due') ?? slots.find((s) => s.state === 'upcoming')
}

export function summariseItem(item: PrescriptionItem): string {
  const timing = TIMING_LABEL[item.timing]
  const freq = FREQUENCY_LABEL[item.frequency]
  return `${item.dose} - ${freq} - ${timing} - ${item.durationDays} day(s)`
}
