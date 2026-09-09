import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { SymptomSession, TriageResult } from '@/services/ai/types'
import { buildTriage, detectRedFlags, detectSymptoms } from '@/services/ai/symptomEngine'
import { suggestCareLevel } from '@/services/ai/decisionSupport'
import { TriageCard } from '@/components/ai/TriageCard'
import { DoctorCard } from '@/components/cards/DoctorCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Field, FieldRow, Select, TextArea, TextInput } from '@/components/ui/Form'
import { FlowStrip, StepHeader } from '@/components/ui/Timeline'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import { availableDoctors, currentUser } from '@/store/selectors'
import { formatDate } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

const STEPS = [
  { label: 'Patient', hint: 'identify' },
  { label: 'Screening', hint: 'BP, sugar' },
  { label: 'AI assistance', hint: 'possible causes' },
  { label: 'Doctor', hint: 'teleconsultation' },
  { label: 'Referral', hint: 'if needed' },
  { label: 'Follow-up', hint: 'schedule' },
]

/**
 * Assisted healthcare mode.
 *
 * For a patient who cannot use the website alone: an ASHA worker or a kiosk
 * volunteer drives this flow on their behalf, and every step writes to the same
 * shared record the patient and doctors see.
 */
export function AssistedPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)

  const kioskId = params.get('kiosk') ?? undefined
  const [patientId, setPatientId] = useState(params.get('patient') ?? '')
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [step, setStep] = useState(0)

  // Screening
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [sugar, setSugar] = useState('')
  const [temp, setTemp] = useState('')
  const [spo2, setSpo2] = useState('')
  const [screeningNotes, setScreeningNotes] = useState('')
  const [screeningId, setScreeningId] = useState<string | undefined>(undefined)

  // AI assistance
  const [complaint, setComplaint] = useState('')
  const [duration, setDuration] = useState('')
  const [severity, setSeverity] = useState('mild')
  const [redFlagText, setRedFlagText] = useState('no')
  const [triage, setTriage] = useState<TriageResult | undefined>(undefined)

  // Referral
  const [referralFacility, setReferralFacility] = useState('')
  const [referralReason, setReferralReason] = useState('')
  const [referralId, setReferralId] = useState<string | undefined>(undefined)

  // Follow-up
  const [followUpDays, setFollowUpDays] = useState('7')
  const [followUpReason, setFollowUpReason] = useState('')
  const [followUpDone, setFollowUpDone] = useState(false)

  const patients = store.patients.filter((p) =>
    user.role === 'asha' ? p.ashaId === user.ashaId : true,
  )
  const patient = store.patients.find((p) => p.id === patientId)
  const kiosk = store.facilities.find((f) => f.id === kioskId)
  const doctors = availableDoctors(store.doctors, store.facilities, { telemedicineOnly: true })

  const suggestion = useMemo(
    () =>
      triage
        ? suggestCareLevel({
            riskLevel: triage.riskLevel,
            age: patient?.age,
            needsImaging: /stone|imaging|ultrasound/i.test(triage.possibleCauses.join(' ')),
            isMaternal: /pregnan/i.test(patient?.conditions.join(' ') ?? ''),
          })
        : undefined,
    [triage, patient],
  )

  const startSession = (id: string) => {
    setPatientId(id)
    const newSessionId = store.startAssistedSession(id, user.id, kioskId)
    setSessionId(newSessionId)
    setStep(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="stethoscope"
        eyebrow="Guided by a health worker"
        title="Assisted healthcare mode"
        description={
          kiosk
            ? `At ${kiosk.name}. A trained volunteer operates the screen for the patient.`
            : 'A health worker completes each step for a patient who cannot use the website alone.'
        }
      />

      <Card>
        <FlowStrip steps={STEPS} activeIndex={step} />
      </Card>

      {step === 0 ? (
        <Card>
          <StepHeader step={1} total={STEPS.length} title="Which patient are you helping?">
            Pick an existing patient, or register a new one first.
          </StepHeader>
          {patients.length ? (
            <ul className="space-y-2">
              {patients.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      startSession(option.id)
                    }}
                    className="group flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-3 text-left shadow-xs transition-colors hover:border-care-300 hover:bg-care-50"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[13px] font-bold text-ink-600 transition-colors group-hover:bg-care-100 group-hover:text-care-800"
                    >
                      {option.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">{option.name}</span>
                      <span className="block truncate text-sm text-ink-500">
                        {option.age} years · {option.village} · {option.mainIssue}
                      </span>
                    </span>
                    <Icon
                      name="chevronRight"
                      size={18}
                      className="shrink-0 text-ink-300 transition-colors group-hover:text-care-600"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="users" title="No patients assigned to this account" />
          )}
          <div className="mt-4">
            <LinkButton to="/asha/patients">Register a new patient</LinkButton>
          </div>
        </Card>
      ) : null}

      {step === 1 && patient ? (
        <Card>
          <StepHeader step={2} total={STEPS.length} title={`Basic screening - ${patient.name}`}>
            Enter whatever was measured. Leave the rest blank.
          </StepHeader>
          <FieldRow>
            <Field label="BP systolic (mmHg)">
              {({ id }) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={bpSys}
                  onChange={(event) => {
                    setBpSys(event.target.value)
                  }}
                  placeholder="e.g. 148"
                />
              )}
            </Field>
            <Field label="BP diastolic (mmHg)">
              {({ id }) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={bpDia}
                  onChange={(event) => {
                    setBpDia(event.target.value)
                  }}
                  placeholder="e.g. 92"
                />
              )}
            </Field>
            <Field label="Blood sugar (mg/dL)">
              {({ id }) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={sugar}
                  onChange={(event) => {
                    setSugar(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label="Temperature (°F)">
              {({ id }) => (
                <TextInput
                  id={id}
                  inputMode="decimal"
                  value={temp}
                  onChange={(event) => {
                    setTemp(event.target.value)
                  }}
                />
              )}
            </Field>
            <Field label="SpO2 (%)">
              {({ id }) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={spo2}
                  onChange={(event) => {
                    setSpo2(event.target.value)
                  }}
                />
              )}
            </Field>
          </FieldRow>
          <Field label="Notes">
            {({ id }) => (
              <TextArea
                id={id}
                value={screeningNotes}
                onChange={(event) => {
                  setScreeningNotes(event.target.value)
                }}
                placeholder="What the patient said, what you observed"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              tone="primary"
              size="lg"
              onClick={() => {
                const id = store.addScreening({
                  patientId: patient.id,
                  byAshaId: user.ashaId ?? 'asha_sunita',
                  bpSystolic: bpSys ? Number(bpSys) : undefined,
                  bpDiastolic: bpDia ? Number(bpDia) : undefined,
                  bloodSugar: sugar ? Number(sugar) : undefined,
                  temperatureF: temp ? Number(temp) : undefined,
                  spo2: spo2 ? Number(spo2) : undefined,
                  notes: screeningNotes || 'Assisted screening at kiosk (demo).',
                })
                setScreeningId(id)
                if (sessionId) store.updateAssistedSession(sessionId, { step: 2, screeningId: id })
                setStep(2)
                toast.show({ tone: 'ok', title: 'Screening saved to the patient record' })
              }}
            >
              Save screening &amp; continue
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setStep(2)
              }}
            >
              Skip screening
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 && patient ? (
        <div className="space-y-4">
          <Card>
            <StepHeader step={3} total={STEPS.length} title="AI assistance">
              The assistant gives possible causes and a risk level. It never gives a diagnosis or a
              medicine.
            </StepHeader>
            <Field label="What is the problem?" required>
              {({ id }) => (
                <TextArea
                  id={id}
                  value={complaint}
                  onChange={(event) => {
                    setComplaint(event.target.value)
                  }}
                  placeholder="e.g. Bukhar aur khansi 3 din se"
                />
              )}
            </Field>
            <FieldRow>
              <Field label="Since how many days?">
                {({ id }) => (
                  <TextInput
                    id={id}
                    inputMode="numeric"
                    value={duration}
                    onChange={(event) => {
                      setDuration(event.target.value)
                    }}
                  />
                )}
              </Field>
              <Field label="How severe?">
                {({ id }) => (
                  <Select
                    id={id}
                    value={severity}
                    onChange={(event) => {
                      setSeverity(event.target.value)
                    }}
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Very severe</option>
                  </Select>
                )}
              </Field>
            </FieldRow>
            <Field
              label="Any warning signs?"
              hint="Breathing difficulty, chest pain, unconsciousness, fits, heavy bleeding. Type 'no' if none."
            >
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={redFlagText}
                  onChange={(event) => {
                    setRedFlagText(event.target.value)
                  }}
                />
              )}
            </Field>
            <Button
              tone="primary"
              size="lg"
              disabled={!complaint.trim()}
              onClick={() => {
                const session: SymptomSession = {
                  symptomKeys: detectSymptoms(`${complaint} ${redFlagText}`),
                  rawInputs: [complaint],
                  answers: {
                    duration,
                    severity,
                    age: String(patient.age),
                    conditions: patient.conditions.join(', ') || 'none recorded',
                    redflags: redFlagText,
                  },
                  asked: ['duration', 'severity', 'redflags'],
                  redFlags: detectRedFlags(redFlagText),
                  complete: true,
                }
                setTriage(buildTriage(session, patient))
                setReferralReason(complaint)
                setFollowUpReason(`Review after assisted consultation: ${complaint.slice(0, 60)}`)
              }}
            >
              Get possible causes &amp; risk level
            </Button>
          </Card>

          {triage ? (
            <>
              <ul>
                <TriageCard result={triage} />
              </ul>
              {suggestion ? (
                <Callout tone="info" icon="compass" title="Suggested care level (decision support)">
                  <strong>{suggestion.label}</strong> · urgency {suggestion.urgency}.{' '}
                  {suggestion.rationale.join('; ')}. The health worker and doctor decide - this is
                  only a suggestion.
                </Callout>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  tone="primary"
                  size="lg"
                  onClick={() => {
                    setStep(3)
                  }}
                >
                  Continue to doctor
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {step === 3 && patient ? (
        <Card>
          <StepHeader step={4} total={STEPS.length} title="Connect to a doctor">
            Doctors marked available for teleconsultation in the demo data.
          </StepHeader>
          {doctors.length ? (
            <ul className="space-y-3">
              {doctors.slice(0, 3).map(({ doctor, facility }) => (
                <DoctorCard key={doctor.id} doctor={doctor} facility={facility} compact />
              ))}
            </ul>
          ) : (
            <EmptyState icon="doctor" title="No doctor available for teleconsultation right now" />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              tone="primary"
              size="lg"
              onClick={() => {
                setStep(4)
              }}
            >
              Continue to referral
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setStep(5)
              }}
            >
              No referral needed
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 4 && patient ? (
        <Card>
          <StepHeader step={5} total={STEPS.length} title="Create a referral">
            The patient record, screening and reason travel with the referral.
          </StepHeader>
          <Field label="Refer to" required>
            {({ id }) => (
              <Select
                id={id}
                value={referralFacility}
                onChange={(event) => {
                  setReferralFacility(event.target.value)
                }}
              >
                <option value="">Choose a facility</option>
                {store.facilities
                  .filter((f) => f.type !== 'pharmacy' && f.type !== 'kiosk')
                  .map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name} ({facility.distanceKm} km)
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field label="Reason for referral" required>
            {({ id }) => (
              <TextArea
                id={id}
                value={referralReason}
                onChange={(event) => {
                  setReferralReason(event.target.value)
                }}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              tone="primary"
              size="lg"
              disabled={!referralFacility || !referralReason.trim()}
              onClick={() => {
                const id = store.createReferral({
                  patientId: patient.id,
                  fromAshaId: user.ashaId,
                  fromFacilityId: kiosk?.id ?? 'f_phc_kalyanpur',
                  toFacilityId: referralFacility,
                  reason: referralReason,
                  symptoms: complaint || patient.mainIssue,
                  notes: screeningNotes || 'Created from assisted healthcare mode (demo).',
                  urgency:
                    triage?.riskLevel === 'high'
                      ? 'emergency'
                      : triage?.riskLevel === 'medium'
                        ? 'urgent'
                        : 'routine',
                  transportRequired: triage?.riskLevel !== 'low',
                  recommendedFacilityType: suggestion?.level ?? 'chc',
                  attachments: {
                    consultationIds: [],
                    prescriptionIds: [],
                    labReportIds: [],
                  },
                })
                setReferralId(id)
                if (sessionId) store.updateAssistedSession(sessionId, { step: 4, referralId: id })
                setStep(5)
                toast.show({
                  tone: 'ok',
                  title: 'Referral created',
                  body: 'The receiving facility and the ASHA worker have been notified in the prototype.',
                })
              }}
            >
              Create referral &amp; continue
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setStep(5)
              }}
            >
              Skip
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 5 && patient ? (
        <div className="space-y-4">
          <Card>
            <StepHeader step={6} total={STEPS.length} title="Schedule a follow-up">
              Both the patient and the ASHA worker get the reminder.
            </StepHeader>
            <FieldRow>
              <Field label="Follow-up after (days)">
                {({ id }) => (
                  <Select
                    id={id}
                    value={followUpDays}
                    onChange={(event) => {
                      setFollowUpDays(event.target.value)
                    }}
                  >
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </Select>
                )}
              </Field>
              <Field label="Reason">
                {({ id }) => (
                  <TextInput
                    id={id}
                    value={followUpReason}
                    onChange={(event) => {
                      setFollowUpReason(event.target.value)
                    }}
                  />
                )}
              </Field>
            </FieldRow>
            <Button
              tone="primary"
              size="lg"
              disabled={followUpDone}
              icon={<Icon name={followUpDone ? 'checkCircle' : 'calendarCheck'} size={16} />}
              onClick={() => {
                store.createFollowUp({
                  patientId: patient.id,
                  ashaId: user.ashaId,
                  program: 'general',
                  afterDays: Number(followUpDays),
                  reason: followUpReason || 'Assisted consultation follow-up',
                  relatedReferralId: referralId,
                })
                setFollowUpDone(true)
                if (sessionId) store.updateAssistedSession(sessionId, { step: 5, status: 'completed' })
                toast.show({ tone: 'ok', title: `Follow-up set for ${followUpDays} days` })
              }}
            >
              {followUpDone ? 'Follow-up set' : 'Set follow-up'}
            </Button>
          </Card>

          <Card tone="ok">
            <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Session summary</h2>
            <ul className="mt-2 space-y-1 text-[15px] text-ink-900">
              <li>Patient: {patient.name} ({patient.age} years, {patient.village})</li>
              <li>Screening: {screeningId ? 'saved to record' : 'skipped'}</li>
              <li>
                AI assistance: {triage ? `${triage.riskLevel.toUpperCase()} risk band` : 'not used'}
              </li>
              <li>
                Referral:{' '}
                {referralId
                  ? store.facilities.find(
                      (f) => f.id === store.referrals.find((r) => r.id === referralId)?.toFacilityId,
                    )?.name
                  : 'none created'}
              </li>
              <li>Follow-up: {followUpDone ? `in ${followUpDays} days` : 'not set'}</li>
              <li>Recorded on {formatDate(new Date().toISOString())}</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                tone="primary"
                onClick={() => {
                  navigate(user.role === 'asha' ? '/asha' : '/')
                }}
              >
                Finish
              </Button>
              <Button
                onClick={() => {
                  setStep(0)
                  setPatientId('')
                  setTriage(undefined)
                  setScreeningId(undefined)
                  setReferralId(undefined)
                  setFollowUpDone(false)
                  setComplaint('')
                }}
              >
                Start another patient
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
