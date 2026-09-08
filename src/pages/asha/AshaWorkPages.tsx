import { useEffect, useState } from 'react'
import { Badge, PendingSyncBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, SectionHeading, StatTile } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useDemoAction } from '@/components/DemoAction'
import { FollowUpCard, ReferralCard } from '@/components/cards/CareCards'
import { CampCard } from '@/components/cards/PublicHealthCards'
import { AlertCard } from '@/components/cards/PublicHealthCards'
import { FacilityCard } from '@/components/cards/FacilityCards'
import { isEffectivelyOffline, useAppStore } from '@/store/useAppStore'
import { setOfflineSimulation } from '@/services/connectivity'
import { readEssential, storageBackendName } from '@/services/offline/db'
import { bucketFollowUp, currentUser, upcomingCamps } from '@/store/selectors'
import { formatDate, formatDateTime } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Referrals - including the drop-off prevention workflow
// ---------------------------------------------------------------------------

export function AshaReferralsPage() {
  const toast = useToast()
  const demo = useDemoAction()
  const store = useAppStore()
  const user = currentUser(store)
  const asha = store.ashas.find((a) => a.id === user.ashaId)
  const myPatients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const referrals = store.referrals
    .filter((r) => myPatients.some((p) => p.id === r.patientId))
    .sort((a, b) => Number(b.dropOffFlagged) - Number(a.dropOffFlagged))

  const dropOffs = referrals.filter((r) => r.dropOffFlagged && r.status !== 'completed')

  return (
    <div className="space-y-4">
      <SectionHeading sub="Track every referred patient until they actually reach the facility.">
        Referrals
      </SectionHeading>

      {dropOffs.length ? (
        <Callout tone="warn" icon="⚠️" title="Referral follow-up required">
          {dropOffs.length} patient(s) have not reached the facility by the expected date. Contact
          the family, arrange transport, mark them reached, or escalate.
        </Callout>
      ) : null}

      {referrals.length ? (
        <ul className="space-y-3">
          {referrals.map((referral) => {
            const patient = store.patients.find((p) => p.id === referral.patientId)
            const facility = store.facilities.find((f) => f.id === referral.toFacilityId)
            return (
              <ReferralCard
                key={referral.id}
                referral={referral}
                patientLabel={patient?.name}
                showTimeline
                actions={
                  <>
                    {patient ? (
                      <Button
                        icon="📞"
                        onClick={() => {
                          demo.call(patient.name, patient.phone)
                          store.recordReferralContact(
                            referral.id,
                            asha?.name ?? 'ASHA',
                            'call',
                            'Called the family (demo).',
                          )
                        }}
                      >
                        Call patient
                      </Button>
                    ) : null}
                    {patient ? (
                      <Button
                        icon="💬"
                        onClick={() => {
                          demo.message(patient.name, patient.phone)
                          store.recordReferralContact(
                            referral.id,
                            asha?.name ?? 'ASHA',
                            'message',
                            'Sent a reminder message (demo).',
                          )
                        }}
                      >
                        Message patient
                      </Button>
                    ) : null}
                    {facility ? (
                      <Button
                        icon="🏥"
                        onClick={() => {
                          demo.call(facility.name, facility.phone)
                        }}
                      >
                        Contact facility
                      </Button>
                    ) : null}
                    {referral.status === 'created' || referral.status === 'accepted' ? (
                      <Button
                        tone="primary"
                        onClick={() => {
                          store.advanceReferral(
                            referral.id,
                            'patient_reached',
                            asha?.name ?? 'ASHA worker',
                            'ASHA confirmed the patient reached the facility.',
                          )
                          toast.show({ tone: 'ok', title: 'Marked as patient reached' })
                        }}
                      >
                        Mark patient reached
                      </Button>
                    ) : null}
                    {!referral.escalated && referral.dropOffFlagged ? (
                      <Button
                        tone="danger"
                        onClick={() => {
                          store.escalateReferral(referral.id, asha?.name ?? 'ASHA worker')
                          toast.show({
                            tone: 'warn',
                            title: 'Escalated to the PHC medical officer (demo)',
                          })
                        }}
                      >
                        Escalate
                      </Button>
                    ) : null}
                    {referral.escalated ? <Badge tone="danger">Escalated</Badge> : null}
                  </>
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="🔁" title="No referrals for your patients" />
      )}

      {referrals.some((r) => r.contactAttempts.length) ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Contact log</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {referrals.flatMap((referral) =>
              referral.contactAttempts.map((attempt, index) => (
                <li key={`${referral.id}-${index}`}>
                  {formatDateTime(attempt.at)} · {attempt.method} ·{' '}
                  {store.patients.find((p) => p.id === referral.patientId)?.name} · {attempt.outcome}
                </li>
              )),
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export function AshaFollowUpsPage() {
  const toast = useToast()
  const demo = useDemoAction()
  const store = useAppStore()
  const user = currentUser(store)
  const [tab, setTab] = useState('overdue')
  const [addFor, setAddFor] = useState<string | null>(null)

  const mine = store.followUps.filter((f) => f.ashaId === user.ashaId)
  const buckets = {
    overdue: mine.filter((f) => bucketFollowUp(f) === 'overdue'),
    today: mine.filter((f) => bucketFollowUp(f) === 'today'),
    upcoming: mine.filter((f) => bucketFollowUp(f) === 'upcoming'),
    completed: mine.filter((f) => f.status === 'completed'),
  }
  const visible = buckets[tab as keyof typeof buckets]

  return (
    <div className="space-y-4">
      <SectionHeading
        sub="Diabetes, hypertension, TB, maternal, child, elderly and chronic disease programmes."
        right={
          <Button
            tone="primary"
            onClick={() => {
              setAddFor('new')
            }}
          >
            + Add follow-up
          </Button>
        }
      >
        Follow-ups
      </SectionHeading>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label="Overdue"
          value={`🔴 ${buckets.overdue.length}`}
          tone={buckets.overdue.length ? 'danger' : 'default'}
        />
        <StatTile
          label="Due today"
          value={`🟡 ${buckets.today.length}`}
          tone={buckets.today.length ? 'warn' : 'default'}
        />
        <StatTile label="Upcoming" value={buckets.upcoming.length} tone="info" />
        <StatTile label="Completed" value={`🟢 ${buckets.completed.length}`} tone="ok" />
      </div>

      <Tabs
        ariaLabel="Follow-up buckets"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'overdue', label: 'Overdue', badge: buckets.overdue.length },
          { id: 'today', label: 'Due today', badge: buckets.today.length },
          { id: 'upcoming', label: 'Upcoming', badge: buckets.upcoming.length },
          { id: 'completed', label: 'Completed', badge: buckets.completed.length },
        ]}
      />

      {visible.length ? (
        <ul className="space-y-3">
          {visible.map((followUp) => {
            const patient = store.patients.find((p) => p.id === followUp.patientId)
            return (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                patientName={patient?.name}
                actions={
                  followUp.status === 'scheduled' ? (
                    <>
                      <Button
                        tone="primary"
                        onClick={() => {
                          store.completeFollowUp(followUp.id, 'Completed during household visit.')
                          toast.show({ tone: 'ok', title: 'Follow-up completed' })
                        }}
                      >
                        Mark completed
                      </Button>
                      {patient ? (
                        <Button
                          icon="📞"
                          onClick={() => {
                            demo.call(patient.name, patient.phone)
                          }}
                        >
                          Call patient
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => {
                          store.markFollowUpMissed(followUp.id)
                          toast.show({ tone: 'warn', title: 'Marked as missed' })
                        }}
                      >
                        Mark missed
                      </Button>
                      {patient ? (
                        <LinkButton to={`/assisted?patient=${patient.id}`}>Assist now</LinkButton>
                      ) : null}
                    </>
                  ) : undefined
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="📅" title="Nothing in this list" />
      )}

      <AddFollowUpDialog
        open={addFor !== null}
        onClose={() => {
          setAddFor(null)
        }}
      />
    </div>
  )
}

function AddFollowUpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const offline = isEffectivelyOffline(store)
  const patients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const [patientId, setPatientId] = useState('')
  const [program, setProgram] = useState('general')
  const [days, setDays] = useState('7')
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a follow-up"
      description="Works offline - it will be queued for the prototype sync."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            tone="primary"
            disabled={!patientId || !reason.trim()}
            onClick={() => {
              store.createFollowUp({
                patientId,
                ashaId: user.ashaId,
                program: program as 'general',
                afterDays: Number(days),
                reason,
              })
              toast.show({
                tone: 'ok',
                title: offline ? 'Follow-up saved offline' : 'Follow-up added',
              })
              setReason('')
              setPatientId('')
              onClose()
            }}
          >
            Save follow-up
          </Button>
        </>
      }
    >
      <Field label="Patient" required>
        {({ id }) => (
          <Select
            id={id}
            value={patientId}
            onChange={(event) => {
              setPatientId(event.target.value)
            }}
          >
            <option value="">Choose a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.age})
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Programme">
        {({ id }) => (
          <Select
            id={id}
            value={program}
            onChange={(event) => {
              setProgram(event.target.value)
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
      <Field label="Due after (days)">
        {({ id }) => (
          <Select
            id={id}
            value={days}
            onChange={(event) => {
              setDays(event.target.value)
            }}
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </Select>
        )}
      </Field>
      <Field label="Reason" required>
        {({ id }) => (
          <TextInput
            id={id}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
            }}
            placeholder="e.g. BP recheck after medicine change"
          />
        )}
      </Field>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export function AshaHouseholdsPage() {
  const store = useAppStore()
  const user = currentUser(store)
  const asha = store.ashas.find((a) => a.id === user.ashaId)
  const households = store.households.filter((h) => (asha?.householdIds ?? []).includes(h.id))

  return (
    <div className="space-y-4">
      <SectionHeading sub={`My villages: ${asha?.villagesCovered.join(', ') ?? '-'} (demo data only).`}>
        My households
      </SectionHeading>

      {households.length ? (
        <ul className="space-y-3">
          {households.map((household) => {
            const members = store.patients.filter((p) => household.memberPatientIds.includes(p.id))
            const followUps = store.followUps.filter(
              (f) => members.some((m) => m.id === f.patientId) && f.status === 'scheduled',
            )
            const overdue = followUps.filter((f) => bucketFollowUp(f) === 'overdue').length
            const vaccinesDue = store.vaccinations.filter(
              (v) => members.some((m) => m.id === v.patientId) && v.status !== 'given',
            ).length
            const referrals = store.referrals.filter(
              (r) =>
                members.some((m) => m.id === r.patientId) &&
                r.status !== 'completed' &&
                r.status !== 'cancelled',
            )
            return (
              <Card as="li" key={household.id} className="list-none">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-900">
                      {household.code} · {household.headName}
                    </h3>
                    <p className="text-sm text-ink-500">
                      {household.address} · {members.length} member(s)
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {overdue ? <Badge tone="danger">{overdue} overdue follow-up</Badge> : null}
                    {vaccinesDue ? <Badge tone="warn">{vaccinesDue} vaccination due</Badge> : null}
                    {referrals.length ? (
                      <Badge tone="info">{referrals.length} referral in progress</Badge>
                    ) : null}
                    {household.pendingSync ? <PendingSyncBadge /> : null}
                  </div>
                </div>

                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <KeyValue label="Last visit">{formatDate(household.lastVisit)}</KeyValue>
                  <KeyValue label="Village">{household.village}</KeyValue>
                  <KeyValue label="Health needs">{household.needs.join('; ')}</KeyValue>
                </dl>

                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-ink-700">Members</h4>
                  <ul className="mt-1 space-y-1 text-sm">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1 last:border-0"
                      >
                        <span>
                          <span className="font-medium text-ink-900">{member.name}</span>{' '}
                          <span className="text-ink-500">
                            ({member.age}) · {member.mainIssue}
                          </span>
                        </span>
                        <LinkButton size="sm" to={`/assisted?patient=${member.id}`}>
                          Assist
                        </LinkButton>
                      </li>
                    ))}
                  </ul>
                </div>

                {household.notes ? (
                  <p className="mt-3 text-sm text-ink-700">
                    <strong>Note:</strong> {household.notes}
                  </p>
                ) : null}
              </Card>
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="🏡" title="No households assigned" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preventive care
// ---------------------------------------------------------------------------

export function AshaPreventivePage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const myPatients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const mine = store.followUps.filter((f) => f.ashaId === user.ashaId)
  const overdue = mine.filter((f) => bucketFollowUp(f) === 'overdue')
  const dueToday = mine.filter((f) => bucketFollowUp(f) === 'today')
  const completed = mine.filter((f) => f.status === 'completed')
  const vaccinesDue = store.vaccinations.filter(
    (v) => v.status !== 'given' && myPatients.some((p) => p.id === v.patientId),
  )
  const screeningsThisMonth = store.screenings.filter((s) => s.byAshaId === user.ashaId)

  const programmes = [
    { id: 'diabetes', label: 'Diabetes screening & follow-up' },
    { id: 'hypertension', label: 'BP screening & follow-up' },
    { id: 'maternal', label: 'Maternal follow-up' },
    { id: 'child', label: 'Child vaccination' },
    { id: 'elderly', label: 'Elderly follow-up' },
    { id: 'tb', label: 'TB follow-up' },
    { id: 'chronic', label: 'Chronic disease follow-up' },
  ]

  return (
    <div className="space-y-4">
      <SectionHeading sub="Only actionable preventive work for your assigned patients.">
        Preventive care
      </SectionHeading>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Overdue"
          value={`🔴 ${overdue.length}`}
          tone={overdue.length ? 'danger' : 'default'}
        />
        <StatTile
          label="Due today"
          value={`🟡 ${dueToday.length}`}
          tone={dueToday.length ? 'warn' : 'default'}
        />
        <StatTile label="Completed" value={`🟢 ${completed.length}`} tone="ok" />
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Missed vaccination follow-ups</h2>
        {vaccinesDue.length ? (
          <ul className="mt-2 space-y-2">
            {vaccinesDue.map((record) => {
              const patient = store.patients.find((p) => p.id === record.patientId)
              return (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium text-ink-900">{patient?.name}</span>{' '}
                    <span className="text-sm text-ink-700">
                      · {record.vaccineName} dose {record.doseNumber}
                    </span>
                    {record.dueDate ? (
                      <span className="block text-xs text-ink-500">
                        Due {formatDate(record.dueDate)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={record.status === 'overdue' ? 'danger' : 'warn'}>
                      {record.status}
                    </Badge>
                    <Button
                      size="sm"
                      tone="primary"
                      onClick={() => {
                        store.updateVaccinationStatus(record.id, 'given')
                        toast.show({
                          tone: 'ok',
                          title: 'Marked as given',
                          body: `${record.vaccineName} for ${patient?.name}`,
                        })
                      }}
                    >
                      Mark given
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">No pending vaccinations.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Screening coverage</h2>
        <p className="mt-1 text-sm text-ink-500">
          {screeningsThisMonth.length} screening(s) recorded by you · {myPatients.length} patient(s)
          assigned
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {programmes.map((programme) => {
            const count = mine.filter((f) => f.program === programme.id).length
            return (
              <li
                key={programme.id}
                className="flex items-center justify-between rounded-card border border-hairline p-3"
              >
                <span className="text-[15px] text-ink-900">{programme.label}</span>
                <Badge tone={count ? 'info' : 'neutral'}>{count} active</Badge>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Camps
// ---------------------------------------------------------------------------

export function AshaCampsPage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const offline = isEffectivelyOffline(store)
  const [registerFor, setRegisterFor] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')
  const asha = store.ashas.find((a) => a.id === user.ashaId)
  const camps = upcomingCamps(store.camps).filter((c) =>
    asha ? asha.villagesCovered.includes(c.village) || c.contactAshaId === asha.id : true,
  )
  const myPatients = store.patients.filter((p) => p.ashaId === user.ashaId)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Register your patients for camps and mobile medical units. Works offline.">
        Medical camps
      </SectionHeading>

      {camps.length ? (
        <ul className="space-y-3">
          {camps.map((camp) => {
            const registrations = store.campRegistrations.filter((r) => r.campId === camp.id)
            return (
              <CampCard
                key={camp.id}
                camp={camp}
                extraActions={
                  <>
                    <Button
                      tone="primary"
                      size="lg"
                      onClick={() => {
                        setRegisterFor(camp.id)
                      }}
                    >
                      Register a patient
                    </Button>
                    <Badge tone="info">{registrations.length} registered</Badge>
                  </>
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="⛺" title="No camps for your villages" />
      )}

      {camps.map((camp) => {
        const registrations = store.campRegistrations.filter((r) => r.campId === camp.id)
        if (!registrations.length) return null
        return (
          <Card key={`reg-${camp.id}`}>
            <h2 className="text-lg font-semibold text-ink-900">{camp.name} - registrations</h2>
            <ul className="mt-2 space-y-2">
              {registrations.map((registration) => {
                const patient = store.patients.find((p) => p.id === registration.patientId)
                return (
                  <li
                    key={registration.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                  >
                    <span>
                      <span className="font-medium text-ink-900">{patient?.name}</span>
                      <span className="block text-xs text-ink-500">
                        By {registration.registeredBy} · {formatDate(registration.registeredAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {registration.pendingSync ? <PendingSyncBadge /> : null}
                      <Badge tone={registration.attended ? 'ok' : 'neutral'}>
                        {registration.attended ? 'Attended' : 'Not yet attended'}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          store.markCampAttended(registration.id, !registration.attended)
                        }}
                      >
                        {registration.attended ? 'Undo' : 'Mark attended'}
                      </Button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}

      <Dialog
        open={registerFor !== null}
        onClose={() => {
          setRegisterFor(null)
        }}
        title="Register a patient for the camp"
        footer={
          <>
            <Button
              onClick={() => {
                setRegisterFor(null)
              }}
            >
              Cancel
            </Button>
            <Button
              tone="primary"
              disabled={!patientId}
              onClick={() => {
                if (!registerFor) return
                const id = store.registerForCamp(
                  registerFor,
                  patientId,
                  `${asha?.name ?? 'ASHA'} (ASHA)`,
                  'asha',
                )
                toast.show({
                  tone: id ? 'ok' : 'warn',
                  title: id
                    ? offline
                      ? 'Registration saved offline'
                      : 'Patient registered for the camp'
                    : 'Could not register',
                  body: id ? undefined : 'Slots may be full, or the patient is already registered.',
                })
                setPatientId('')
                setRegisterFor(null)
              }}
            >
              Register
            </Button>
          </>
        }
      >
        <Field label="Patient" required>
          {({ id }) => (
            <Select
              id={id}
              value={patientId}
              onChange={(event) => {
                setPatientId(event.target.value)
              }}
            >
              <option value="">Choose a patient</option>
              {myPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} ({patient.age})
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nearby healthcare (cached view)
// ---------------------------------------------------------------------------

export function AshaNearbyPage() {
  const store = useAppStore()
  const offline = isEffectivelyOffline(store)
  const facilities = [...store.facilities].sort((a, b) => a.distanceKm - b.distanceKm)
  const contacts = [
    ...store.ashas.map((a) => ({ label: `${a.name} (ASHA, ${a.village})`, phone: a.phone })),
    ...store.ambulances.map((a) => ({ label: `${a.code} (${a.status})`, phone: a.phone })),
    ...store.facilities
      .filter((f) => f.emergency)
      .map((f) => ({ label: `${f.name} (emergency)`, phone: f.phone })),
  ]

  return (
    <div className="space-y-4">
      <SectionHeading sub="Cached on this device so it opens even with no network.">
        Nearby healthcare
      </SectionHeading>

      {offline ? (
        <Callout tone="warn" icon="📴" title="Showing cached facility data">
          You are offline. Distances, timings and services are from the last cached copy.
        </Callout>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Emergency contacts</h2>
        <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
          {contacts.map((contact) => (
            <li key={`${contact.label}-${contact.phone}`} className="flex justify-between gap-2">
              <span className="text-ink-900">{contact.label}</span>
              <span className="font-semibold text-ink-700">{contact.phone}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ul className="space-y-3">
        {facilities.map((facility) => (
          <FacilityCard key={facility.id} facility={facility} />
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alerts for assigned villages
// ---------------------------------------------------------------------------

export function AshaAlertsPage() {
  const store = useAppStore()
  const user = currentUser(store)
  const asha = store.ashas.find((a) => a.id === user.ashaId)
  const alerts = store.alerts.filter((a) =>
    (asha?.villagesCovered ?? []).some((village) => a.areas.includes(village)),
  )
  const readings = store.environment.filter((e) =>
    (asha?.villagesCovered ?? []).includes(e.village),
  )

  return (
    <div className="space-y-4">
      <SectionHeading sub={`Alerts covering ${asha?.villagesCovered.join(', ') ?? 'your villages'}.`}>
        Health alerts
      </SectionHeading>

      <Callout tone="neutral" icon="🧪" title="Demo alerts">
        These are prototype public-health alerts and demo weather readings, not verified outbreak
        reports.
      </Callout>

      {readings.length ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Environment today</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {readings.map((reading) => (
              <li key={reading.village} className="flex flex-wrap justify-between gap-2">
                <span className="text-ink-900">{reading.village}</span>
                <span className="text-ink-700">
                  {reading.condition} · {reading.temperatureC}°C · {reading.headline}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {alerts.length ? (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="📢" title="No alerts for your villages" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Offline data & sync
// ---------------------------------------------------------------------------

export function AshaOfflinePage() {
  const store = useAppStore()
  const user = currentUser(store)
  const [note, setNote] = useState('')
  const toast = useToast()
  const offline = isEffectivelyOffline(store)
  const queue = store.offlineQueue
  const pending = queue.filter((q) => q.status !== 'synced')

  const cachedPatients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const [cacheStats, setCacheStats] = useState({ patients: 0, facilities: 0, contacts: 0 })

  // Read the offline cache back out of storage so the numbers are real.
  useEffect(() => {
    let active = true
    void Promise.all([
      readEssential<unknown[]>('patients', []),
      readEssential<unknown[]>('facilities', []),
      readEssential<unknown[]>('emergencyContacts', []),
    ]).then(([patients, facilities, contacts]) => {
      if (!active) return
      setCacheStats({
        patients: patients.length,
        facilities: facilities.length,
        contacts: contacts.length,
      })
    })
    return () => {
      active = false
    }
  }, [store.patients, store.facilities])

  return (
    <div className="space-y-4">
      <SectionHeading sub="What you can do with no network, and what is waiting to sync.">
        Offline data
      </SectionHeading>

      <Card tone={offline ? 'warn' : 'ok'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {offline
                ? '🟠 Offline'
                : store.syncState === 'syncing'
                  ? '🔄 Syncing...'
                  : store.syncState === 'synced'
                    ? '✓ Synced'
                    : '🟢 Online'}
            </h2>
            <p className="mt-1 text-sm text-ink-700">
              {offline
                ? 'Your work is being saved on this device.'
                : pending.length
                  ? `${pending.length} action(s) ready to sync.`
                  : 'Everything is synced.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setOfflineSimulation(!store.simulatedOffline)
              }}
            >
              {store.simulatedOffline ? 'Go back online (demo)' : 'Simulate offline'}
            </Button>
          </div>
        </div>
        <Callout tone="neutral" className="mt-3" icon="🧪" title="Prototype sync">
          Sync is simulated inside this browser using{' '}
          <strong>IndexedDB (with a localStorage fallback)</strong>. Nothing is uploaded to a server.
        </Callout>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">What works offline</h2>
        <ul className="mt-2 grid gap-1.5 text-[15px] text-ink-900 sm:grid-cols-2">
          {[
            'Register a patient',
            'Enter basic patient information',
            'View cached patient records',
            'Add a basic screening',
            'Create a referral',
            'Add a follow-up',
            'Register a patient for a medical camp',
            'Save a field note',
            'View assigned patients',
            'View cached healthcare facilities',
            'View emergency contacts',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-ok-700">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Sync queue</h2>
        {queue.length ? (
          <ul className="mt-2 space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium text-ink-900">{item.label}</span>
                  <span className="block text-xs text-ink-500">
                    {item.kind.replace(/_/g, ' ')} · saved {formatDateTime(item.createdAt)}
                    {item.syncedAt ? ` · synced ${formatDateTime(item.syncedAt)}` : ''}
                  </span>
                </span>
                <Badge
                  tone={
                    item.status === 'synced'
                      ? 'ok'
                      : item.status === 'syncing'
                        ? 'info'
                        : item.status === 'failed'
                          ? 'danger'
                          : 'warn'
                  }
                >
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">
            Nothing queued. Actions taken while offline appear here.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Save a field note</h2>
        <p className="mt-1 mb-2 text-sm text-ink-500">
          Notes are saved on the device and queued when you are offline.
        </p>
        <Field label="Note">
          {({ id }) => (
            <TextArea
              id={id}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
              }}
              placeholder="e.g. Family needs transport help to reach the district hospital"
            />
          )}
        </Field>
        <Button
          tone="primary"
          disabled={!note.trim()}
          onClick={() => {
            store.addFieldNote(user.id, note.trim())
            setNote('')
            toast.show({
              tone: 'ok',
              title: offline ? 'Note saved offline' : 'Note saved',
            })
          }}
        >
          Save note
        </Button>
        {store.fieldNotes.filter((n) => n.byUserId === user.id).length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {store.fieldNotes
              .filter((n) => n.byUserId === user.id)
              .map((fieldNote) => (
                <li key={fieldNote.id} className="rounded-card border border-hairline p-2">
                  <p className="text-ink-900">{fieldNote.text}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatDateTime(fieldNote.createdAt)}
                    {fieldNote.pendingSync ? ' · waiting to sync' : ''}
                  </p>
                </li>
              ))}
          </ul>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Cached records on this device</h2>
        <p className="mt-1 text-sm text-ink-700">
          Read back from <strong>{storageBackendName()}</strong>: {cacheStats.patients} patient
          record(s), {cacheStats.facilities} facility(ies) and {cacheStats.contacts} emergency
          contact(s).
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {cachedPatients.length} of those patients are assigned to you, so their records open with
          no network at all.
        </p>
      </Card>
    </div>
  )
}
