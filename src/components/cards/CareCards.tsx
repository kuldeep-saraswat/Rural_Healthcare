import { Link } from 'react-router-dom'
import type { FollowUp, Referral, ReferralStatus } from '@/types'
import { REFERRAL_FLOW } from '@/types'
import { Badge, PendingSyncBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Timeline } from '@/components/ui/Timeline'
import type { TimelineStep } from '@/components/ui/Timeline'
import { FREQUENCY_LABEL, TIMING_LABEL } from '@/services/medications'
import type { DoseSlot } from '@/services/medications'
import { useAppStore } from '@/store/useAppStore'
import { bucketFollowUp } from '@/store/selectors'
import { formatClock, formatDate, formatDateTime, relativeDays } from '@/lib/utils'
import { useT } from '@/services/i18n'
import { Icon, IconChip } from '@/components/ui/Icon'

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  created: 'Created',
  accepted: 'Accepted',
  patient_reached: 'Patient Reached',
  consultation: 'Consultation',
  treatment: 'Treatment',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function referralSteps(referral: Referral): TimelineStep[] {
  const currentIndex = REFERRAL_FLOW.indexOf(referral.status)
  return REFERRAL_FLOW.map((status, index) => {
    const event = [...referral.history].reverse().find((h) => h.status === status)
    let state: TimelineStep['state'] = 'todo'
    if (index < currentIndex) state = 'done'
    else if (index === currentIndex) state = 'current'
    if (
      referral.dropOffFlagged &&
      status === 'patient_reached' &&
      currentIndex < REFERRAL_FLOW.indexOf('patient_reached')
    ) {
      state = 'blocked'
    }
    return {
      key: status,
      label: REFERRAL_STATUS_LABEL[status],
      at: event ? formatDateTime(event.at) : undefined,
      by: event?.by,
      note: event?.note,
      state,
    }
  })
}

export function ReferralCard({
  referral,
  showTimeline = false,
  actions,
  patientLabel,
}: {
  referral: Referral
  showTimeline?: boolean
  actions?: React.ReactNode
  patientLabel?: string
}) {
  const t = useT()
  const facilities = useAppStore((s) => s.facilities)
  const from = facilities.find((f) => f.id === referral.fromFacilityId)
  const to = facilities.find((f) => f.id === referral.toFacilityId)
  const urgencyTone =
    referral.urgency === 'emergency' ? 'danger' : referral.urgency === 'urgent' ? 'warn' : 'neutral'

  return (
    <Card
      as="li"
      className="list-none"
      tone={referral.dropOffFlagged ? 'warn' : 'default'}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">
            {patientLabel ? `${patientLabel} → ` : ''}
            {to?.name ?? 'Referred facility'}
          </h3>
          <p className="text-sm text-ink-500">
            From {from?.name ?? 'facility'} · created {formatDate(referral.createdAt)}
          </p>
          <p className="mt-1.5 text-[15px] text-ink-900">{referral.reason}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={referral.status === 'completed' ? 'ok' : 'info'}>
            {REFERRAL_STATUS_LABEL[referral.status]}
          </Badge>
          <Badge tone={urgencyTone}>{referral.urgency}</Badge>
          {referral.transportRequired ? <Badge tone="neutral">Transport needed</Badge> : null}
          {referral.pendingSync ? <PendingSyncBadge /> : null}
        </div>
      </div>

      {referral.dropOffFlagged ? (
        <div
          role="alert"
          className="mt-3 flex gap-2.5 rounded-card border border-warn-200 bg-warn-50 p-3 text-sm text-warn-700"
        >
          <Icon name="alert" size={17} className="mt-px shrink-0 text-warn-600" />
          <span>
          <strong>Referral follow-up required.</strong> The patient has not reached{' '}
          {to?.name ?? 'the facility'} by the expected date (
          {formatDate(referral.expectedArrivalBy)}).
          </span>
        </div>
      ) : null}

      {showTimeline ? (
        <div className="mt-4">
          <h4 className="eyebrow mb-3 text-ink-400">Referral journey</h4>
          <Timeline steps={referralSteps(referral)} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {actions ?? (
          <Link
            to={`/referrals?id=${referral.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-card border border-hairline-strong bg-surface px-4 text-sm font-semibold shadow-xs transition-colors hover:bg-canvas"
          >
            {t('action.track')}
            <Icon name="arrowRight" size={15} />
          </Link>
        )}
      </div>
    </Card>
  )
}

export function FollowUpCard({
  followUp,
  patientName,
  actions,
}: {
  followUp: FollowUp
  patientName?: string
  actions?: React.ReactNode
}) {
  const bucket = bucketFollowUp(followUp)
  const relative = relativeDays(followUp.dueDate)
  const tone =
    bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'warn' : bucket === 'completed' ? 'ok' : 'neutral'
  const label =
    bucket === 'completed'
      ? 'Completed'
      : bucket === 'missed'
        ? 'Missed'
        : bucket === 'overdue'
          ? relative.label
          : bucket === 'today'
            ? 'Due today'
            : relative.label

  return (
    <Card as="li" className="list-none" tone={bucket === 'overdue' ? 'warn' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-900">
            {patientName ? `${patientName} · ` : ''}
            {followUp.reason}
          </h3>
          <p className="mt-0.5 text-sm text-ink-500">
            Programme: {followUp.program} · due {formatDate(followUp.dueDate)}
          </p>
          {followUp.notes ? <p className="mt-1 text-sm text-ink-700">{followUp.notes}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={tone}>{label}</Badge>
          {followUp.pendingSync ? <PendingSyncBadge /> : null}
        </div>
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  )
}

export function DoseCard({
  slot,
  onTaken,
  onSkip,
}: {
  slot: DoseSlot
  onTaken: () => void
  onSkip: () => void
}) {
  const t = useT()
  const tone =
    slot.state === 'taken'
      ? 'ok'
      : slot.state === 'skipped'
        ? 'warn'
        : slot.state === 'due'
          ? 'info'
          : 'default'
  return (
    <Card as="li" className="list-none" tone={tone === 'default' ? 'default' : tone}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <IconChip name="pill" tone="care" size="sm" />
            <h3 className="text-lg leading-snug font-semibold text-ink-900">{slot.medicineName}</h3>
          </div>
          <p className="mt-1 text-[15px] text-ink-900">
            <strong>{slot.dose}</strong> · {TIMING_LABEL[slot.timing]}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
            <Icon name="clock" size={14} />
            {formatClock(slot.time)} · prescribed by {slot.prescribedBy}
          </p>
        </div>
        <Badge
          tone={
            slot.state === 'taken'
              ? 'ok'
              : slot.state === 'skipped'
                ? 'warn'
                : slot.state === 'due'
                  ? 'info'
                  : 'neutral'
          }
        >
          {slot.state === 'taken'
            ? 'Taken'
            : slot.state === 'skipped'
              ? 'Skipped'
              : slot.state === 'due'
                ? 'Due now'
                : 'Upcoming'}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          tone={slot.state === 'taken' ? 'subtle' : 'primary'}
          size="lg"
          icon={<Icon name="check" size={16} strokeWidth={2.4} />}
          onClick={onTaken}
        >
          {t('action.markTaken')}
        </Button>
        <Button size="lg" onClick={onSkip}>
          {t('action.skip')}
        </Button>
        <Link
          to={`/records?prescription=${slot.prescriptionId}`}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-card px-3 text-[15px] font-semibold text-care-700 transition-colors hover:bg-care-50"
        >
          {t('action.viewPrescription')}
        </Link>
      </div>
    </Card>
  )
}

export function ScheduleSummaryCard({ scheduleId }: { scheduleId: string }) {
  const schedule = useAppStore((s) => s.medicationSchedules.find((x) => x.id === scheduleId))
  if (!schedule) return null
  return (
    <Card as="li" className="list-none">
      <h3 className="text-base font-semibold text-ink-900">{schedule.medicineName}</h3>
      <p className="mt-1 text-[15px] text-ink-900">
        <strong>{schedule.dose}</strong> · {FREQUENCY_LABEL[schedule.frequency]} ·{' '}
        {TIMING_LABEL[schedule.timing]}
      </p>
      <p className="text-sm text-ink-500">
        Times: {schedule.times.map(formatClock).join(', ')} · until {formatDate(schedule.endDate)}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        Dose exactly as entered by {schedule.prescribedBy}. RuralCare AI never changes a dose.
      </p>
    </Card>
  )
}
