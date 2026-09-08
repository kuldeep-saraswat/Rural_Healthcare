import { useSearchParams } from 'react-router-dom'
import { DoctorCard } from '@/components/cards/DoctorCard'
import { SectionHeading } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { useAppStore } from '@/store/useAppStore'
import { useT } from '@/services/i18n'

type Filter = 'available' | 'emergency' | 'telemedicine' | 'all'

export function DoctorsPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const doctors = useAppStore((s) => s.doctors)
  const facilities = useAppStore((s) => s.facilities)

  const filter: Filter = params.get('emergency') === '1'
    ? 'emergency'
    : ((params.get('filter') as Filter) ?? 'available')

  const setFilter = (next: Filter) => {
    const updated = new URLSearchParams(params)
    updated.delete('emergency')
    if (next === 'emergency') updated.set('emergency', '1')
    else updated.set('filter', next)
    setParams(updated, { replace: true })
  }

  const list = doctors
    .filter((doctor) => {
      if (filter === 'available') return doctor.status === 'available'
      if (filter === 'emergency') return doctor.status === 'available' && doctor.emergencyAvailable
      if (filter === 'telemedicine') return doctor.status === 'available' && doctor.telemedicine
      return true
    })
    .map((doctor) => ({ doctor, facility: facilities.find((f) => f.id === doctor.facilityId) }))
    .sort((a, b) => (a.facility?.distanceKm ?? 99) - (b.facility?.distanceKm ?? 99))

  const availableCount = doctors.filter((d) => d.status === 'available').length

  return (
    <div className="space-y-4">
      <SectionHeading
        sub={`${availableCount} of ${doctors.length} doctors are marked available in the demo resource data right now.`}
      >
        {filter === 'emergency' ? 'Emergency doctors' : 'Available Doctors Now'}
      </SectionHeading>

      <Tabs
        ariaLabel="Filter doctors"
        active={filter}
        onChange={(id) => {
          setFilter(id as Filter)
        }}
        items={[
          { id: 'available', label: 'Available now', badge: availableCount },
          {
            id: 'emergency',
            label: 'Emergency care',
            badge: doctors.filter((d) => d.status === 'available' && d.emergencyAvailable).length,
          },
          {
            id: 'telemedicine',
            label: 'Video consultation',
            badge: doctors.filter((d) => d.status === 'available' && d.telemedicine).length,
          },
          { id: 'all', label: 'All doctors', badge: doctors.length },
        ]}
      />

      {list.length ? (
        <ul className="space-y-3">
          {list.map(({ doctor, facility }) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              facility={facility}
              emergency={filter === 'emergency'}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="👨‍⚕️"
          title={t('empty.noDoctors')}
          body="Doctor availability is controlled from the facility and admin dashboards in this prototype. You can still visit the nearest PHC or contact your ASHA worker."
          action={
            <>
              <LinkButton to="/nearby" tone="primary">
                Nearby healthcare
              </LinkButton>
              <LinkButton to="/asha-contact">Contact ASHA</LinkButton>
            </>
          }
        />
      )}

      <Callout tone="neutral" icon="🧪" title="Prototype only">
        Calls and video consultations are simulated. The consultation room shows how a real
        teleconsultation would work and is ready for a WebRTC implementation later.
      </Callout>
    </div>
  )
}
