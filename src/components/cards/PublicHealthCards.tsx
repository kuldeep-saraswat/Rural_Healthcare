import type { ReactNode } from 'react'
import type { EnvironmentReading, HealthAlert, MedicalCamp, WeatherCondition } from '@/types'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDemoAction } from '@/components/DemoAction'
import { useAppStore } from '@/store/useAppStore'
import { campSlotsLeft } from '@/store/selectors'
import { formatClock, formatDate } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

const ALERT_ICON = { outbreak: 'alert', weather: 'droplet', advisory: 'info' } as const satisfies
  Record<HealthAlert['kind'], IconName>

const ALERT_ICON_TONE = {
  danger: 'text-sos-600',
  warn: 'text-warn-600',
  info: 'text-info-600',
} as const

export function AlertCard({
  alert,
  compact,
  actions,
}: {
  alert: HealthAlert
  compact?: boolean
  actions?: ReactNode
}) {
  const tone = alert.severity === 'severe' ? 'danger' : alert.severity === 'warning' ? 'warn' : 'info'
  return (
    <Card as="li" className="list-none" tone={tone}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Icon name={ALERT_ICON[alert.kind]} size={20} className={ALERT_ICON_TONE[tone]} />
            <h3 className="text-lg leading-snug font-semibold text-ink-900">{alert.title}</h3>
          </div>
          <p className="mt-0.5 text-sm text-ink-500">
            Areas: {alert.areas.join(', ')} · issued {formatDate(alert.createdAt)} · valid till{' '}
            {formatDate(alert.expiresAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={tone}>{alert.severity}</Badge>
          {alert.demo ? <DemoBadge label="Demo public health alert" /> : null}
        </div>
      </div>

      <p className="mt-3 text-[15px] text-ink-900">{alert.summary}</p>

      {!compact ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AlertList title="Precautions" items={alert.precautions} marker="do" />
          <AlertList title="Symptoms to watch" items={alert.symptomsToWatch} marker="watch" />
          <AlertList title="What to do" items={alert.whatToDo} marker="next" />
          <AlertList title="What to avoid" items={alert.whatToAvoid} marker="avoid" />
        </div>
      ) : (
        <AlertList title="Precautions" items={alert.precautions.slice(0, 3)} marker="do" />
      )}

      <p className="mt-3 text-xs text-ink-500">
        Issued by {alert.createdBy}. This is a demo alert generated inside the prototype - it is not
        a verified outbreak report or an official government notification.
      </p>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  )
}

/** Markers carry meaning, so each list gets its own icon and colour. */
const MARKERS = {
  do: { icon: 'check', className: 'text-ok-600' },
  avoid: { icon: 'close', className: 'text-sos-600' },
  watch: { icon: 'eye', className: 'text-warn-600' },
  next: { icon: 'arrowRight', className: 'text-info-600' },
} as const satisfies Record<string, { icon: IconName; className: string }>

function AlertList({
  title,
  items,
  marker,
}: {
  title: string
  items: string[]
  marker: keyof typeof MARKERS
}) {
  if (!items.length) return null
  const { icon, className } = MARKERS[marker]
  return (
    <div>
      <h4 className="eyebrow text-ink-400">{title}</h4>
      <ul className="mt-1.5 space-y-1.5 text-sm text-ink-800">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <Icon name={icon} size={15} strokeWidth={2.2} className={`mt-0.5 ${className}`} />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WEATHER_META: Record<
  WeatherCondition,
  { icon: IconName; title: string; precautions: string[] }
> = {
  heat: {
    icon: 'sun',
    title: 'HEAT ALERT',
    precautions: [
      'Drink sufficient water through the day',
      'Avoid unnecessary outdoor activity during peak heat',
      'Stay in a cool, shaded place',
      'Watch for signs of heat illness - giddiness, cramps, confusion',
    ],
  },
  rain: {
    icon: 'droplet',
    title: 'RAIN / FLOOD HEALTH ALERT',
    precautions: [
      'Avoid contaminated water',
      'Maintain hand and food hygiene',
      'Use safe (boiled or filtered) drinking water',
      'Seek healthcare if fever, loose motions or vomiting appear',
    ],
  },
  flood: {
    icon: 'droplet',
    title: 'FLOOD HEALTH ALERT',
    precautions: [
      'Do not wade through flood water',
      'Use only safe drinking water',
      'Keep medicines and records above water level',
      'Contact ASHA or PHC if anyone develops fever or a wound',
    ],
  },
  cold: {
    icon: 'thermometer',
    title: 'COLD WAVE HEALTH ALERT',
    precautions: [
      'Keep elderly people and infants warm',
      'Avoid burning coal in a closed room',
      'Watch for breathing difficulty in asthma patients',
    ],
  },
  normal: {
    icon: 'sun',
    title: 'NORMAL CONDITIONS',
    precautions: ['No special weather precaution needed today'],
  },
}

export function EnvironmentCard({ reading }: { reading: EnvironmentReading }) {
  const meta = WEATHER_META[reading.condition]
  const tone = reading.condition === 'normal' ? 'default' : 'warn'
  return (
    <Card as="li" className="list-none" tone={tone}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-sm ring-1 ring-inset ${
                tone === 'warn'
                  ? 'bg-warn-100 text-warn-700 ring-warn-200'
                  : 'bg-care-50 text-care-700 ring-care-100'
              }`}
            >
              <Icon name={meta.icon} size={19} />
            </span>
            <h3 className="text-lg leading-snug font-semibold text-ink-900">{meta.title}</h3>
          </div>
          <p className="mt-1 text-sm text-ink-700">
            {reading.village} · {reading.temperatureC}°C · humidity {reading.humidityPct}% · rainfall{' '}
            {reading.rainfallMm} mm
          </p>
          <p className="text-sm text-ink-900">{reading.headline}</p>
        </div>
        <DemoBadge label="Demo weather data" />
      </div>
      <AlertList title="Precautions" items={meta.precautions} marker="do" />
      <p className="mt-3 text-xs text-ink-500">
        Weather values are fixed demo readings. A real deployment would read a live weather service
        for the village.
      </p>
    </Card>
  )
}

export function CampCard({
  camp,
  registered,
  onRegister,
  onCancel,
  extraActions,
}: {
  camp: MedicalCamp
  registered?: boolean
  onRegister?: () => void
  onCancel?: () => void
  extraActions?: ReactNode
}) {
  const demo = useDemoAction()
  const registrations = useAppStore((s) => s.campRegistrations)
  const facilities = useAppStore((s) => s.facilities)
  const doctors = useAppStore((s) => s.doctors)
  const ashas = useAppStore((s) => s.ashas)
  const slotsLeft = campSlotsLeft(camp, registrations)
  const organiser = facilities.find((f) => f.id === camp.organiserFacilityId)
  const asha = ashas.find((a) => a.id === camp.contactAshaId)
  const campDoctors = doctors.filter((d) => camp.doctorIds.includes(d.id))

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">{camp.name}</h3>
          <p className="text-sm text-ink-700">
            {camp.village} · {camp.distanceKm} km · {formatDate(camp.date)}
          </p>
          <p className="text-sm text-ink-900">
            {formatClock(camp.startTime)} - {formatClock(camp.endTime)}
          </p>
          {organiser ? (
            <p className="text-sm text-ink-500">Organised by {organiser.name}</p>
          ) : null}
          {campDoctors.length ? (
            <p className="text-sm text-ink-500">
              Doctor: {campDoctors.map((d) => `${d.name} (${d.specialty})`).join(', ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {camp.mobileUnit ? <Badge tone="info">Mobile medical unit</Badge> : null}
          <Badge
            tone={camp.status === 'completed' ? 'neutral' : slotsLeft > 0 ? 'ok' : 'warn'}
          >
            {camp.status === 'completed'
              ? 'Completed'
              : slotsLeft > 0
                ? `${slotsLeft} of ${camp.slotsTotal} slots free`
                : 'Slots full'}
          </Badge>
          {registered ? <Badge tone="ok">You are registered</Badge> : null}
        </div>
      </div>

      <div className="mt-3">
        <h4 className="eyebrow text-ink-400">Services</h4>
        <ul className="mt-1 grid gap-1 text-sm text-ink-900 sm:grid-cols-2">
          {camp.services.map((service) => (
            <li key={service} className="flex gap-2">
              <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 text-ok-600" />
              {service}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onRegister && !registered ? (
          <Button
            tone="primary"
            size="lg"
            icon={<Icon name="edit" size={16} />}
            disabled={slotsLeft === 0 || camp.status === 'completed'}
            onClick={onRegister}
          >
            Register
          </Button>
        ) : null}
        {onCancel && registered ? (
          <Button size="lg" onClick={onCancel}>
            Cancel registration
          </Button>
        ) : null}
        <Button
          size="lg"
          icon={<Icon name="compass" size={16} />}
          onClick={() => {
            demo.directions(camp.name, `${camp.village} (demo camp venue)`)
          }}
        >
          Directions
        </Button>
        {asha ? (
          <Button
            size="lg"
            icon={<Icon name="phone" size={16} />}
            onClick={() => {
              demo.call(`${asha.name} (ASHA)`, asha.phone)
            }}
          >
            Contact ASHA
          </Button>
        ) : null}
        {extraActions}
      </div>
    </Card>
  )
}
