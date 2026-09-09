import { useSearchParams } from 'react-router-dom'
import type { Facility, FacilityType } from '@/types'
import { FacilityCard, FACILITY_TYPE_ICON, FACILITY_TYPE_LABEL } from '@/components/cards/FacilityCards'
import { Badge, StockBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, PageHeader } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Meter } from '@/components/ui/Charts'
import { EmptyState } from '@/components/ui/States'
import { useAppStore } from '@/store/useAppStore'
import { medicineById, testById, vaccineById } from '@/data/catalog'
import { upcomingCamps } from '@/store/selectors'
import { cx, formatDate, formatDateTime } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

const TYPE_OPTIONS: FacilityType[] = [
  'phc',
  'chc',
  'district_hospital',
  'medical_college',
  'kiosk',
  'diagnostic_centre',
  'pharmacy',
]

const EXTRA_FILTERS = [
  { id: 'open', label: 'Open now' },
  { id: 'doctor', label: 'Doctor available' },
  { id: 'test', label: 'Test available' },
  { id: 'medicine', label: 'Medicine available' },
  { id: 'emergency', label: 'Emergency available' },
  { id: 'telemedicine', label: 'Telemedicine' },
] as const

export function NearbyPage() {
  const [params, setParams] = useSearchParams()
  const store = useAppStore()

  const typeParam = params.get('type') ?? ''
  const filterParam = params.get('filter') ?? ''
  const selectedTypes = typeParam.split(',').filter(Boolean) as FacilityType[]
  const activeFilters = filterParam.split(',').filter(Boolean)
  const focusedId = params.get('facility')

  const toggle = (key: 'type' | 'filter', value: string) => {
    const updated = new URLSearchParams(params)
    const current = updated.get(key)?.split(',').filter(Boolean) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    if (next.length) updated.set(key, next.join(','))
    else updated.delete(key)
    updated.delete('facility')
    setParams(updated, { replace: true })
  }

  const list = (() => {
    const selected = typeParam.split(',').filter(Boolean)
    const filters = filterParam.split(',').filter(Boolean)
    return store.facilities
      .filter((f) => (selected.length ? selected.includes(f.type) : true))
      .filter((f) => (filters.includes('open') ? f.openNow : true))
      .filter((f) => (filters.includes('emergency') ? f.emergency : true))
      .filter((f) => (filters.includes('telemedicine') ? f.telemedicine : true))
      .filter((f) =>
        filters.includes('doctor')
          ? store.doctors.some((d) => d.facilityId === f.id && d.status === 'available')
          : true,
      )
      .filter((f) =>
        filters.includes('test') ? f.tests.some((t) => t.status === 'available') : true,
      )
      .filter((f) =>
        filters.includes('medicine') ? f.medicines.some((m) => m.status === 'available') : true,
      )
      .sort((a, b) => a.distanceKm - b.distanceKm)
  })()

  const focused = focusedId ? store.facilities.find((f) => f.id === focusedId) : undefined
  const nearbyCamps = upcomingCamps(store.camps).slice(0, 3)

  if (focused) {
    return (
      <FacilityDetail
        facility={focused}
        onBack={() => {
          const updated = new URLSearchParams(params)
          updated.delete('facility')
          setParams(updated, { replace: true })
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="pin"
        eyebrow="Find care"
        title="Nearby Healthcare"
        description="Distances and availability are fictional demo values for the Kalyanpur area."
      />

      <Card>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-700">Facility type</legend>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((type) => {
              const active = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    toggle('type', type)
                  }}
                  className={cx(
                    'inline-flex min-h-11 items-center gap-2 rounded-card border px-3 text-sm font-medium',
                    active
                      ? 'border-care-600 bg-care-600 text-white'
                      : 'border-hairline bg-surface text-ink-700 hover:bg-care-50',
                  )}
                >
                  <Icon name={FACILITY_TYPE_ICON[type]} size={16} />
                  {FACILITY_TYPE_LABEL[type]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-ink-700">Also show only</legend>
          <div className="flex flex-wrap gap-2">
            {EXTRA_FILTERS.map((filter) => {
              const active = activeFilters.includes(filter.id)
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    toggle('filter', filter.id)
                  }}
                  className={cx(
                    'inline-flex min-h-11 items-center rounded-card border px-3 text-sm font-medium',
                    active
                      ? 'border-care-600 bg-care-600 text-white'
                      : 'border-hairline bg-surface text-ink-700 hover:bg-care-50',
                  )}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        {selectedTypes.length || activeFilters.length ? (
          <div className="mt-4">
            <Button
              onClick={() => {
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : null}
      </Card>

      {store.lowConnectivity ? (
        <Callout tone="warn" icon="trendDown" title="Low data mode">
          Showing the five nearest facilities from cached data, without resource details, to keep
          this page light on a slow connection.
        </Callout>
      ) : null}

      <p className="text-sm text-ink-500">
        {list.length} facility(ies) match. Sorted by distance.
      </p>

      {!store.lowConnectivity && nearbyCamps.length ? (
        <Callout
          tone="info"
          icon="tent"
          title={`${nearbyCamps.length} medical camp(s) coming to villages near you`}
          actions={<LinkButton to="/camps">Open medical camps</LinkButton>}
        >
          {nearbyCamps
            .slice(0, 2)
            .map((camp) => `${camp.name} - ${formatDate(camp.date)}`)
            .join(' · ')}
        </Callout>
      ) : null}

      {list.length ? (
        <ul className="space-y-3">
          {(store.lowConnectivity ? list.slice(0, 5) : list).map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              showResources={!store.lowConnectivity}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="pin"
          title="No facility matches these filters"
          body="Try removing a filter, or ask the assistant what you need."
          action={
            <>
              <Button
                tone="primary"
                onClick={() => {
                  setParams(new URLSearchParams(), { replace: true })
                }}
              >
                Clear filters
              </Button>
              <LinkButton to="/ai">Ask the assistant</LinkButton>
            </>
          }
        />
      )}
    </div>
  )
}

function FacilityDetail({ facility, onBack }: { facility: Facility; onBack: () => void }) {
  const store = useAppStore()
  const doctors = store.doctors.filter((d) => d.facilityId === facility.id)
  const ambulances = store.ambulances.filter((a) => a.facilityId === facility.id)

  return (
    <div className="space-y-4">
      <Button onClick={onBack} icon={<Icon name="arrowLeft" size={16} />}>
        Back to list
      </Button>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl leading-tight font-bold tracking-tight text-ink-900">
              <Icon name={FACILITY_TYPE_ICON[facility.type]} size={18} className="text-care-600" />
              {facility.name}
            </h1>
            <p className="mt-1 text-sm text-ink-700">
              {FACILITY_TYPE_LABEL[facility.type]} · {facility.village} · {facility.distanceKm} km
            </p>
            <p className="text-sm text-ink-500">{facility.address}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {facility.openNow ? <Badge tone="ok">Open now</Badge> : <Badge tone="neutral">Closed</Badge>}
            {facility.emergency ? <Badge tone="danger">24x7 emergency</Badge> : null}
            {facility.telemedicine ? <Badge tone="info">Telemedicine</Badge> : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <KeyValue label="Timings">{facility.timings}</KeyValue>
          <KeyValue label="Contact">{facility.phone}</KeyValue>
          <KeyValue label="Ambulances">
            {ambulances.length
              ? ambulances.map((a) => `${a.code} (${a.status})`).join(', ')
              : 'None attached'}
          </KeyValue>
        </dl>

        {facility.beds.total > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Services</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-900">
            {(facility.kioskServices ?? facility.services).map((service) => (
              <li key={service} className="flex gap-2">
                <Icon name="check" size={15} strokeWidth={2.4} className="mt-0.5 text-ok-600" />
                {service}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Doctors</h2>
          {doctors.length ? (
            <ul className="mt-2 space-y-2">
              {doctors.map((doctor) => (
                <li key={doctor.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-ink-900">{doctor.name}</span>{' '}
                    <span className="text-sm text-ink-500">{doctor.specialty}</span>
                  </span>
                  <Badge tone={doctor.status === 'available' ? 'ok' : 'neutral'}>
                    {doctor.status === 'available' ? 'Available' : 'Not available'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">No doctor posted at this facility.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Tests</h2>
          {facility.tests.length ? (
            <ul className="mt-2 space-y-2">
              {facility.tests.map((entry) => (
                <li key={entry.itemId} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink-900">{testById(entry.itemId)?.name ?? entry.itemId}</span>
                  <Badge tone={entry.status === 'available' ? 'ok' : 'neutral'}>
                    {entry.status === 'available' ? 'Available' : 'Not available'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">No diagnostic services listed.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Medicines</h2>
          {facility.medicines.length ? (
            <ul className="mt-2 space-y-2">
              {facility.medicines.map((entry) => (
                <li key={entry.itemId} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink-900">
                    {medicineById(entry.itemId)?.name ?? entry.itemId}
                    <span className="ml-2 text-xs text-ink-500">
                      updated {formatDateTime(entry.updatedAt)}
                    </span>
                  </span>
                  <StockBadge status={entry.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">No medicine stock listed.</p>
          )}
        </Card>

        {facility.vaccines.length ? (
          <Card>
            <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">Vaccines</h2>
            <ul className="mt-2 space-y-2">
              {facility.vaccines.map((entry) => (
                <li key={entry.itemId} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink-900">
                    {vaccineById(entry.itemId)?.name ?? entry.itemId}
                    {entry.nextSlot ? (
                      <span className="ml-2 text-xs text-ink-500">next: {entry.nextSlot}</span>
                    ) : null}
                  </span>
                  <StockBadge status={entry.status} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <ul>
        <FacilityCard facility={facility} showResources={false} />
      </ul>
    </div>
  )
}
