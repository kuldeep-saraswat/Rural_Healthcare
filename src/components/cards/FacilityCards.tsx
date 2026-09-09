import { Link } from 'react-router-dom'
import type { Ambulance, AshaWorker, Facility, FacilityType } from '@/types'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Meter } from '@/components/ui/Charts'
import { useDemoAction } from '@/components/DemoAction'
import { useAppStore } from '@/store/useAppStore'
import { useT } from '@/services/i18n'
import { Icon, IconChip } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  phc: 'Primary Health Centre',
  chc: 'Community Health Centre',
  district_hospital: 'District Hospital',
  medical_college: 'Medical College',
  diagnostic_centre: 'Diagnostic Centre',
  pharmacy: 'Pharmacy',
  kiosk: 'Health Kiosk',
}

export const FACILITY_TYPE_ICON: Record<FacilityType, IconName> = {
  phc: 'clinic',
  chc: 'hospital',
  district_hospital: 'hospital',
  medical_college: 'book',
  diagnostic_centre: 'microscope',
  pharmacy: 'pill',
  kiosk: 'kiosk',
}

export function FacilityCard({
  facility,
  note,
  showResources = true,
}: {
  facility: Facility
  note?: string
  showResources?: boolean
}) {
  const t = useT()
  const demo = useDemoAction()
  const doctors = useAppStore((s) => s.doctors)
  const availableDoctorCount = doctors.filter(
    (d) => d.facilityId === facility.id && d.status === 'available',
  ).length
  const testsAvailable = facility.tests.filter((x) => x.status === 'available').length
  const medsAvailable = facility.medicines.filter((x) => x.status === 'available').length

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <IconChip name={FACILITY_TYPE_ICON[facility.type]} tone="care" size="sm" />
            <h3 className="text-lg leading-snug font-semibold text-ink-900">{facility.name}</h3>
          </div>
          <p className="mt-0.5 text-sm text-ink-700">
            {FACILITY_TYPE_LABEL[facility.type]} · {facility.village} · {facility.distanceKm} km
          </p>
          <p className="text-sm text-ink-500">{facility.timings}</p>
          {note ? <p className="mt-1 text-sm font-medium text-care-700">{note}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {facility.openNow ? <Badge tone="ok">Open now</Badge> : <Badge tone="neutral">Closed</Badge>}
          {facility.emergency ? <Badge tone="danger">24x7 emergency</Badge> : null}
          {facility.telemedicine ? <Badge tone="info">Telemedicine</Badge> : null}
        </div>
      </div>

      {showResources ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge tone={availableDoctorCount ? 'ok' : 'warn'}>
                {availableDoctorCount} doctor(s) available
              </Badge>
              <Badge tone={testsAvailable ? 'info' : 'neutral'}>{testsAvailable} test(s)</Badge>
              <Badge tone={medsAvailable ? 'info' : 'neutral'}>{medsAvailable} medicine(s)</Badge>
              {facility.ambulanceIds.length ? (
                <Badge tone="info">{facility.ambulanceIds.length} ambulance(s)</Badge>
              ) : null}
            </div>
            <ul className="mt-1 list-inside list-disc text-sm text-ink-700">
              {facility.services.slice(0, 4).map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>
          {facility.beds.total > 0 ? (
            <div className="space-y-2">
              <Meter
                label="Beds free"
                value={facility.beds.total - facility.beds.occupied}
                total={facility.beds.total}
                dangerAt={100}
              />
              {facility.icu.total > 0 ? (
                <Meter
                  label="ICU free"
                  value={facility.icu.total - facility.icu.occupied}
                  total={facility.icu.total}
                  dangerAt={100}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="lg"
          icon={<Icon name="phone" size={16} />}
          onClick={() => {
            demo.call(facility.name, facility.phone)
          }}
        >
          {t('action.call')}
        </Button>
        <Button
          size="lg"
          icon={<Icon name="compass" size={16} />}
          onClick={() => {
            demo.directions(facility.name, facility.address)
          }}
        >
          {t('action.directions')}
        </Button>
        <Link
          to={`/nearby?facility=${facility.id}`}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-card px-3 text-[15px] font-semibold text-care-700 transition-colors hover:bg-care-50"
        >
          Full details
        </Link>
      </div>
    </Card>
  )
}

export function AmbulanceCard({
  ambulance,
  onRequest,
  requesting,
}: {
  ambulance: Ambulance
  onRequest?: () => void
  requesting?: boolean
}) {
  const t = useT()
  const demo = useDemoAction()
  const available = ambulance.status === 'available'
  return (
    <Card as="li" className="list-none" tone={available ? 'danger' : 'default'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">{ambulance.code}</h3>
          <p className="text-sm text-ink-700">
            Driver {ambulance.driverName} · {ambulance.village}
          </p>
          <p className="mt-1 text-sm text-ink-900">
            <strong>{ambulance.distanceKm} km</strong> {t('emergency.away')} · {t('emergency.eta')}:{' '}
            <strong>{ambulance.etaMin} min</strong>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={available ? 'ok' : ambulance.status === 'busy' ? 'warn' : 'neutral'}>
            {available ? 'Available' : ambulance.status === 'busy' ? 'On another case' : 'Offline'}
          </Badge>
          {ambulance.hasOxygen ? <Badge tone="info">Oxygen on board</Badge> : null}
          <DemoBadge label="Demo dispatch" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onRequest ? (
          <Button
            tone="danger"
            size="xl"
            block
            disabled={!available || requesting}
            onClick={onRequest}
            className={available ? 'sos-pulse' : undefined}
          >
            {requesting ? 'Requesting...' : t('action.requestAmbulance')}
          </Button>
        ) : null}
        <Button
          size="lg"
          icon={<Icon name="phone" size={16} />}
          onClick={() => {
            demo.call(ambulance.code, ambulance.phone)
          }}
        >
          Call {ambulance.phone}
        </Button>
      </div>
    </Card>
  )
}

export function KioskCard({
  facility,
  onStart,
}: {
  facility: Facility
  onStart?: () => void
}) {
  const demo = useDemoAction()
  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">{facility.name}</h3>
          <p className="text-sm text-ink-700">
            {facility.village} · {facility.distanceKm} km · {facility.timings}
          </p>
        </div>
        {facility.openNow ? <Badge tone="ok">Open now</Badge> : <Badge tone="neutral">Closed</Badge>}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-900">
        {(facility.kioskServices ?? facility.services).map((service) => (
          <li key={service} className="flex gap-2">
            <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 text-ok-600" />
            {service}
          </li>
        ))}
      </ul>
      {facility.notes ? <p className="mt-2 text-sm text-ink-500">{facility.notes}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {onStart ? (
          <Button tone="primary" size="lg" onClick={onStart} icon={<Icon name="stethoscope" size={16} />}>
            Start Assisted Consultation
          </Button>
        ) : null}
        <Button
          size="lg"
          icon={<Icon name="compass" size={16} />}
          onClick={() => {
            demo.directions(facility.name, facility.address)
          }}
        >
          Directions
        </Button>
      </div>
    </Card>
  )
}

export function AshaCard({ asha }: { asha: AshaWorker }) {
  const t = useT()
  const demo = useDemoAction()
  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">{asha.name}</h3>
          <p className="text-sm text-ink-700">ASHA Worker · {asha.village}</p>
          <p className="text-sm text-ink-500">
            {asha.distanceKm} km away · covers {asha.villagesCovered.join(', ')}
          </p>
        </div>
        <Badge tone={asha.status === 'available' ? 'ok' : 'neutral'}>
          {asha.status === 'available' ? t('status.available') : t('status.unavailable')}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          tone="primary"
          size="lg"
          icon={<Icon name="phone" size={16} />}
          onClick={() => {
            demo.call(asha.name, asha.phone)
          }}
        >
          {t('action.call')}
        </Button>
        <Button
          size="lg"
          icon={<Icon name="send" size={16} />}
          onClick={() => {
            demo.message(asha.name, asha.phone)
          }}
        >
          {t('action.message')}
        </Button>
      </div>
    </Card>
  )
}
