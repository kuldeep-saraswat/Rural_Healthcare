import type { ReactNode } from 'react'
import type { EnvironmentReading, HealthAlert, MedicalCamp, WeatherCondition } from '@/types'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDemoAction } from '@/components/DemoAction'
import { useAppStore } from '@/store/useAppStore'
import { campSlotsLeft } from '@/store/selectors'
import { formatClock, formatDate } from '@/lib/utils'

const ALERT_ICON = { outbreak: '⚠️', weather: '🌦️', advisory: 'ℹ️' } as const

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
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-xl">
              {ALERT_ICON[alert.kind]}
            </span>
            <h3 className="text-lg font-bold text-ink-900">{alert.title}</h3>
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
          <AlertList title="Precautions" items={alert.precautions} icon="✓" />
          <AlertList title="Symptoms to watch" items={alert.symptomsToWatch} icon="•" />
          <AlertList title="What to do" items={alert.whatToDo} icon="→" />
          <AlertList title="What to avoid" items={alert.whatToAvoid} icon="✕" />
        </div>
      ) : (
        <AlertList title="Precautions" items={alert.precautions.slice(0, 3)} icon="✓" />
      )}

      <p className="mt-3 text-xs text-ink-500">
        Issued by {alert.createdBy}. This is a demo alert generated inside the prototype - it is not
        a verified outbreak report or an official government notification.
      </p>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  )
}

function AlertList({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="text-sm font-semibold text-ink-700">{title}</h4>
      <ul className="mt-1 space-y-1 text-sm text-ink-900">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-ink-500">
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WEATHER_META: Record<
  WeatherCondition,
  { icon: string; title: string; precautions: string[] }
> = {
  heat: {
    icon: '☀️',
    title: 'HEAT ALERT',
    precautions: [
      'Drink sufficient water through the day',
      'Avoid unnecessary outdoor activity during peak heat',
      'Stay in a cool, shaded place',
      'Watch for signs of heat illness - giddiness, cramps, confusion',
    ],
  },
  rain: {
    icon: '🌧️',
    title: 'RAIN / FLOOD HEALTH ALERT',
    precautions: [
      'Avoid contaminated water',
      'Maintain hand and food hygiene',
      'Use safe (boiled or filtered) drinking water',
      'Seek healthcare if fever, loose motions or vomiting appear',
    ],
  },
  flood: {
    icon: '🌊',
    title: 'FLOOD HEALTH ALERT',
    precautions: [
      'Do not wade through flood water',
      'Use only safe drinking water',
      'Keep medicines and records above water level',
      'Contact ASHA or PHC if anyone develops fever or a wound',
    ],
  },
  cold: {
    icon: '❄️',
    title: 'COLD WAVE HEALTH ALERT',
    precautions: [
      'Keep elderly people and infants warm',
      'Avoid burning coal in a closed room',
      'Watch for breathing difficulty in asthma patients',
    ],
  },
  normal: {
    icon: '🌤️',
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
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">
              {meta.icon}
            </span>
            <h3 className="text-lg font-bold text-ink-900">{meta.title}</h3>
          </div>
          <p className="mt-1 text-sm text-ink-700">
            {reading.village} · {reading.temperatureC}°C · humidity {reading.humidityPct}% · rainfall{' '}
            {reading.rainfallMm} mm
          </p>
          <p className="text-sm text-ink-900">{reading.headline}</p>
        </div>
        <DemoBadge label="Demo weather data" />
      </div>
      <AlertList title="Precautions" items={meta.precautions} icon="✓" />
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
          <h3 className="text-lg font-semibold text-ink-900">{camp.name}</h3>
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
        <h4 className="text-sm font-semibold text-ink-700">Services</h4>
        <ul className="mt-1 grid gap-1 text-sm text-ink-900 sm:grid-cols-2">
          {camp.services.map((service) => (
            <li key={service} className="flex gap-2">
              <span aria-hidden="true" className="text-ok-700">
                ✓
              </span>
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
            icon="📝"
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
          icon="🧭"
          onClick={() => {
            demo.directions(camp.name, `${camp.village} (demo camp venue)`)
          }}
        >
          Directions
        </Button>
        {asha ? (
          <Button
            size="lg"
            icon="📞"
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
