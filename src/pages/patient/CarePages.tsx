import { useSearchParams } from 'react-router-dom'
import { DoseCard, FollowUpCard, ReferralCard, ScheduleSummaryCard } from '@/components/cards/CareCards'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, StatTile, PageHeader } from '@/components/ui/Card'
import { Callout, SafetyNote } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient, referralsForPatient } from '@/store/selectors'
import { buildDayDoses } from '@/services/medications'
import { useT } from '@/services/i18n'
import { formatClock, formatDate, todayKey } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export function ReferralsPage() {
  const t = useT()
  const [params] = useSearchParams()
  const store = useAppStore()
  const patient = currentPatient(store)
  const referrals = referralsForPatient(store.referrals, patient?.id)
  const focusId = params.get('id')
  const ordered = focusId
    ? [...referrals].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : referrals

  return (
    <div className="space-y-6">
      <PageHeader
        icon="route"
        eyebrow="My health"
        title="My referrals"
        description="Every referral, with the exact stage it has reached."
      />

      {ordered.length ? (
        <ul className="space-y-3">
          {ordered.map((referral) => (
            <ReferralCard key={referral.id} referral={referral} showTimeline />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="route"
          title={t('empty.noReferral')}
          body="A doctor or your ASHA worker creates a referral when you need care at a bigger facility."
          action={<LinkButton to="/doctors">Talk to a doctor</LinkButton>}
        />
      )}

      <Callout tone="neutral" icon="record" title="What travels with a referral">
        Your details, symptoms, relevant history, reports, prescription and the doctor&apos;s reason
        are attached automatically, so the receiving doctor does not start from zero.
      </Callout>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export function FollowUpsPage() {
  const t = useT()
  const toast = useToast()
  const store = useAppStore()
  const patient = currentPatient(store)
  const mine = patient
    ? store.followUps
        .filter((f) => f.patientId === patient.id)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : []
  const pending = mine.filter((f) => f.status === 'scheduled')
  const done = mine.filter((f) => f.status !== 'scheduled')

  return (
    <div className="space-y-6">
      <PageHeader
        icon="calendarCheck"
        eyebrow="My health"
        title="My follow-ups"
        description="Reminders set by your doctor or ASHA worker."
      />

      {pending.length ? (
        <ul className="grid gap-3 xl:grid-cols-2">
          {pending.map((followUp) => (
            <FollowUpCard
              key={followUp.id}
              followUp={followUp}
              actions={
                <>
                  <Button
                    tone="primary"
                    onClick={() => {
                      store.completeFollowUp(followUp.id, 'Marked done by the patient (demo).')
                      toast.show({ tone: 'ok', title: 'Follow-up marked as done' })
                    }}
                  >
                    I have attended this
                  </Button>
                  <LinkButton to="/doctors">Talk to a doctor</LinkButton>
                  <LinkButton to="/asha-contact">Contact ASHA</LinkButton>
                </>
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="calendar"
          title={t('empty.noFollowUp')}
          body="Your doctor can set one after a consultation."
        />
      )}

      {done.length ? (
        <section>
          <h2 className="mt-6 mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Earlier follow-ups</h2>
          <ul className="space-y-3">
            {done.map((followUp) => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Medicine reminders
// ---------------------------------------------------------------------------

export function MedicationsPage() {
  const t = useT()
  const toast = useToast()
  const store = useAppStore()
  const patient = currentPatient(store)

  const schedules = patient
    ? store.medicationSchedules.filter((s) => s.patientId === patient.id)
    : []
  const logs = patient ? store.medicationLogs.filter((l) => l.patientId === patient.id) : []
  const doses = buildDayDoses(schedules, logs)
  const today = todayKey()

  const taken = doses.filter((d) => d.state === 'taken').length
  const skipped = doses.filter((d) => d.state === 'skipped').length
  const upcoming = doses.filter((d) => d.state === 'upcoming' || d.state === 'due').length

  const history = logs
    .filter((l) => l.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))

  if (!patient) {
    return (
      <EmptyState
        icon="alarm"
        title="No patient account selected"
        body="Switch to the patient demo account to see medicine reminders."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="alarm"
        eyebrow="My health"
        title="Medicine reminders"
        description="Created only from your doctor's prescription. Doses are never changed by the app."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Taken today" value={taken} tone="ok" />
        <StatTile label="Upcoming today" value={upcoming} tone="info" />
        <StatTile label="Skipped today" value={skipped} tone={skipped ? 'warn' : 'default'} />
      </div>

      {doses.length ? (
        <>
          <Callout tone="info" icon="bell" title="Notification (demo)">
            Time to take your prescribed medicine. In a real deployment this would also arrive as a
            phone notification or an SMS.
          </Callout>
          <ul className="space-y-3">
            {doses.map((dose) => (
              <DoseCard
                key={`${dose.scheduleId}-${dose.time}`}
                slot={dose}
                onTaken={() => {
                  store.logDose(dose.scheduleId, dose.time, 'taken')
                  toast.show({
                    tone: 'ok',
                    title: 'Marked as taken',
                    body: `${dose.medicineName} at ${formatClock(dose.time)}`,
                  })
                }}
                onSkip={() => {
                  store.logDose(dose.scheduleId, dose.time, 'skipped')
                  toast.show({
                    tone: 'warn',
                    title: 'Marked as skipped',
                    body: 'Tell your doctor or ASHA worker if you keep missing doses.',
                  })
                }}
              />
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon="alarm"
          title="No active medicine schedule"
          body="When a doctor writes a prescription in this prototype, reminders appear here automatically."
          action={<LinkButton to="/doctors">Talk to a doctor</LinkButton>}
        />
      )}

      <Card>
        <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Today&apos;s history</h2>
        {history.length ? (
          <ul className="mt-2 space-y-1 text-[15px]">
            {history.map((log) => {
              const schedule = schedules.find((s) => s.id === log.scheduleId)
              return (
                <li key={log.id} className="flex items-center gap-2">
                  <Icon
                    name={log.status === 'taken' ? 'checkCircle' : 'closeCircle'}
                    size={16}
                    className={log.status === 'taken' ? 'text-ok-600' : 'text-warn-600'}
                  />
                  <span className="tabular-nums">{formatClock(log.time)}</span>
                  <span className="text-ink-700">
                    {schedule?.medicineName ?? 'Medicine'} — {log.status}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">Nothing recorded yet today.</p>
        )}
        {doses
          .filter((d) => d.state === 'upcoming' || d.state === 'due')
          .map((dose) => (
            <p key={`${dose.scheduleId}-${dose.time}`} className="mt-1 text-[15px] text-ink-700">
              <span aria-hidden="true">⏰</span> {formatClock(dose.time)} — {dose.medicineName}{' '}
              (upcoming)
            </p>
          ))}
      </Card>

      <section>
        <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Full schedule</h2>
        {schedules.length ? (
          <ul className="space-y-3">
            {schedules.map((schedule) => (
              <ScheduleSummaryCard key={schedule.id} scheduleId={schedule.id} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">No schedule yet.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Latest prescription {formatDate(store.prescriptions.find((p) => p.patientId === patient.id)?.date)}</Badge>
        <LinkButton to="/records">See prescriptions in my record</LinkButton>
      </div>

      <SafetyNote>{t('symptom.noPrescription')}</SafetyNote>
    </div>
  )
}
