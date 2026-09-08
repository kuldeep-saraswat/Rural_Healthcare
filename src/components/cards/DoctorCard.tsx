import { useNavigate } from 'react-router-dom'
import type { Doctor, Facility } from '@/types'
import { Badge, ServiceBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDemoAction } from '@/components/DemoAction'
import { useT } from '@/services/i18n'

export function DoctorCard({
  doctor,
  facility,
  emergency,
  compact,
}: {
  doctor: Doctor
  facility?: Facility
  emergency?: boolean
  compact?: boolean
}) {
  const t = useT()
  const demo = useDemoAction()
  const navigate = useNavigate()
  const available = doctor.status === 'available'

  return (
    <Card as="li" className="list-none" tone={emergency && available ? 'danger' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-900">{doctor.name}</h3>
          <p className="text-sm text-ink-700">{doctor.specialty}</p>
          {facility ? (
            <p className="mt-0.5 text-sm text-ink-500">
              {facility.name} · {facility.distanceKm} km
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ServiceBadge
            status={doctor.status}
            label={available ? t('status.available') : t('status.unavailable')}
          />
          {doctor.emergencyAvailable ? <Badge tone="danger">Emergency care</Badge> : null}
        </div>
      </div>

      {!compact ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-500 uppercase">Next slot</dt>
            <dd className="text-ink-900">{doctor.nextSlot}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500 uppercase">Experience</dt>
            <dd className="text-ink-900">{doctor.experienceYears} years</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500 uppercase">Speaks</dt>
            <dd className="text-ink-900">
              {doctor.languages
                .map((l) => ({ hi: 'Hindi', en: 'English', mr: 'Marathi' })[l])
                .join(', ')}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          tone="default"
          size="lg"
          icon="📞"
          onClick={() => {
            demo.call(doctor.name, doctor.phone)
          }}
        >
          {t('action.call')}
        </Button>
        {doctor.telemedicine ? (
          <Button
            tone={available ? 'primary' : 'default'}
            size="lg"
            icon="🎥"
            disabled={!available}
            onClick={() => {
              navigate(`/consult/${doctor.id}`)
            }}
          >
            {t('action.video')}
          </Button>
        ) : null}
      </div>
      {!available ? (
        <p className="mt-2 text-xs text-ink-500">
          This doctor is marked not available in the demo resource data right now.
        </p>
      ) : null}
    </Card>
  )
}
