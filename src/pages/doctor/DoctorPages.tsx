import { Link } from 'react-router-dom'
import { Badge, RiskBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, SectionHeading, StatTile } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/States'
import { TableWrap, Td, Th, Tr } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { ReferralCard, REFERRAL_STATUS_LABEL } from '@/components/cards/CareCards'
import { useAppStore } from '@/store/useAppStore'
import { bucketFollowUp, currentUser } from '@/store/selectors'
import { authorisedPatients } from '@/services/permissions'
import { DECISION_SUPPORT_DISCLAIMER, followUpRisks } from '@/services/ai/decisionSupport'
import { formatDate, formatDateTime } from '@/lib/utils'

// ---------------------------------------------------------------------------
// My patients
// ---------------------------------------------------------------------------

export function DoctorDashboardPage() {
  const store = useAppStore()
  const user = currentUser(store)
  const patients = authorisedPatients(store, user)
  const myConsultations = store.consultations.filter((c) => c.doctorId === user.doctorId)
  const pendingNotes = myConsultations.filter((c) =>
    c.assessment.startsWith('Simulated teleconsultation'),
  )
  const incoming = store.referrals.filter(
    (r) =>
      (r.toDoctorId === user.doctorId || r.toFacilityId === user.facilityId) &&
      r.status !== 'completed' &&
      r.status !== 'cancelled',
  )
  const emergencies = store.emergencyRequests.filter(
    (e) =>
      (e.destinationFacilityId === user.facilityId || e.assignedDoctorId === user.doctorId) &&
      !['completed', 'no_ambulance'].includes(e.status),
  )
  const risks = followUpRisks(store).filter((r) => r.followUp.doctorId === user.doctorId)

  return (
    <div className="space-y-4">
      <SectionHeading sub={user.subtitle}>Doctor dashboard</SectionHeading>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Authorised patients" value={patients.length} />
        <StatTile label="Consultations by me" value={myConsultations.length} />
        <StatTile
          label="Incoming referrals"
          value={incoming.length}
          tone={incoming.length ? 'info' : 'default'}
        />
        <StatTile
          label="Emergency cases"
          value={emergencies.length}
          tone={emergencies.length ? 'danger' : 'default'}
        />
      </div>

      {pendingNotes.length ? (
        <Callout tone="warn" icon="📝" title={`${pendingNotes.length} consultation(s) need your notes`}>
          A simulated teleconsultation was recorded. Open the patient to add your assessment,
          prescription, referral or follow-up.
        </Callout>
      ) : null}

      {risks.length ? (
        <Callout tone="info" icon="🧭" title="Follow-up risk (decision support)">
          {risks
            .slice(0, 3)
            .map((risk) => `${risk.patient?.name ?? 'Patient'} - ${risk.reason}`)
            .join(' · ')}
          . {DECISION_SUPPORT_DISCLAIMER}
        </Callout>
      ) : null}

      <Card>
        <SectionHeading
          sub="You see a patient only while you are treating them, and only what their consent allows."
        >
          My patients
        </SectionHeading>
        {patients.length ? (
          <TableWrap caption="Patients this doctor is authorised to view">
            <thead>
              <Tr>
                <Th>Patient</Th>
                <Th>Age</Th>
                <Th>Main issue</Th>
                <Th>Last visit</Th>
                <Th>Open items</Th>
                <Th>Action</Th>
              </Tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const openReferral = store.referrals.find(
                  (r) =>
                    r.patientId === patient.id &&
                    r.status !== 'completed' &&
                    r.status !== 'cancelled',
                )
                const overdue = store.followUps.filter(
                  (f) => f.patientId === patient.id && bucketFollowUp(f) === 'overdue',
                ).length
                return (
                  <Tr key={patient.id}>
                    <Td>
                      <span className="font-medium text-ink-900">{patient.name}</span>
                      <span className="block text-xs text-ink-500">{patient.village}</span>
                    </Td>
                    <Td>{patient.age}</Td>
                    <Td className="max-w-64">{patient.mainIssue}</Td>
                    <Td>{formatDate(patient.lastVisit)}</Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {openReferral ? (
                          <Badge tone="info">
                            Referral: {REFERRAL_STATUS_LABEL[openReferral.status]}
                          </Badge>
                        ) : null}
                        {overdue ? <Badge tone="danger">{overdue} overdue follow-up</Badge> : null}
                        {!openReferral && !overdue ? (
                          <span className="text-xs text-ink-500">None</span>
                        ) : null}
                      </span>
                    </Td>
                    <Td>
                      <LinkButton to={`/doctor/patient/${patient.id}`} tone="primary" size="sm">
                        Open
                      </LinkButton>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState
            icon="🧑‍⚕️"
            title="No authorised patients"
            body="A patient appears here once you consult them, or once they are referred to your facility."
          />
        )}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Emergency cases
// ---------------------------------------------------------------------------

export function DoctorEmergenciesPage() {
  const store = useAppStore()
  const user = currentUser(store)
  const cases = store.emergencyRequests
    .filter(
      (e) => e.destinationFacilityId === user.facilityId || e.assignedDoctorId === user.doctorId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="space-y-4">
      <SectionHeading sub="Cases heading to your facility, with the patient summary that arrived with the alert.">
        Emergency cases
      </SectionHeading>

      {cases.length ? (
        <ul className="space-y-3">
          {cases.map((request) => (
            <Card
              as="li"
              key={request.id}
              className="list-none"
              tone={['completed'].includes(request.status) ? 'default' : 'danger'}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-ink-900">
                    {request.patientName}, {request.patientAge}
                  </h3>
                  <p className="text-sm text-ink-500">
                    {request.village} · raised {formatDateTime(request.createdAt)}
                  </p>
                  <p className="mt-1 text-[15px] text-ink-900">{request.symptoms}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <RiskBadge level={request.riskLevel} />
                  <Badge tone="info">{request.status.replace(/_/g, ' ')}</Badge>
                  {request.etaMin ? <Badge tone="warn">ETA {request.etaMin} min</Badge> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkButton to={`/doctor/patient/${request.patientId}`} tone="primary">
                  Open patient record
                </LinkButton>
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="🚑"
          title="No emergency cases"
          body="An emergency request raised by a patient or ASHA worker appears here once your facility is the destination."
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Referrals (both directions)
// ---------------------------------------------------------------------------

export function DoctorReferralsPage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const doctor = store.doctors.find((d) => d.id === user.doctorId)

  const incoming = store.referrals.filter(
    (r) => r.toDoctorId === user.doctorId || r.toFacilityId === user.facilityId,
  )
  const outgoing = store.referrals.filter((r) => r.fromDoctorId === user.doctorId)

  const advance = (referralId: string, status: Parameters<typeof store.advanceReferral>[1]) => {
    store.advanceReferral(
      referralId,
      status,
      `${doctor?.name ?? 'Doctor'} (${store.facilities.find((f) => f.id === user.facilityId)?.name ?? 'facility'})`,
      'Updated from the doctor dashboard (demo).',
    )
    toast.show({ tone: 'ok', title: `Referral marked ${status.replace(/_/g, ' ')}` })
  }

  return (
    <div className="space-y-5">
      <SectionHeading sub="Referrals sent to you, and referrals you have created.">
        Referrals
      </SectionHeading>

      <section aria-labelledby="in-ref">
        <SectionHeading id="in-ref" sub={`${incoming.length} referral(s)`}>
          Incoming
        </SectionHeading>
        {incoming.length ? (
          <ul className="space-y-3">
            {incoming.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                patientLabel={store.patients.find((p) => p.id === referral.patientId)?.name}
                showTimeline
                actions={
                  <>
                    <LinkButton to={`/doctor/patient/${referral.patientId}`} tone="primary">
                      Open patient record
                    </LinkButton>
                    {referral.status === 'created' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'accepted')
                        }}
                      >
                        Accept referral
                      </Button>
                    ) : null}
                    {referral.status === 'accepted' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'patient_reached')
                        }}
                      >
                        Mark patient reached
                      </Button>
                    ) : null}
                    {referral.status === 'patient_reached' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'consultation')
                        }}
                      >
                        Start consultation
                      </Button>
                    ) : null}
                    {referral.status === 'consultation' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'treatment')
                        }}
                      >
                        Start treatment
                      </Button>
                    ) : null}
                    {referral.status === 'treatment' ? (
                      <Button
                        tone="primary"
                        onClick={() => {
                          advance(referral.id, 'completed')
                        }}
                      >
                        Mark completed
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon="🔁" title="No incoming referrals" />
        )}
      </section>

      <section aria-labelledby="out-ref">
        <SectionHeading id="out-ref" sub={`${outgoing.length} referral(s)`}>
          Created by me
        </SectionHeading>
        {outgoing.length ? (
          <ul className="space-y-3">
            {outgoing.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                patientLabel={store.patients.find((p) => p.id === referral.patientId)?.name}
                showTimeline
                actions={
                  <Link
                    to={`/doctor/patient/${referral.patientId}`}
                    className="inline-flex min-h-11 items-center rounded-card border border-hairline bg-white px-4 text-sm font-medium hover:bg-care-50"
                  >
                    Open patient record
                  </Link>
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon="🔁" title="You have not created any referral yet" />
        )}
      </section>
    </div>
  )
}
