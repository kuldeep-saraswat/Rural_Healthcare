import { LinkButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, SectionHeading, StatTile } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { FollowUpCard } from '@/components/cards/CareCards'
import { ConnectionStatus } from '@/components/layout/HeaderWidgets'
import { EmptyState } from '@/components/ui/States'
import { useAppStore } from '@/store/useAppStore'
import { bucketFollowUp, currentUser, droppedOffReferrals } from '@/store/selectors'
import { DECISION_SUPPORT_DISCLAIMER, followUpRisks } from '@/services/ai/decisionSupport'
import { formatDate } from '@/lib/utils'

export function AshaOverviewPage() {
  const store = useAppStore()
  const user = currentUser(store)
  const asha = store.ashas.find((a) => a.id === user.ashaId)

  const myPatients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const myFollowUps = store.followUps.filter((f) => f.ashaId === user.ashaId)
  const overdue = myFollowUps.filter((f) => bucketFollowUp(f) === 'overdue')
  const dueToday = myFollowUps.filter((f) => bucketFollowUp(f) === 'today')
  const completed = myFollowUps.filter((f) => f.status === 'completed')

  const dropOffs = droppedOffReferrals(store.referrals).filter((r) =>
    myPatients.some((p) => p.id === r.patientId),
  )
  const dueVaccines = store.vaccinations.filter(
    (v) => v.status !== 'given' && myPatients.some((p) => p.id === v.patientId),
  )
  const pendingSync = store.offlineQueue.filter((q) => q.status !== 'synced').length
  const risks = followUpRisks(store, user.ashaId).slice(0, 4)
  const villageAlerts = store.alerts.filter((a) =>
    asha?.villagesCovered.some((v) => a.areas.includes(v)),
  )

  return (
    <div className="space-y-4">
      <SectionHeading sub={`${asha?.name ?? user.name} · ${asha?.villagesCovered.join(', ') ?? user.village}`}>
        ASHA dashboard
      </SectionHeading>

      <div className="flex flex-wrap items-center gap-2">
        <ConnectionStatus />
        {pendingSync ? <Badge tone="warn">{pendingSync} action(s) waiting to sync</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="My patients" value={myPatients.length} />
        <StatTile label="Households" value={asha?.householdIds.length ?? 0} />
        <StatTile
          label="Referral follow-ups"
          value={dropOffs.length}
          tone={dropOffs.length ? 'danger' : 'default'}
        />
        <StatTile
          label="Vaccinations due"
          value={dueVaccines.length}
          tone={dueVaccines.length ? 'warn' : 'default'}
        />
      </div>

      <Card>
        <SectionHeading sub="Your visit list for today.">Today&apos;s follow-ups</SectionHeading>
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
        <div className="mt-4">
          <LinkButton to="/asha/follow-ups" tone="primary">
            Open follow-up list
          </LinkButton>
        </div>
      </Card>

      {dropOffs.length ? (
        <Callout
          tone="warn"
          icon="⚠️"
          title={`${dropOffs.length} referral follow-up(s) required`}
          actions={<LinkButton to="/asha/referrals">Open referrals</LinkButton>}
        >
          A referred patient has not reached the facility by the expected date. Call the family,
          arrange transport, or escalate to the PHC medical officer.
        </Callout>
      ) : null}

      {villageAlerts.length ? (
        <Callout
          tone="info"
          icon="📢"
          title={`${villageAlerts.length} demo alert(s) for your villages`}
          actions={<LinkButton to="/asha/alerts">See precautions</LinkButton>}
        >
          {villageAlerts.map((a) => a.title).join(' · ')}
        </Callout>
      ) : null}

      {risks.length ? (
        <Card tone="info">
          <h2 className="text-lg font-semibold text-ink-900">
            Follow-up risk
            <span className="ml-2 align-middle text-xs font-normal text-ink-500">
              decision support
            </span>
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-900">
            {risks.map((risk) => (
              <li key={risk.followUp.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{risk.patient?.name ?? 'Patient'}</strong> · {risk.followUp.reason} ·{' '}
                  {formatDate(risk.followUp.dueDate)}
                </span>
                <Badge tone={risk.severity === 'act_now' ? 'danger' : 'warn'}>
                  {risk.severity === 'act_now' ? 'Act now' : 'Watch'}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">{DECISION_SUPPORT_DISCLAIMER}</p>
        </Card>
      ) : null}

      <section aria-labelledby="due-today">
        <SectionHeading id="due-today">Due today and overdue</SectionHeading>
        {[...overdue, ...dueToday].length ? (
          <ul className="space-y-3">
            {[...overdue, ...dueToday].map((followUp) => (
              <FollowUpCard
                key={followUp.id}
                followUp={followUp}
                patientName={store.patients.find((p) => p.id === followUp.patientId)?.name}
                actions={
                  <LinkButton to="/asha/follow-ups" tone="primary">
                    Take action
                  </LinkButton>
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon="✅" title="Nothing due today" body="Your follow-up list is clear." />
        )}
      </section>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton to="/asha/patients" tone="primary" size="lg">
            Register a patient
          </LinkButton>
          <LinkButton to="/assisted" size="lg">
            Assisted consultation
          </LinkButton>
          <LinkButton to="/asha/camps" size="lg">
            Register for a camp
          </LinkButton>
          <LinkButton to="/asha/offline" size="lg">
            Offline data &amp; sync
          </LinkButton>
          <LinkButton to="/asha/nearby" size="lg">
            Nearby healthcare
          </LinkButton>
        </div>
      </Card>
    </div>
  )
}
