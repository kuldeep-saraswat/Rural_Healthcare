import { Link } from 'react-router-dom'
import { AiAssistant } from '@/components/ai/AiAssistant'
import { LowConnectivityPanel } from '@/components/LowConnectivityPanel'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
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
    (e) =>
      e.patientId === patient?.id &&
      !['completed', 'no_ambulance'].includes(e.status),
  )

  const asha = ashaForPatient(store.ashas, patient)
  const lowData = store.lowConnectivity

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          👋 {t('greeting.namaste', { name: user.name.split(' ')[0] })}
        </h1>
        <p className="mt-1 text-base text-ink-700 sm:text-lg">{t('home.question')}</p>
      </div>

      {lowData ? <LowConnectivityPanel /> : null}

      {activeEmergency ? (
        <Callout
          tone="danger"
          icon="🚨"
          title="An emergency request is in progress"
          actions={
            <LinkButton to="/emergency" tone="danger" size="lg">
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
          icon="📢"
          title={`${activeAlerts.length} health alert(s) for ${village}`}
          actions={
            <LinkButton to="/alerts" size="lg">
              See precautions
            </LinkButton>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            {activeAlerts.map((alert) => (
              <span key={alert.title} className="font-medium">
                {alert.title}
              </span>
            ))}
            <DemoBadge label="Demo alert" />
          </span>
        </Callout>
      ) : null}

      {/* The assistant dominates the page */}
      <AiAssistant variant="home" maxMessages={8} />

      {/* Today's things that need action - not rendered at all in low data mode */}
      {lowData ? null : (
      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-lg font-bold text-ink-900">
          Aaj ke liye / For you today
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingDose ? (
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink-900">Medicine reminder</h3>
                  <p className="mt-1 text-[15px] text-ink-900">
                    {upcomingDose.medicineName} · {upcomingDose.dose}
                  </p>
                  <p className="text-sm text-ink-500">
                    ⏰ {formatClock(upcomingDose.time)} ·{' '}
                    {upcomingDose.state === 'due' ? 'Due now' : 'Upcoming'}
                  </p>
                </div>
                <span aria-hidden="true" className="text-2xl">
                  💊
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  tone="primary"
                  onClick={() => {
                    store.logDose(upcomingDose.scheduleId, upcomingDose.time, 'taken')
                  }}
                >
                  {t('action.markTaken')}
                </Button>
                <LinkButton to="/medications">All reminders</LinkButton>
              </div>
            </Card>
          ) : null}

          {dueFollowUp ? (
            <Card tone={bucketFollowUp(dueFollowUp) === 'overdue' ? 'warn' : 'default'}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink-900">Follow-up</h3>
                  <p className="mt-1 text-[15px] text-ink-900">{dueFollowUp.reason}</p>
                  <p className="text-sm text-ink-500">
                    {formatDate(dueFollowUp.dueDate)} · {relativeDays(dueFollowUp.dueDate).label}
                  </p>
                </div>
                <span aria-hidden="true" className="text-2xl">
                  📅
                </span>
              </div>
              <div className="mt-3">
                <LinkButton to="/follow-ups" tone="primary">
                  {t('action.viewFollowUp')}
                </LinkButton>
              </div>
            </Card>
          ) : null}

          {activeReferral ? (
            <Card tone={activeReferral.dropOffFlagged ? 'warn' : 'default'}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink-900">Referral in progress</h3>
                  <p className="mt-1 text-[15px] text-ink-900">
                    {store.facilities.find((f) => f.id === activeReferral.toFacilityId)?.name}
                  </p>
                  <Badge tone="info">{activeReferral.status.replace(/_/g, ' ')}</Badge>
                </div>
                <span aria-hidden="true" className="text-2xl">
                  🔁
                </span>
              </div>
              <div className="mt-3">
                <LinkButton to="/referrals" tone="primary">
                  {t('action.track')}
                </LinkButton>
              </div>
            </Card>
          ) : null}

          {asha ? (
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink-900">Your ASHA worker</h3>
                  <p className="mt-1 text-[15px] text-ink-900">{asha.name}</p>
                  <p className="text-sm text-ink-500">
                    {asha.village} · {asha.distanceKm} km
                  </p>
                </div>
                <span aria-hidden="true" className="text-2xl">
                  🧑‍🤝‍🧑
                </span>
              </div>
              <div className="mt-3">
                <LinkButton to="/asha-contact" tone="primary">
                  Contact ASHA
                </LinkButton>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink-900">Village health access</h3>
                <p className="mt-1 text-sm text-ink-700">
                  See how far your PHC, CHC, hospital, kiosk and next camp are.
                </p>
              </div>
              <span aria-hidden="true" className="text-2xl">
                🏡
              </span>
            </div>
            <div className="mt-3">
              <LinkButton to="/village">Open {village} summary</LinkButton>
            </div>
          </Card>
        </div>
      </section>
      )}

      <p className="pb-2 text-center text-xs text-ink-500">
        Need something else?{' '}
        <Link to="/ai" className="font-medium text-care-700 underline">
          Ask the assistant
        </Link>{' '}
        — you can type or speak in Hindi, English or Marathi.
      </p>
    </div>
  )
}
