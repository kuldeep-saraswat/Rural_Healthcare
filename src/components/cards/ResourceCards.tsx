import type { Facility, FacilityStockEntry, FacilityTestEntry } from '@/types'
import { Badge, StockBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDemoAction } from '@/components/DemoAction'
import { medicineById, testById, vaccineById } from '@/data/catalog'
import { formatDateTime } from '@/lib/utils'
import { useT } from '@/services/i18n'

export function MedicineAvailabilityCard({
  medicineId,
  facility,
  entry,
}: {
  medicineId: string
  facility: Facility
  entry?: FacilityStockEntry
}) {
  const t = useT()
  const demo = useDemoAction()
  const medicine = medicineById(medicineId)
  const stock = entry ?? facility.medicines.find((m) => m.itemId === medicineId)
  if (!medicine || !stock) return null

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-900">{medicine.name}</h3>
          <p className="text-sm text-ink-500">{medicine.generic}</p>
          <p className="mt-1 text-sm text-ink-900">
            {facility.name} · {facility.distanceKm} km
          </p>
          <p className="text-xs text-ink-500">Stock updated {formatDateTime(stock.updatedAt)}</p>
        </div>
        <StockBadge status={stock.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="lg"
          icon="📞"
          onClick={() => {
            demo.call(facility.name, facility.phone)
          }}
        >
          {t('action.call')}
        </Button>
        <Button
          size="lg"
          icon="🧭"
          onClick={() => {
            demo.directions(facility.name, facility.address)
          }}
        >
          {t('action.directions')}
        </Button>
      </div>
      {stock.status === 'out' ? (
        <p className="mt-2 text-xs text-ink-500">
          Out of stock here. Try another facility in the list, or ask your ASHA worker.
        </p>
      ) : null}
    </Card>
  )
}

export function TestAvailabilityCard({
  testId,
  facility,
  entry,
}: {
  testId: string
  facility: Facility
  entry?: FacilityTestEntry
}) {
  const t = useT()
  const demo = useDemoAction()
  const test = testById(testId)
  const detail = entry ?? facility.tests.find((x) => x.itemId === testId)
  if (!test || !detail) return null

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-900">{test.name}</h3>
          <p className="mt-1 text-sm text-ink-900">
            {facility.name} · {facility.distanceKm} km
          </p>
          <p className="text-sm text-ink-500">
            Report in about {detail.reportInHours} hour(s)
            {test.typicalPriceInr > 0
              ? ` · indicative cost ₹${test.typicalPriceInr}`
              : ' · free at government facility'}
          </p>
        </div>
        <Badge tone={detail.status === 'available' ? 'ok' : 'neutral'}>
          {detail.status === 'available' ? t('status.available') : t('status.unavailable')}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="lg"
          icon="🧭"
          onClick={() => {
            demo.directions(facility.name, facility.address)
          }}
        >
          {t('action.directions')}
        </Button>
        <Button
          size="lg"
          icon="📞"
          onClick={() => {
            demo.call(facility.name, facility.phone)
          }}
        >
          {t('action.call')}
        </Button>
      </div>
    </Card>
  )
}

export function VaccineAvailabilityCard({
  vaccineId,
  facility,
  onRegister,
  registered,
  onRemind,
}: {
  vaccineId: string
  facility: Facility
  onRegister?: () => void
  registered?: boolean
  onRemind?: () => void
}) {
  const t = useT()
  const demo = useDemoAction()
  const vaccine = vaccineById(vaccineId)
  const stock = facility.vaccines.find((v) => v.itemId === vaccineId)
  if (!vaccine || !stock) return null

  return (
    <Card as="li" className="list-none">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-ink-900">{vaccine.name}</h3>
          <p className="text-sm text-ink-500">Eligibility: {vaccine.eligibility}</p>
          <p className="mt-1 text-sm text-ink-900">
            {facility.name} · {facility.distanceKm} km
          </p>
          {stock.nextSlot ? (
            <p className="text-sm text-ink-700">Next session: {stock.nextSlot}</p>
          ) : null}
        </div>
        <StockBadge status={stock.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onRegister ? (
          <Button
            tone={registered ? 'subtle' : 'primary'}
            size="lg"
            disabled={registered || stock.status === 'out'}
            onClick={onRegister}
            icon={registered ? '✓' : '📝'}
          >
            {registered ? 'Registered (demo)' : t('action.register')}
          </Button>
        ) : null}
        {onRemind ? (
          <Button size="lg" icon="🔔" onClick={onRemind}>
            Set reminder
          </Button>
        ) : null}
        <Button
          size="lg"
          icon="📞"
          onClick={() => {
            demo.call(facility.name, facility.phone)
          }}
        >
          {t('action.call')}
        </Button>
      </div>
    </Card>
  )
}
