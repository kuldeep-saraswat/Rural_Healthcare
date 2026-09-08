import { useMemo } from 'react'
import { AlertCard, EnvironmentCard } from '@/components/cards/PublicHealthCards'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, SectionHeading, StatTile } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import {
  alertsForVillage,
  ashaForPatient,
  bucketFollowUp,
  currentPatient,
  upcomingCamps,
} from '@/store/selectors'
import { formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Health & environment alerts
// ---------------------------------------------------------------------------

export function AlertsPage() {
  const store = useAppStore()
  const patient = currentPatient(store)
  const village = patient?.village ?? 'Kalyanpur'
  const active = useMemo(
    () => alertsForVillage(store.alerts, village),
    [store.alerts, village],
  )
  const others = store.alerts.filter((a) => !active.includes(a))
  const reading = store.environment.find((e) => e.village === village)

  return (
    <div className="space-y-4">
      <SectionHeading
        sub={`Location-based precautions for ${village}. Everything here is generated inside the prototype.`}
      >
        Health &amp; environment alerts
      </SectionHeading>

      <Callout tone="neutral" icon="🧪" title="Read this first">
        These are <strong>demo public-health alerts</strong> and <strong>demo weather readings</strong>.
        They are not verified outbreak reports and not official government notifications. A real
        deployment would connect a weather service and the district health authority&apos;s feed.
      </Callout>

      {reading ? (
        <ul>
          <EnvironmentCard reading={reading} />
        </ul>
      ) : null}

      <section aria-labelledby="active-alerts">
        <SectionHeading id="active-alerts" sub={`${active.length} active for your area`}>
          Active alerts
        </SectionHeading>
        {active.length ? (
          <ul className="space-y-3">
            {active.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="📢"
            title="No active alert for your area"
            body="You will see a notification here if the district health office issues one."
          />
        )}
      </section>

      {others.length ? (
        <section aria-labelledby="other-alerts">
          <SectionHeading id="other-alerts" sub="Issued for other villages or already expired.">
            Other alerts
          </SectionHeading>
          <ul className="space-y-3">
            {others.map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preventive care
// ---------------------------------------------------------------------------

const PREVENTIVE_CHECKS = [
  {
    id: 'bp',
    title: 'Blood pressure screening',
    who: 'Everyone above 30, and anyone with headache or giddiness',
    path: '/tests?q=BP',
  },
  {
    id: 'sugar',
    title: 'Diabetes screening',
    who: 'Everyone above 30, or with a family history',
    path: '/tests?q=Blood%20Sugar',
  },
  {
    id: 'anc',
    title: 'Maternal (ANC) follow-up',
    who: 'Pregnant women - monthly, then fortnightly in the last month',
    path: '/follow-ups',
  },
  {
    id: 'child',
    title: 'Child immunisation',
    who: 'All children as per the immunisation schedule',
    path: '/vaccines',
  },
  {
    id: 'elderly',
    title: 'Elderly follow-up',
    who: 'Everyone above 60 - BP, sugar, vision and mobility',
    path: '/follow-ups',
  },
  {
    id: 'chronic',
    title: 'Chronic disease follow-up',
    who: 'BP, diabetes, heart or kidney disease - monthly review',
    path: '/follow-ups',
  },
  {
    id: 'tb',
    title: 'TB follow-up',
    who: 'Anyone on TB treatment, and household contacts',
    path: '/tests?q=Sputum',
  },
]

export function PreventivePage() {
  const toast = useToast()
  const store = useAppStore()
  const patient = currentPatient(store)
  const asha = ashaForPatient(store.ashas, patient)

  const myFollowUps = patient
    ? store.followUps.filter((f) => f.patientId === patient.id)
    : []
  const overdue = myFollowUps.filter((f) => bucketFollowUp(f) === 'overdue')
  const dueToday = myFollowUps.filter((f) => bucketFollowUp(f) === 'today')
  const completed = myFollowUps.filter((f) => f.status === 'completed')
  const dueVaccines = patient
    ? store.vaccinations.filter((v) => v.patientId === patient.id && v.status !== 'given')
    : []
  const nextCamp = upcomingCamps(store.camps).find((c) => c.village === patient?.village)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Only the checks that actually apply to you, with an action for each.">
        Preventive care
      </SectionHeading>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Overdue follow-ups"
          value={overdue.length}
          tone={overdue.length ? 'danger' : 'default'}
        />
        <StatTile label="Due today" value={dueToday.length} tone={dueToday.length ? 'warn' : 'default'} />
        <StatTile label="Completed" value={completed.length} tone="ok" />
      </div>

      {overdue.length ? (
        <Callout
          tone="warn"
          icon="⚠️"
          title={`${overdue.length} follow-up(s) missed`}
          actions={<LinkButton to="/follow-ups">Open follow-ups</LinkButton>}
        >
          Your ASHA worker {asha ? `(${asha.name}) ` : ''}also sees these as missed follow-up
          alerts, so you can be reminded in person.
        </Callout>
      ) : null}

      {dueVaccines.length ? (
        <Card tone="warn">
          <h2 className="text-lg font-semibold text-ink-900">Vaccination due</h2>
          <ul className="mt-2 space-y-1 text-[15px]">
            {dueVaccines.map((vaccine) => (
              <li key={vaccine.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {vaccine.vaccineName} dose {vaccine.doseNumber}
                  {vaccine.dueDate ? ` · due ${formatDate(vaccine.dueDate)}` : ''}
                </span>
                <Badge tone={vaccine.status === 'overdue' ? 'danger' : 'warn'}>
                  {vaccine.status}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <LinkButton to="/vaccines" tone="primary">
              Find a vaccination centre
            </LinkButton>
          </div>
        </Card>
      ) : null}

      <section aria-labelledby="checks">
        <SectionHeading id="checks">Screening checklist</SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PREVENTIVE_CHECKS.map((check) => (
            <Card as="li" key={check.id} className="list-none">
              <h3 className="font-semibold text-ink-900">{check.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{check.who}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <LinkButton to={check.path}>Where to get this</LinkButton>
                <Button
                  onClick={() => {
                    if (!patient) return
                    store.createFollowUp({
                      patientId: patient.id,
                      program: 'general',
                      afterDays: 7,
                      reason: check.title,
                      ashaId: asha?.id,
                    })
                    toast.show({
                      tone: 'ok',
                      title: 'Reminder set for 7 days',
                      body: `${check.title}. Your ASHA worker has been notified too.`,
                    })
                  }}
                >
                  Remind me in 7 days
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      {nextCamp ? (
        <Callout
          tone="info"
          icon="⛺"
          title={`Next camp in ${nextCamp.village}: ${formatDate(nextCamp.date)}`}
          actions={<LinkButton to="/camps">See camp details</LinkButton>}
        >
          Free screening for BP, blood sugar, maternal and child health.
        </Callout>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Village health access
// ---------------------------------------------------------------------------

export function VillagePage() {
  const store = useAppStore()
  const patient = currentPatient(store)
  const villageName = patient?.village ?? 'Kalyanpur'
  const village = store.villages.find((v) => v.name === villageName) ?? store.villages[0]
  const phc = store.facilities.find((f) => f.id === village.nearestPhcId)
  const chc = store.facilities.find((f) => f.id === village.nearestChcId)
  const hospital = store.facilities.find((f) => f.id === village.nearestHospitalId)
  const kiosk = store.facilities.find((f) => f.id === village.kioskFacilityId)
  const asha = store.ashas.find((a) => a.id === village.ashaId)
  const nextCamp = upcomingCamps(store.camps).find((c) => c.village === village.name)
  const telemedicine = store.doctors.some((d) => d.telemedicine && d.status === 'available')
  const ambulance = store.ambulances.some((a) => a.status === 'available')

  const accessTone =
    village.accessLevel === 'good' ? 'ok' : village.accessLevel === 'moderate' ? 'warn' : 'danger'

  return (
    <div className="space-y-4">
      <SectionHeading sub={`Population about ${village.population.toLocaleString('en-IN')} (demo figure).`}>
        {village.name} - village health access
      </SectionHeading>

      <Card tone={accessTone === 'ok' ? 'ok' : accessTone === 'warn' ? 'warn' : 'danger'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Healthcare access</h2>
            <p className="mt-1 text-sm text-ink-700">
              Based on distance to facilities, doctor availability and local resources in the demo
              dataset.
            </p>
          </div>
          <div className="text-right">
            <Badge tone={accessTone}>
              {village.accessLevel === 'good'
                ? 'GOOD'
                : village.accessLevel === 'moderate'
                  ? 'MODERATE'
                  : 'LIMITED'}
            </Badge>
            <div className="mt-1">
              <DemoBadge label="Demo indicator" />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          <strong>Demo indicator - NOT an official government metric.</strong> It is computed from
          the fictional data in this prototype only.
        </p>
      </Card>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue label="Nearest PHC">
            {phc ? `${phc.name} · ${phc.distanceKm} km` : 'Not mapped'}
          </KeyValue>
          <KeyValue label="Nearest CHC">
            {chc ? `${chc.name} · ${chc.distanceKm} km` : 'Not mapped'}
          </KeyValue>
          <KeyValue label="Nearest hospital">
            {hospital ? `${hospital.name} · ${hospital.distanceKm} km` : 'Not mapped'}
          </KeyValue>
          <KeyValue label="ASHA worker">
            {asha ? `${asha.name} · ${asha.distanceKm} km` : 'Not assigned'}
          </KeyValue>
          <KeyValue label="Health kiosk">
            {kiosk ? `${kiosk.name} · ${kiosk.distanceKm} km` : 'None in village'}
          </KeyValue>
          <KeyValue label="Next medical camp">
            {nextCamp ? `${formatDate(nextCamp.date)} · ${nextCamp.name}` : 'None scheduled'}
          </KeyValue>
          <KeyValue label="Telemedicine">
            {telemedicine ? 'Available now' : 'No doctor online right now'}
          </KeyValue>
          <KeyValue label="Ambulance">
            {ambulance ? 'Available (demo)' : 'All ambulances busy'}
          </KeyValue>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-2">
        <LinkButton to="/nearby" tone="primary">
          Open healthcare finder
        </LinkButton>
        <LinkButton to="/asha-contact">Contact ASHA</LinkButton>
        <LinkButton to="/camps">Medical camps</LinkButton>
        <LinkButton to="/kiosks">Health kiosk</LinkButton>
      </div>
    </div>
  )
}
