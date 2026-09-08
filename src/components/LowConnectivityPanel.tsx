import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDemoAction } from '@/components/DemoAction'
import { setOfflineSimulation } from '@/services/connectivity'
import { isEffectivelyOffline, useAppStore } from '@/store/useAppStore'
import { ashaForPatient, currentPatient } from '@/store/selectors'

/**
 * Low connectivity mode.
 *
 * On a slow or dropped link we stop rendering the wider dashboard and show
 * only what a patient actually needs to act: emergency, the ASHA worker, the
 * nearest facility and their own medicine reminders - all from cached demo
 * data, with no extra images or charts.
 */
export function LowConnectivityPanel() {
  const demo = useDemoAction()
  const store = useAppStore()
  const patient = currentPatient(store)
  const asha = ashaForPatient(store.ashas, patient)
  const offline = isEffectivelyOffline(store)
  const village = patient?.village ?? 'Kalyanpur'

  const nearest = [...store.facilities]
    .filter((f) => f.type === 'phc' || f.type === 'chc' || f.emergency)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
  const pending = store.offlineQueue.filter((q) => q.status !== 'synced').length

  return (
    <Card tone="warn">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink-900">
            {offline ? 'Offline - essential information only' : 'Low data mode'}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            Showing only the essentials for {village}, from data already saved on this device.
            {pending > 0 ? ` ${pending} action(s) are queued to sync.` : ''}
          </p>
        </div>
        <Badge tone={offline ? 'warn' : 'info'}>{offline ? 'Offline' : 'Low data'}</Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <LinkButton to="/emergency" tone="danger" size="lg" block icon="🚨">
          Emergency
        </LinkButton>
        {asha ? (
          <Button
            tone="primary"
            size="lg"
            block
            icon="📞"
            onClick={() => {
              demo.call(asha.name, asha.phone)
            }}
          >
            Call {asha.name} (ASHA)
          </Button>
        ) : null}
        <LinkButton to="/medications" size="lg" block icon="💊">
          My medicine reminders
        </LinkButton>
        <LinkButton to="/records" size="lg" block icon="📋">
          My health record
        </LinkButton>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-ink-700">Nearest facilities (cached)</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {nearest.map((facility) => (
            <li
              key={facility.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1 last:border-0"
            >
              <span className="text-ink-900">
                {facility.name}
                <span className="ml-1 text-ink-500">· {facility.distanceKm} km</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink-700">{facility.phone}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    demo.call(facility.name, facility.phone)
                  }}
                >
                  Call
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            store.setLowConnectivity(false)
          }}
        >
          Turn off low data mode
        </Button>
        {offline && store.simulatedOffline ? (
          <Button
            size="sm"
            onClick={() => {
              setOfflineSimulation(false)
            }}
          >
            Go back online (demo)
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
