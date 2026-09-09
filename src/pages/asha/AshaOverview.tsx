import { LinkButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, PageHeader, SectionHeading, StatGrid, StatTile } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
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
    <div className="space-y-6">
      <PageHeader
        icon="dashboard"
        eyebrow="Community health worker"
        title="ASHA dashboard"
        description={`${asha?.name ?? user.name} · ${asha?.villagesCovered.join(', ') ?? user.village}`}
        meta={
          <>
            <ConnectionStatus />
            {pendingSync ? (
              <Badge tone="warn" icon="cloudOff">
                {pendingSync} action(s) waiting to sync
              </Badge>
            ) : null}
          </>
        }
        actions={
          <LinkButton to="/assisted" tone="primary" icon={<Icon name="stethoscope" size={16} />}>
            Assisted consultation
          </LinkButton>
        }
      />

      <StatGrid>
        <StatTile label="My patients" value={myPatients.length} icon="users" to="/asha/patients" />
        <StatTile
          label="Households"
          value={asha?.householdIds.length ?? 0}
          icon="household"
          to="/asha/households"
        />
        <StatTile
          label="Referral follow-ups"
          value={dropOffs.length}
          icon="route"
          tone={dropOffs.length ? 'danger' : 'default'}
          hint={dropOffs.length ? 'Patient has not reached the facility' : 'All referrals on track'}
          to="/asha/referrals"
        />
        <StatTile
          label="Vaccinations due"
          value={dueVaccines.length}
          icon="syringe"
          tone={dueVaccines.length ? 'warn' : 'default'}
          to="/asha/preventive"
        />
      </StatGrid>

      <Card padding="lg">
        <SectionHeading
          sub="Your visit list for today."
          right={
            <LinkButton
              to="/asha/follow-ups"
              tone="primary"
              size="sm"
              iconAfter={<Icon name="arrowRight" size={14} />}
            >
              Open follow-up list
            </LinkButton>
          }
        >
          Today&apos;s follow-ups
        </SectionHeading>
        <StatGrid columns={3}>
          <StatTile
            label="Overdue"
            value={overdue.length}
            icon="alertCircle"
            tone={overdue.length ? 'danger' : 'default'}
          />
          <StatTile
            label="Due today"
            value={dueToday.length}
            icon="calendar"
            tone={dueToday.length ? 'warn' : 'default'}
          />
          <StatTile label="Completed" value={completed.length} icon="checkCircle" tone="ok" />
        </StatGrid>
      </Card>

      {dropOffs.length ? (
        <Callout
          tone="warn"
          icon="alert"
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
          icon="megaphone"
          title={`${villageAlerts.length} demo alert(s) for your villages`}
          actions={<LinkButton to="/asha/alerts">See precautions</LinkButton>}
        >
          {villageAlerts.map((a) => a.title).join(' · ')}
        </Callout>
      ) : null}

      {risks.length ? (
        <Card tone="info">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink-900">
            <Icon name="activity" size={18} className="text-info-600" />
            Follow-up risk
            <span className="rounded-full bg-info-100 px-2 py-0.5 text-2xs font-bold tracking-wide text-info-700 uppercase">
              decision support
            </span>
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-800">
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
          <ul className="grid gap-3 xl:grid-cols-2">
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
          <EmptyState icon="checkCircle" title="Nothing due today" body="Your follow-up list is clear." />
        )}
      </section>

      <Card padding="lg">
        <SectionHeading sub="The things you start most often in the field." icon="sparkle">
          Quick actions
        </SectionHeading>
        <div className="flex flex-wrap gap-2">
          <LinkButton
            to="/asha/patients"
            tone="primary"
            icon={<Icon name="userPlus" size={16} />}
          >
            Register a patient
          </LinkButton>
          <LinkButton to="/assisted" icon={<Icon name="stethoscope" size={16} />}>
            Assisted consultation
          </LinkButton>
          <LinkButton to="/asha/camps" icon={<Icon name="tent" size={16} />}>
            Register for a camp
          </LinkButton>
          <LinkButton to="/asha/offline" icon={<Icon name="cloudOff" size={16} />}>
            Offline data &amp; sync
          </LinkButton>
          <LinkButton to="/asha/nearby" icon={<Icon name="pin" size={16} />}>
            Nearby healthcare
          </LinkButton>
        </div>
      </Card>
    </div>
  )
}
