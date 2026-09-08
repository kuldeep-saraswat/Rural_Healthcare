import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { DoseFrequency, DoseTiming, RiskLevel } from '@/types'
import { PatientRecordView } from '@/components/record/PatientRecordView'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Callout, SafetyNote } from '@/components/ui/Callout'
import { Field, FieldRow, Select, TextArea, TextInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { canViewSection, hasCareRelationship } from '@/services/permissions'
import { FREQUENCY_LABEL, TIMING_LABEL, defaultTimesFor } from '@/services/medications'
import { suggestCareLevel } from '@/services/ai/decisionSupport'
import { newId } from '@/lib/utils'

interface DraftItem {
  key: string
  medicineName: string
  dose: string
  frequency: DoseFrequency
  timing: DoseTiming
  durationDays: string
  times: string[]
  instructions: string
}

const emptyItem = (): DraftItem => ({
  key: newId('draft'),
  medicineName: '',
  dose: '',
  frequency: 'od',
  timing: 'after_food',
  durationDays: '5',
  times: defaultTimesFor('od'),
  instructions: '',
})

/**
 * The doctor's consultation workspace.
 *
 * This is where the connected workflows start: a prescription written here
 * creates the patient's medicine reminders, a referral here reaches the
 * receiving facility and the ASHA worker, and a follow-up here reminds both
 * the patient and the ASHA worker.
 */
export function DoctorPatientPage() {
  const { patientId } = useParams()
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = store.patients.find((p) => p.id === patientId)
  const doctor = store.doctors.find((d) => d.id === user.doctorId)

  const [tab, setTab] = useState('notes')

  // Consultation notes
  const [symptoms, setSymptoms] = useState('')
  const [assessment, setAssessment] = useState('')
  const [observations, setObservations] = useState('')
  const [tests, setTests] = useState('')
  const [risk, setRisk] = useState<RiskLevel>('low')
  const [emergency, setEmergency] = useState(false)
  const [consultationId, setConsultationId] = useState<string | undefined>(undefined)

  // Prescription
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [advice, setAdvice] = useState('')

  // Referral
  const [toFacility, setToFacility] = useState('')
  const [referralReason, setReferralReason] = useState('')
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent')
  const [transport, setTransport] = useState(true)

  // Follow-up
  const [followUpDays, setFollowUpDays] = useState('7')
  const [followUpProgram, setFollowUpProgram] = useState('chronic')
  const [followUpReason, setFollowUpReason] = useState('')

  if (!patient) {
    return (
      <EmptyState
        icon="🧑‍⚕️"
        title="Patient not found"
        body="This patient id does not exist in the demo data."
        action={
          <LinkButton to="/doctor" tone="primary">
            Back to my patients
          </LinkButton>
        }
      />
    )
  }

  if (!hasCareRelationship(store, user, patient)) {
    return (
      <div className="space-y-4">
        <SectionHeading>Access restricted</SectionHeading>
        <Callout tone="warn" icon="🔒" title="No care relationship with this patient">
          In this prototype a doctor can open a record only while treating the patient, or when the
          patient has been referred to their facility. This is the role-based access model working
          as intended.
        </Callout>
        <LinkButton to="/doctor" tone="primary">
          Back to my patients
        </LinkButton>
      </div>
    )
  }

  const consentBlocked = !canViewSection(store, user, patient, 'doctorNotes').allowed
  const suggestion = suggestCareLevel({ riskLevel: risk, age: patient.age })

  const saveConsultation = () => {
    if (!doctor) return
    const id = store.createConsultation({
      patientId: patient.id,
      doctorId: doctor.id,
      symptoms: symptoms || patient.mainIssue,
      assessment,
      observations,
      testsAdvised: tests
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      riskLevel: risk,
      emergency,
      mode: 'in_person',
    })
    setConsultationId(id)
    toast.show({
      tone: 'ok',
      title: 'Consultation notes saved',
      body: 'The patient can see this in their health record.',
    })
  }

  const savePrescription = () => {
    if (!doctor) return
    const valid = items.filter((item) => item.medicineName.trim() && item.dose.trim())
    if (!valid.length) {
      toast.show({
        tone: 'warn',
        title: 'Add at least one medicine with a dose',
        body: 'The app never fills in a dose by itself.',
      })
      return
    }
    store.createPrescription({
      patientId: patient.id,
      doctorId: doctor.id,
      consultationId,
      advice,
      items: valid.map((item) => ({
        medicineName: item.medicineName.trim(),
        dose: item.dose.trim(),
        frequency: item.frequency,
        timing: item.timing,
        durationDays: Number(item.durationDays) || 1,
        times: item.times,
        instructions: item.instructions.trim() || undefined,
      })),
    })
    setItems([emptyItem()])
    setAdvice('')
    toast.show({
      tone: 'ok',
      title: 'Prescription saved and reminders created',
      body: 'The patient now has a medicine schedule built from exactly what you entered.',
    })
  }

  return (
    <div className="space-y-4">
      <SectionHeading sub={`${patient.age} years · ${patient.village} · ${patient.mainIssue}`}>
        {patient.name}
      </SectionHeading>

      {consentBlocked ? (
        <Callout tone="warn" icon="🔒" title="Limited access">
          This patient has withdrawn consent for sharing clinical notes with doctors. You can still
          record your own consultation.
        </Callout>
      ) : null}

      <Tabs
        ariaLabel="Doctor workspace"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'notes', label: 'Consultation notes' },
          { id: 'prescription', label: 'Prescription' },
          { id: 'referral', label: 'Referral' },
          { id: 'followup', label: 'Follow-up' },
          { id: 'record', label: 'Full record' },
        ]}
      />

      <TabPanel id="notes" active={tab}>
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Consultation notes</h2>
          <p className="mt-1 mb-3 text-sm text-ink-500">
            Everything you write here travels with any referral you create.
          </p>
          <Field label="Symptoms" required>
            {({ id }) => (
              <TextArea
                id={id}
                value={symptoms}
                onChange={(event) => {
                  setSymptoms(event.target.value)
                }}
                placeholder={patient.mainIssue}
              />
            )}
          </Field>
          <Field
            label="Preliminary assessment"
            hint="Write a possible cause or a working impression - the app never generates this for you."
          >
            {({ id, describedBy }) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                value={assessment}
                onChange={(event) => {
                  setAssessment(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label="Important observations">
            {({ id }) => (
              <TextArea
                id={id}
                value={observations}
                onChange={(event) => {
                  setObservations(event.target.value)
                }}
                placeholder="BP, pulse, examination findings"
              />
            )}
          </Field>
          <FieldRow>
            <Field label="Tests advised" hint="Comma separated">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={tests}
                  onChange={(event) => {
                    setTests(event.target.value)
                  }}
                  placeholder="ECG, Lipid Profile"
                />
              )}
            </Field>
            <Field label="Risk level">
              {({ id }) => (
                <Select
                  id={id}
                  value={risk}
                  onChange={(event) => {
                    setRisk(event.target.value as RiskLevel)
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              )}
            </Field>
          </FieldRow>
          <label className="mb-3 flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(event) => {
                setEmergency(event.target.checked)
              }}
              className="h-5 w-5 accent-[var(--color-sos-600)]"
            />
            Mark as an emergency case
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button tone="primary" size="lg" onClick={saveConsultation}>
              Save consultation notes
            </Button>
            {consultationId ? <Badge tone="ok">Saved to the patient record</Badge> : null}
          </div>
          <Callout tone="info" className="mt-3" icon="🧭" title="Suggested care level (decision support)">
            <strong>{suggestion.label}</strong> · urgency {suggestion.urgency}.{' '}
            {suggestion.rationale.join('; ')}. You decide - this is a suggestion from the demo data
            only.
          </Callout>
        </Card>
      </TabPanel>

      <TabPanel id="prescription" active={tab}>
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Prescription</h2>
          <p className="mt-1 mb-3 text-sm text-ink-500">
            The patient&apos;s medicine reminders are built from exactly these rows. The app never
            adds a medicine or changes a dose.
          </p>
          <ul className="space-y-4">
            {items.map((item, index) => (
              <li key={item.key} className="rounded-card border border-hairline p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-700">Medicine {index + 1}</span>
                  {items.length > 1 ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setItems((current) => current.filter((i) => i.key !== item.key))
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <FieldRow>
                  <Field label="Medicine name" required>
                    {({ id }) => (
                      <TextInput
                        id={id}
                        value={item.medicineName}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key ? { ...i, medicineName: event.target.value } : i,
                            ),
                          )
                        }}
                        placeholder="e.g. Paracetamol 500 mg"
                      />
                    )}
                  </Field>
                  <Field label="Dose" required hint="Exactly as you want the patient to take it.">
                    {({ id, describedBy }) => (
                      <TextInput
                        id={id}
                        aria-describedby={describedBy}
                        value={item.dose}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key ? { ...i, dose: event.target.value } : i,
                            ),
                          )
                        }}
                        placeholder="e.g. 1 tablet"
                      />
                    )}
                  </Field>
                  <Field label="Frequency">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={item.frequency}
                        onChange={(event) => {
                          const frequency = event.target.value as DoseFrequency
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key
                                ? { ...i, frequency, times: defaultTimesFor(frequency) }
                                : i,
                            ),
                          )
                        }}
                      >
                        {(Object.keys(FREQUENCY_LABEL) as DoseFrequency[]).map((key) => (
                          <option key={key} value={key}>
                            {FREQUENCY_LABEL[key]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="When">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={item.timing}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key
                                ? { ...i, timing: event.target.value as DoseTiming }
                                : i,
                            ),
                          )
                        }}
                      >
                        {(Object.keys(TIMING_LABEL) as DoseTiming[]).map((key) => (
                          <option key={key} value={key}>
                            {TIMING_LABEL[key]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Duration (days)">
                    {({ id }) => (
                      <TextInput
                        id={id}
                        inputMode="numeric"
                        value={item.durationDays}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key ? { ...i, durationDays: event.target.value } : i,
                            ),
                          )
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Reminder times" hint="Comma separated 24-hour times.">
                    {({ id, describedBy }) => (
                      <TextInput
                        id={id}
                        aria-describedby={describedBy}
                        value={item.times.join(', ')}
                        onChange={(event) => {
                          setItems((current) =>
                            current.map((i) =>
                              i.key === item.key
                                ? {
                                    ...i,
                                    times: event.target.value
                                      .split(',')
                                      .map((t) => t.trim())
                                      .filter(Boolean),
                                  }
                                : i,
                            ),
                          )
                        }}
                        placeholder="08:00, 14:00, 20:00"
                      />
                    )}
                  </Field>
                </FieldRow>
                <Field label="Instructions for the patient">
                  {({ id }) => (
                    <TextInput
                      id={id}
                      value={item.instructions}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((i) =>
                            i.key === item.key ? { ...i, instructions: event.target.value } : i,
                          ),
                        )
                      }}
                      placeholder="e.g. With a full glass of water"
                    />
                  )}
                </Field>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button
              onClick={() => {
                setItems((current) => [...current, emptyItem()])
              }}
              icon="＋"
            >
              Add another medicine
            </Button>
          </div>
          <div className="mt-4">
            <Field label="General advice">
              {({ id }) => (
                <TextArea
                  id={id}
                  value={advice}
                  onChange={(event) => {
                    setAdvice(event.target.value)
                  }}
                  placeholder="Diet, warning signs, when to return"
                />
              )}
            </Field>
          </div>
          <Button tone="primary" size="lg" onClick={savePrescription}>
            Save prescription &amp; create reminders
          </Button>
          <SafetyNote>
            RuralCare AI never determines a dose. Reminder times default from the frequency you pick
            and you can override them, but the dose text is stored and shown to the patient exactly
            as you type it.
          </SafetyNote>
        </Card>
      </TabPanel>

      <TabPanel id="referral" active={tab}>
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Create a digital referral</h2>
          <p className="mt-1 mb-3 text-sm text-ink-500">
            Patient details, symptoms, history, reports, prescriptions and your notes are attached
            automatically.
          </p>
          <FieldRow>
            <Field label="Refer to" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={toFacility}
                  onChange={(event) => {
                    setToFacility(event.target.value)
                  }}
                >
                  <option value="">Choose a facility</option>
                  {store.facilities
                    .filter((f) => f.id !== user.facilityId && f.type !== 'pharmacy')
                    .map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} ({facility.distanceKm} km)
                      </option>
                    ))}
                </Select>
              )}
            </Field>
            <Field label="Urgency">
              {({ id }) => (
                <Select
                  id={id}
                  value={urgency}
                  onChange={(event) => {
                    setUrgency(event.target.value as typeof urgency)
                  }}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </Select>
              )}
            </Field>
          </FieldRow>
          <Field label="Referral reason" required>
            {({ id }) => (
              <TextArea
                id={id}
                value={referralReason}
                onChange={(event) => {
                  setReferralReason(event.target.value)
                }}
                placeholder="Why the patient needs a higher centre"
              />
            )}
          </Field>
          <label className="mb-3 flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={transport}
              onChange={(event) => {
                setTransport(event.target.checked)
              }}
              className="h-5 w-5 accent-[var(--color-care-600)]"
            />
            Patient needs transport support
          </label>
          <div className="mb-3 rounded-card border border-hairline bg-canvas p-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Attached automatically</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                {store.consultations.filter((c) => c.patientId === patient.id).length} consultation
                note(s)
              </li>
              <li>
                {store.prescriptions.filter((p) => p.patientId === patient.id).length}{' '}
                prescription(s)
              </li>
              <li>{store.labReports.filter((r) => r.patientId === patient.id).length} lab report(s)</li>
              <li>Known conditions, allergies and current medicines</li>
            </ul>
          </div>
          <Button
            tone="primary"
            size="lg"
            disabled={!toFacility || !referralReason.trim()}
            onClick={() => {
              store.createReferral({
                patientId: patient.id,
                fromDoctorId: user.doctorId,
                fromFacilityId: user.facilityId ?? 'f_phc_kalyanpur',
                toFacilityId: toFacility,
                reason: referralReason,
                symptoms: symptoms || patient.mainIssue,
                notes: `${assessment} ${observations}`.trim() || 'See attached record.',
                urgency,
                transportRequired: transport,
                recommendedFacilityType:
                  store.facilities.find((f) => f.id === toFacility)?.type ?? 'chc',
                attachments: {
                  consultationIds: store.consultations
                    .filter((c) => c.patientId === patient.id)
                    .map((c) => c.id),
                  prescriptionIds: store.prescriptions
                    .filter((p) => p.patientId === patient.id)
                    .map((p) => p.id),
                  labReportIds: store.labReports
                    .filter((r) => r.patientId === patient.id)
                    .map((r) => r.id),
                },
              })
              setReferralReason('')
              setToFacility('')
              toast.show({
                tone: 'ok',
                title: 'Referral created',
                body: 'The receiving facility, the patient and the ASHA worker have all been notified in the prototype.',
              })
            }}
          >
            Create referral
          </Button>
        </Card>
      </TabPanel>

      <TabPanel id="followup" active={tab}>
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Set a follow-up</h2>
          <p className="mt-1 mb-3 text-sm text-ink-500">
            The patient gets a reminder, and so does their ASHA worker.
          </p>
          <FieldRow>
            <Field label="Follow-up after">
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
                  <option value="90">90 days</option>
                </Select>
              )}
            </Field>
            <Field label="Programme">
              {({ id }) => (
                <Select
                  id={id}
                  value={followUpProgram}
                  onChange={(event) => {
                    setFollowUpProgram(event.target.value)
                  }}
                >
                  <option value="diabetes">Diabetes</option>
                  <option value="hypertension">Hypertension</option>
                  <option value="tb">TB</option>
                  <option value="maternal">Maternal health</option>
                  <option value="child">Child health</option>
                  <option value="elderly">Elderly care</option>
                  <option value="chronic">Chronic disease</option>
                  <option value="general">General</option>
                </Select>
              )}
            </Field>
          </FieldRow>
          <Field label="Reason" required>
            {({ id }) => (
              <TextInput
                id={id}
                value={followUpReason}
                onChange={(event) => {
                  setFollowUpReason(event.target.value)
                }}
                placeholder="e.g. Review after echo report"
              />
            )}
          </Field>
          <Button
            tone="primary"
            size="lg"
            disabled={!followUpReason.trim()}
            onClick={() => {
              store.createFollowUp({
                patientId: patient.id,
                doctorId: user.doctorId,
                program: followUpProgram as 'chronic',
                afterDays: Number(followUpDays),
                reason: followUpReason,
                relatedConsultationId: consultationId,
              })
              setFollowUpReason('')
              toast.show({
                tone: 'ok',
                title: `Follow-up set for ${followUpDays} days`,
                body: 'Patient and ASHA worker notified in the prototype.',
              })
            }}
          >
            Set follow-up
          </Button>
        </Card>
      </TabPanel>

      <TabPanel id="record" active={tab}>
        <PatientRecordView patient={patient} viewer={user} showSummary />
      </TabPanel>
    </div>
  )
}
