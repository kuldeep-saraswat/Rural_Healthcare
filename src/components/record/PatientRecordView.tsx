import type { ReactNode } from 'react'
import { useState } from 'react'
import type { DemoUser, Patient } from '@/types'
import { Badge, RiskBadge } from '@/components/ui/Badge'
import { Card, KeyValue } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Timeline } from '@/components/ui/Timeline'
import { EmptyState } from '@/components/ui/States'
import { ReferralCard, FollowUpCard, REFERRAL_STATUS_LABEL } from '@/components/cards/CareCards'
import { summariseItem } from '@/services/medications'
import { canViewSection } from '@/services/permissions'
import type { RecordSection } from '@/services/permissions'
import { useAppStore } from '@/store/useAppStore'
import { summariseRecord, DECISION_SUPPORT_DISCLAIMER } from '@/services/ai/decisionSupport'
import { formatDate, formatDateTime } from '@/lib/utils'

/**
 * One record view, reused by the patient, the doctor and the ASHA worker.
 * Each section is gated by role + patient consent, and denied sections say so
 * out loud rather than quietly disappearing - that is the whole point of the
 * role-based access demo.
 */
export function PatientRecordView({
  patient,
  viewer,
  focusPrescriptionId,
  showSummary = false,
}: {
  patient: Patient
  viewer: DemoUser
  focusPrescriptionId?: string
  showSummary?: boolean
}) {
  const store = useAppStore()
  const [tab, setTab] = useState('overview')

  const can = (section: RecordSection) => canViewSection(store, viewer, patient, section)

  const consultations = store.consultations
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const prescriptions = store.prescriptions
    .filter((p) => p.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const reports = store.labReports
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const vaccinations = store.vaccinations.filter((v) => v.patientId === patient.id)
  const referrals = store.referrals
    .filter((r) => r.patientId === patient.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const followUps = store.followUps
    .filter((f) => f.patientId === patient.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const screenings = store.screenings
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const household = store.households.find((h) => h.id === patient.householdId)
  const summary = summariseRecord(store, patient.id)

  const identity = can('identity')
  if (!identity.allowed) {
    return (
      <Callout tone="warn" icon="🔒" title="Record not available to this account">
        {identity.reason}
      </Callout>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">{patient.name}</h2>
            <p className="text-sm text-ink-700">
              {patient.age} years · {patient.gender} · {patient.village}
              {household ? ` · household ${household.code}` : ''}
            </p>
            <p className="mt-1 text-[15px] text-ink-900">{patient.mainIssue}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone="info">Blood group {patient.bloodGroup}</Badge>
            {patient.lastVisit ? (
              <Badge tone="neutral">Last visit {formatDate(patient.lastVisit)}</Badge>
            ) : null}
            {patient.pendingSync ? <Badge tone="warn">Waiting to sync</Badge> : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <Gate access={can('contact')} label="Contact">
            <KeyValue label="Contact">{patient.phone}</KeyValue>
          </Gate>
          <Gate access={can('allergies')} label="Allergies">
            <KeyValue label="Allergies">
              {patient.allergies.length ? patient.allergies.join(', ') : 'None recorded'}
            </KeyValue>
          </Gate>
          <Gate access={can('conditions')} label="Conditions">
            <KeyValue label="Existing conditions">
              {patient.conditions.length ? patient.conditions.join('; ') : 'None recorded'}
            </KeyValue>
          </Gate>
          <Gate access={can('medicines')} label="Current medicines">
            <KeyValue label="Current medicines">
              {patient.currentMedicines.length
                ? patient.currentMedicines.join(', ')
                : 'None recorded'}
            </KeyValue>
          </Gate>
        </dl>
      </Card>

      {showSummary ? (
        <Card tone="info">
          <h3 className="text-lg font-semibold text-ink-900">
            AI record summary
            <span className="ml-2 align-middle text-xs font-normal text-ink-500">
              decision support only
            </span>
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-ink-900">
            {summary.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {summary.openIssues.length ? (
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-ink-700">Open issues</h4>
              <ul className="mt-1 space-y-1 text-sm text-ink-900">
                {summary.openIssues.map((issue) => (
                  <li key={issue} className="flex gap-2">
                    <span aria-hidden="true">⚠️</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-ink-500">
            Generated from {summary.generatedFrom}. {DECISION_SUPPORT_DISCLAIMER}
          </p>
        </Card>
      ) : null}

      <Tabs
        ariaLabel="Health record sections"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Care journey' },
          { id: 'consultations', label: 'Consultations', badge: consultations.length },
          { id: 'prescriptions', label: 'Prescriptions', badge: prescriptions.length },
          { id: 'reports', label: 'Lab reports', badge: reports.length },
          { id: 'vaccines', label: 'Vaccinations', badge: vaccinations.length },
          { id: 'referrals', label: 'Referrals', badge: referrals.length },
          { id: 'followups', label: 'Follow-ups', badge: followUps.length },
          { id: 'screenings', label: 'Screenings', badge: screenings.length },
        ]}
      />

      <TabPanel id="overview" active={tab}>
        <Card>
          <h3 className="text-lg font-semibold text-ink-900">Care journey</h3>
          <p className="mb-3 text-sm text-ink-500">
            Every step recorded across the PHC, the referral and the higher centre.
          </p>
          {consultations.length || referrals.length ? (
            <Timeline
              steps={buildJourney({ consultations, referrals, followUps })}
            />
          ) : (
            <EmptyState icon="🧭" title="No care history yet" />
          )}
        </Card>
      </TabPanel>

      <TabPanel id="consultations" active={tab}>
        <Gate access={can('consultations')} label="Consultations" block>
          {consultations.length ? (
            <ul className="space-y-3">
              {consultations.map((consultation) => (
                <Card as="li" key={consultation.id} className="list-none">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-ink-900">
                        {consultation.doctorName} · {consultation.facilityName}
                      </h4>
                      <p className="text-sm text-ink-500">
                        {formatDate(consultation.date)} · {consultation.mode.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RiskBadge level={consultation.riskLevel} />
                      {consultation.emergency ? <Badge tone="danger">Emergency</Badge> : null}
                    </div>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold text-ink-700">Symptoms</dt>
                      <dd className="text-ink-900">{consultation.symptoms}</dd>
                    </div>
                    <Gate access={can('doctorNotes')} label="Doctor notes">
                      <>
                        <div>
                          <dt className="font-semibold text-ink-700">Doctor assessment</dt>
                          <dd className="text-ink-900">{consultation.assessment}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-ink-700">Observations</dt>
                          <dd className="text-ink-900">{consultation.observations}</dd>
                        </div>
                      </>
                    </Gate>
                    {consultation.testsAdvised.length ? (
                      <div>
                        <dt className="font-semibold text-ink-700">Tests advised</dt>
                        <dd className="text-ink-900">{consultation.testsAdvised.join(', ')}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🩺" title="No consultations recorded" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="prescriptions" active={tab}>
        <Gate access={can('prescriptions')} label="Prescriptions" block>
          {prescriptions.length ? (
            <ul className="space-y-3">
              {prescriptions.map((prescription) => (
                <Card
                  as="li"
                  key={prescription.id}
                  className="list-none"
                  tone={prescription.id === focusPrescriptionId ? 'info' : 'default'}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-ink-900">{prescription.doctorName}</h4>
                      <p className="text-sm text-ink-500">{formatDate(prescription.date)}</p>
                    </div>
                    {prescription.id === focusPrescriptionId ? (
                      <Badge tone="info">Linked to your reminder</Badge>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {prescription.items.map((item) => (
                      <li key={item.id} className="rounded-card border border-hairline p-3">
                        <div className="font-semibold text-ink-900">{item.medicineName}</div>
                        <div className="text-sm text-ink-700">{summariseItem(item)}</div>
                        {item.instructions ? (
                          <div className="text-sm text-ink-500">{item.instructions}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {prescription.advice ? (
                    <p className="mt-3 text-sm text-ink-700">
                      <strong>Advice:</strong> {prescription.advice}
                    </p>
                  ) : null}
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="📝" title="No prescriptions recorded" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="reports" active={tab}>
        <Gate access={can('labReports')} label="Lab reports" block>
          {reports.length ? (
            <ul className="space-y-3">
              {reports.map((report) => (
                <Card as="li" key={report.id} className="list-none">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-ink-900">{report.testName}</h4>
                      <p className="text-sm text-ink-500">
                        {report.facilityName} · {formatDate(report.date)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-900">{report.summary}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {report.lines.map((line) => (
                      <li
                        key={line.label}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1 last:border-0"
                      >
                        <span className="text-ink-700">{line.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">{line.value}</span>
                          <span className="text-xs text-ink-500">ref {line.reference}</span>
                          {line.flag ? (
                            <Badge tone={line.flag === 'high' ? 'danger' : 'warn'}>
                              {line.flag === 'high' ? 'High' : 'Low'}
                            </Badge>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🔬" title="No lab reports recorded" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="vaccines" active={tab}>
        <Gate access={can('vaccinations')} label="Vaccinations" block>
          {vaccinations.length ? (
            <ul className="space-y-2">
              {vaccinations.map((record) => (
                <Card as="li" key={record.id} className="list-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-ink-900">{record.vaccineName}</span>{' '}
                      <span className="text-sm text-ink-700">dose {record.doseNumber}</span>
                      <div className="text-sm text-ink-500">
                        {record.status === 'given'
                          ? `Given ${formatDate(record.date)}${record.facilityName ? ` at ${record.facilityName}` : ''}`
                          : `Due ${formatDate(record.dueDate)}`}
                      </div>
                    </div>
                    <Badge
                      tone={
                        record.status === 'given'
                          ? 'ok'
                          : record.status === 'overdue'
                            ? 'danger'
                            : 'warn'
                      }
                    >
                      {record.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="💉" title="No vaccination records" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="referrals" active={tab}>
        <Gate access={can('referrals')} label="Referrals" block>
          {referrals.length ? (
            <ul className="space-y-3">
              {referrals.map((referral) => (
                <ReferralCard key={referral.id} referral={referral} showTimeline />
              ))}
            </ul>
          ) : (
            <EmptyState icon="🔁" title="No referrals recorded" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="followups" active={tab}>
        <Gate access={can('followUps')} label="Follow-ups" block>
          {followUps.length ? (
            <ul className="space-y-3">
              {followUps.map((followUp) => (
                <FollowUpCard key={followUp.id} followUp={followUp} />
              ))}
            </ul>
          ) : (
            <EmptyState icon="📅" title="No follow-ups recorded" />
          )}
        </Gate>
      </TabPanel>

      <TabPanel id="screenings" active={tab}>
        <Gate access={can('screenings')} label="Screenings" block>
          {screenings.length ? (
            <ul className="space-y-3">
              {screenings.map((screening) => (
                <Card as="li" key={screening.id} className="list-none">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-ink-900">
                        Screening on {formatDate(screening.date)}
                      </h4>
                      <p className="text-sm text-ink-500">
                        By {store.ashas.find((a) => a.id === screening.byAshaId)?.name ?? 'ASHA'}
                      </p>
                    </div>
                    <RiskBadge level={screening.riskLevel} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {screening.bpSystolic ? (
                      <KeyValue label="BP">
                        {screening.bpSystolic}/{screening.bpDiastolic} mmHg
                      </KeyValue>
                    ) : null}
                    {screening.bloodSugar ? (
                      <KeyValue label="Blood sugar">{screening.bloodSugar} mg/dL</KeyValue>
                    ) : null}
                    {screening.pulse ? <KeyValue label="Pulse">{screening.pulse}/min</KeyValue> : null}
                    {screening.spo2 ? <KeyValue label="SpO2">{screening.spo2}%</KeyValue> : null}
                    {screening.weightKg ? (
                      <KeyValue label="Weight">{screening.weightKg} kg</KeyValue>
                    ) : null}
                    {screening.temperatureF ? (
                      <KeyValue label="Temperature">{screening.temperatureF} °F</KeyValue>
                    ) : null}
                  </dl>
                  {screening.notes ? (
                    <p className="mt-2 text-sm text-ink-700">{screening.notes}</p>
                  ) : null}
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🩹" title="No screenings recorded" />
          )}
        </Gate>
      </TabPanel>
    </div>
  )
}

function Gate({
  access,
  label,
  children,
  block,
}: {
  access: { allowed: boolean; reason?: string }
  label: string
  children: ReactNode
  block?: boolean
}) {
  if (access.allowed) return <>{children}</>
  if (block) {
    return (
      <Callout tone="neutral" icon="🔒" title={`${label} hidden`}>
        {access.reason}
      </Callout>
    )
  }
  return (
    <div className="text-sm text-ink-500">
      <span className="font-semibold">{label}: </span>
      <span aria-hidden="true">🔒 </span>
      hidden ({access.reason})
    </div>
  )
}

function buildJourney({
  consultations,
  referrals,
  followUps,
}: {
  consultations: { id: string; date: string; doctorName: string; facilityName: string; assessment: string }[]
  referrals: {
    id: string
    createdAt: string
    status: string
    toFacilityId: string
    history: { status: string; at: string; by: string; note?: string }[]
  }[]
  followUps: { id: string; dueDate: string; reason: string; status: string }[]
}) {
  const events: {
    key: string
    label: string
    at: string
    by?: string
    note?: string
    sort: string
    state: 'done' | 'current' | 'todo' | 'blocked'
  }[] = []

  for (const consultation of consultations) {
    events.push({
      key: `c-${consultation.id}`,
      label: `Consultation at ${consultation.facilityName}`,
      at: formatDate(consultation.date),
      by: consultation.doctorName,
      note: consultation.assessment,
      sort: consultation.date,
      state: 'done',
    })
  }
  for (const referral of referrals) {
    for (const event of referral.history) {
      events.push({
        key: `r-${referral.id}-${event.status}-${event.at}`,
        label: `Referral: ${REFERRAL_STATUS_LABEL[event.status as keyof typeof REFERRAL_STATUS_LABEL] ?? event.status}`,
        at: formatDateTime(event.at),
        by: event.by,
        note: event.note,
        sort: event.at,
        state: 'done',
      })
    }
  }
  for (const followUp of followUps) {
    events.push({
      key: `f-${followUp.id}`,
      label: `Follow-up: ${followUp.reason}`,
      at: formatDate(followUp.dueDate),
      sort: followUp.dueDate,
      state: followUp.status === 'completed' ? 'done' : 'current',
    })
  }

  return events.sort((a, b) => a.sort.localeCompare(b.sort))
}
