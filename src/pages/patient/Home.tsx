import { Link } from 'react-router-dom'
import { AiAssistant } from '@/components/ai/AiAssistant'
import { LowConnectivityPanel } from '@/components/LowConnectivityPanel'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Icon, IconChip } from '@/components/ui/Icon'
import type { IconName, IconTone } from '@/components/ui/Icon'
import { useAppStore } from '@/store/useAppStore'
import { alertsForVillage, ashaForPatient, currentPatient, currentUser } from '@/store/selectors'
import { buildDayDoses, nextDose } from '@/services/medications'
import { bucketFollowUp } from '@/store/selectors'
import { useT } from '@/services/i18n'
import { formatClock, formatDate, relativeDays } from '@/lib/utils'

/**
 * The patient home page is an application surface, not a landing page:
 * greeting, the assistant, and the few live things that need the patient's
 * attention today. No marketing sections anywhere.
 */

/** One "needs your attention today" card. Same shape for every item. */
function TodayCard({
  icon,
  iconTone = 'care',
  title,
  primary,
  secondary,
  badge,
  action,
  tone,
}: {
  icon: IconName
  iconTone?: IconTone
  title: string
  primary?: string
  secondary?: React.ReactNode
  badge?: React.ReactNode
  action: React.ReactNode
  tone?: 'default' | 'warn'
}) {
  return (
    <Card
      as="li"
      tone={tone === 'warn' ? 'warn' : 'default'}
      className="flex list-none flex-col"
      padding="md"
    >
      <div className="flex items-start gap-3">
        <IconChip name={icon} tone={tone === 'warn' ? 'warn' : iconTone} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold tracking-wide text-ink-500 uppercase">
            {title}
          </h3>
          {primary ? (
            <p className="mt-1 text-[15px] leading-snug font-semibold text-ink-900">{primary}</p>
          ) : null}
          {secondary ? <div className="mt-1 text-sm text-ink-500">{secondary}</div> : null}
          {badge ? <div className="mt-2">{badge}</div> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 pt-0">{action}</div>
    </Card>
  )
}

export function HomePage() {
  const t = useT()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)
  const village = patient?.village ?? user.village

  const activeAlerts = alertsForVillage(store.alerts, village)
  const doses = patient
    ? buildDayDoses(
        store.medicationSchedules.filter((s) => s.patientId === patient.id),
        store.medicationLogs.filter((l) => l.patientId === patient.id),
      )
    : []
  const upcomingDose = nextDose(doses)

  const myFollowUps = patient
    ? store.followUps
        .filter((f) => f.patientId === patient.id && f.status === 'scheduled')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : []
  const dueFollowUp = myFollowUps[0]

  const activeReferral = patient
    ? store.referrals.find(
        (r) => r.patientId === patient.id && r.status !== 'completed' && r.status !== 'cancelled',
      )
    : undefined

  const activeEmergency = store.emergencyRequests.find(
    (e) => e.patientId === patient?.id && !['completed', 'no_ambulance'].includes(e.status),
  )

  const asha = ashaForPatient(store.ashas, patient)
  const lowData = store.lowConnectivity

  return (
    <div className="space-y-6">
      {/* ---- Greeting ---- */}
      <header>
        <p className="eyebrow text-care-700">{village}</p>
        <h1 className="mt-1.5 text-[28px] leading-tight font-bold tracking-tight text-ink-900 sm:text-[34px]">
          {t('greeting.namaste', { name: user.name.split(' ')[0] })}
        </h1>
        <p className="mt-1.5 text-base text-ink-600 sm:text-lg">{t('home.question')}</p>
      </header>

      {lowData ? <LowConnectivityPanel /> : null}

      {activeEmergency ? (
        <Callout
          tone="danger"
          icon="siren"
          title="An emergency request is in progress"
          actions={
            <LinkButton
              to="/emergency"
              tone="danger"
              size="lg"
              iconAfter={<Icon name="arrowRight" size={16} />}
            >
              Open emergency mode
            </LinkButton>
          }
        >
          {activeEmergency.status.replace(/_/g, ' ')} · demo workflow, no real ambulance has been
          dispatched.
        </Callout>
      ) : null}

      {/* Live public health alert for this village */}
      {activeAlerts.length ? (
        <Callout
          tone="warn"
          icon="megaphone"
          title={`${activeAlerts.length} health alert(s) for ${village}`}
          actions={
            <LinkButton to="/alerts" size="md">
              See precautions
            </LinkButton>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            {activeAlerts.map((alert) => (
              <span key={alert.title} className="font-medium text-ink-800">
                {alert.title}
              </span>
            ))}
            <DemoBadge label="Demo alert" />
          </span>
        </Callout>
      ) : null}

      {/* ---- The assistant dominates the page ---- */}
      <AiAssistant variant="home" maxMessages={8} />

      {/* ---- Today's things that need action ---- */}
      {lowData ? null : (
        <section aria-labelledby="today-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="today-heading" className="text-lg font-semibold tracking-tight text-ink-900">
                Aaj ke liye / For you today
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Only what needs you right now, from your own record.
              </p>
            </div>
            <LinkButton
              to="/records"
              size="sm"
              iconAfter={<Icon name="arrowRight" size={14} />}
            >
              Full health record
            </LinkButton>
          </div>

          <ul className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingDose ? (
              <TodayCard
                icon="pill"
                title="Medicine reminder"
                primary={`${upcomingDose.medicineName} · ${upcomingDose.dose}`}
                secondary={
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" size={14} />
                    {formatClock(upcomingDose.time)} ·{' '}
                    {upcomingDose.state === 'due' ? 'Due now' : 'Upcoming'}
                  </span>
                }
                action={
                  <>
                    <Button
                      tone="primary"
                      icon={<Icon name="check" size={16} strokeWidth={2.4} />}
                      onClick={() => {
                        store.logDose(upcomingDose.scheduleId, upcomingDose.time, 'taken')
                      }}
                    >
                      {t('action.markTaken')}
                    </Button>
                    <LinkButton to="/medications">All reminders</LinkButton>
                  </>
                }
              />
            ) : null}

            {dueFollowUp ? (
              <TodayCard
                icon="calendarCheck"
                iconTone="info"
                tone={bucketFollowUp(dueFollowUp) === 'overdue' ? 'warn' : 'default'}
                title="Follow-up"
                primary={dueFollowUp.reason}
                secondary={`${formatDate(dueFollowUp.dueDate)} · ${relativeDays(dueFollowUp.dueDate).label}`}
                action={
                  <LinkButton to="/follow-ups" tone="primary">
                    {t('action.viewFollowUp')}
                  </LinkButton>
                }
              />
            ) : null}

            {activeReferral ? (
              <TodayCard
                icon="route"
                iconTone="info"
                tone={activeReferral.dropOffFlagged ? 'warn' : 'default'}
                title="Referral in progress"
                primary={store.facilities.find((f) => f.id === activeReferral.toFacilityId)?.name}
                badge={<Badge tone="info">{activeReferral.status.replace(/_/g, ' ')}</Badge>}
                action={
                  <LinkButton to="/referrals" tone="primary">
                    {t('action.track')}
                  </LinkButton>
                }
              />
            ) : null}

            {asha ? (
              <TodayCard
                icon="users"
                title="Your ASHA worker"
                primary={asha.name}
                secondary={`${asha.village} · ${asha.distanceKm} km`}
                action={
                  <LinkButton
                    to="/asha-contact"
                    tone="primary"
                    icon={<Icon name="phone" size={16} />}
                  >
                    Contact ASHA
                  </LinkButton>
                }
              />
            ) : null}

            <TodayCard
              icon="household"
              iconTone="neutral"
              title="Village health access"
              secondary="See how far your PHC, CHC, hospital, kiosk and next camp are."
              action={<LinkButton to="/village">Open {village} summary</LinkButton>}
            />
          </ul>
        </section>
      )}

      <p className="pb-2 text-center text-xs text-ink-500">
        Need something else?{' '}
        <Link to="/ai" className="font-semibold text-care-700 underline underline-offset-2">
          Ask the assistant
        </Link>{' '}
        — you can type or speak in Hindi, English or Marathi.
      </p>
    </div>
  )
}
