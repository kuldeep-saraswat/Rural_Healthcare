import { useState } from 'react'
import type { ServiceStatus, StockStatus } from '@/types'
import { Badge, RiskBadge, StockBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, SectionHeading, StatTile } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Meter } from '@/components/ui/Charts'
import { Dialog } from '@/components/ui/Dialog'
import { Field, FieldRow, Select, TextInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Timeline } from '@/components/ui/Timeline'
import { useToast } from '@/components/ui/Toast'
import { ReferralCard } from '@/components/cards/CareCards'
import { CampCard } from '@/components/cards/PublicHealthCards'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { facilityPressure } from '@/services/ai/decisionSupport'
import { MEDICINE_CATALOG, TEST_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import { dayKeyOffset, formatDate, formatDateTime, pct } from '@/lib/utils'

function useFacility() {
  const store = useAppStore()
  const user = currentUser(store)
  const facility = store.facilities.find((f) => f.id === user.facilityId)
  return { store, user, facility }
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function FacilityOverviewPage() {
  const { store, facility } = useFacility()
  if (!facility) {
    return <EmptyState icon="🏥" title="No facility linked to this account" />
  }
  const pressure = facilityPressure(store).find((p) => p.facility.id === facility.id)
  const doctors = store.doctors.filter((d) => d.facilityId === facility.id)
  const availableDoctors = doctors.filter((d) => d.status === 'available').length
  const incomingReferrals = store.referrals.filter(
    (r) => r.toFacilityId === facility.id && r.status !== 'completed' && r.status !== 'cancelled',
  )
  const emergencies = store.emergencyRequests.filter(
    (e) => e.destinationFacilityId === facility.id && !['completed', 'no_ambulance'].includes(e.status),
  )
  const ambulances = store.ambulances.filter((a) => a.facilityId === facility.id)
  const lowMedicines = facility.medicines.filter((m) => m.status !== 'available')
  const lowVaccines = facility.vaccines.filter((v) => v.status !== 'available')

  return (
    <div className="space-y-4">
      <SectionHeading sub={`${facility.name} · ${facility.village} · ${facility.timings}`}>
        Facility dashboard
      </SectionHeading>

      {emergencies.length ? (
        <Callout
          tone="danger"
          icon="🚑"
          title={`${emergencies.length} incoming emergency case(s)`}
          actions={
            <LinkButton to="/facility/emergency" tone="danger">
              Open emergency alerts
            </LinkButton>
          }
        >
          A demo ambulance has been assigned and a pre-arrival alert sent. No real ambulance is on
          the way.
        </Callout>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Doctors available"
          value={`${availableDoctors}/${doctors.length}`}
          tone={availableDoctors ? 'ok' : 'danger'}
        />
        <StatTile
          label="Incoming referrals"
          value={incomingReferrals.length}
          tone={incomingReferrals.length ? 'info' : 'default'}
        />
        <StatTile
          label="Beds occupied"
          value={`${pct(facility.beds.occupied, facility.beds.total)}%`}
          hint={`${facility.beds.occupied} of ${facility.beds.total}`}
          tone={pct(facility.beds.occupied, facility.beds.total) >= 85 ? 'danger' : 'default'}
        />
        <StatTile
          label="Stock alerts"
          value={lowMedicines.length + lowVaccines.length}
          tone={lowMedicines.length + lowVaccines.length ? 'warn' : 'ok'}
        />
      </div>

      {pressure ? (
        <Card tone={pressure.level === 'high' ? 'danger' : pressure.level === 'watch' ? 'warn' : 'ok'}>
          <h2 className="text-lg font-semibold text-ink-900">
            Facility pressure
            <span className="ml-2 align-middle text-xs font-normal text-ink-500">
              decision support
            </span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Meter label="Beds occupied" value={facility.beds.occupied} total={facility.beds.total} />
            {facility.icu.total > 0 ? (
              <Meter label="ICU occupied" value={facility.icu.occupied} total={facility.icu.total} />
            ) : null}
          </div>
          {pressure.notes.length ? (
            <ul className="mt-3 space-y-1 text-sm text-ink-900">
              {pressure.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span aria-hidden="true">⚠️</span>
                  {note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-700">No pressure signals right now.</p>
          )}
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Ambulances</h2>
        {ambulances.length ? (
          <ul className="mt-2 space-y-2">
            {ambulances.map((ambulance) => (
              <li
                key={ambulance.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium text-ink-900">{ambulance.code}</span>
                  <span className="block text-xs text-ink-500">
                    {ambulance.driverName} · {ambulance.distanceKm} km · ETA {ambulance.etaMin} min
                  </span>
                </span>
                <Badge
                  tone={
                    ambulance.status === 'available'
                      ? 'ok'
                      : ambulance.status === 'busy'
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  {ambulance.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">No ambulance attached to this facility.</p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <LinkButton to="/facility/resources" tone="primary" size="lg">
          Manage resources
        </LinkButton>
        <LinkButton to="/facility/referrals" size="lg">
          Incoming referrals
        </LinkButton>
        <LinkButton to="/facility/camps" size="lg">
          Medical camps
        </LinkButton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resource management
// ---------------------------------------------------------------------------

export function FacilityResourcesPage() {
  const toast = useToast()
  const { store, facility } = useFacility()
  const [tab, setTab] = useState('doctors')

  if (!facility) {
    return <EmptyState icon="🏥" title="No facility linked to this account" />
  }

  const doctors = store.doctors.filter((d) => d.facilityId === facility.id)
  const ambulances = store.ambulances.filter((a) => a.facilityId === facility.id)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Changes here immediately change what patients see in the finder, the doctor list and emergency availability.">
        Resource management
      </SectionHeading>

      <Callout tone="info" icon="🔗" title="Connected demo">
        Mark a doctor unavailable and they disappear from the patient-side &ldquo;Available Doctors
        Now&rdquo; list. Set a medicine out of stock and the medicine finder shows it as out of
        stock.
      </Callout>

      <Tabs
        ariaLabel="Resource type"
        active={tab}
        onChange={setTab}
        items={[
          { id: 'doctors', label: 'Doctors', badge: doctors.length },
          { id: 'tests', label: 'Tests', badge: facility.tests.length },
          { id: 'medicines', label: 'Medicines', badge: facility.medicines.length },
          { id: 'vaccines', label: 'Vaccines', badge: facility.vaccines.length },
          { id: 'ambulances', label: 'Ambulances', badge: ambulances.length },
          { id: 'beds', label: 'Beds & ICU' },
        ]}
      />

      <TabPanel id="doctors" active={tab}>
        <Card>
          {doctors.length ? (
            <ul className="space-y-3">
              {doctors.map((doctor) => (
                <li
                  key={doctor.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3 last:border-0"
                >
                  <div>
                    <span className="font-medium text-ink-900">{doctor.name}</span>
                    <span className="block text-sm text-ink-500">
                      {doctor.specialty} · updated {formatDateTime(doctor.updatedAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={doctor.status === 'available' ? 'ok' : 'neutral'}>
                      {doctor.status === 'available' ? 'Available' : 'Not available'}
                    </Badge>
                    <Button
                      size="sm"
                      tone={doctor.status === 'available' ? 'default' : 'primary'}
                      onClick={() => {
                        const next: ServiceStatus =
                          doctor.status === 'available' ? 'unavailable' : 'available'
                        store.setDoctorStatus(doctor.id, next)
                        toast.show({
                          tone: next === 'available' ? 'ok' : 'warn',
                          title: `${doctor.name} marked ${next}`,
                          body: 'Patient-side availability has changed.',
                        })
                      }}
                    >
                      {doctor.status === 'available' ? 'Mark unavailable' : 'Mark available'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        store.setDoctorEmergencyAvailable(doctor.id, !doctor.emergencyAvailable)
                      }}
                    >
                      {doctor.emergencyAvailable ? 'Remove from emergency' : 'Add to emergency'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="👨‍⚕️" title="No doctors posted here" />
          )}
        </Card>
      </TabPanel>

      <TabPanel id="tests" active={tab}>
        <Card>
          <ul className="space-y-2">
            {TEST_CATALOG.map((test) => {
              const entry = facility.tests.find((t) => t.itemId === test.id)
              const status: ServiceStatus = entry?.status ?? 'unavailable'
              return (
                <li
                  key={test.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="text-ink-900">{test.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={status === 'available' ? 'ok' : 'neutral'}>
                      {status === 'available' ? 'Available' : 'Not available'}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        store.setFacilityTestStatus(
                          facility.id,
                          test.id,
                          status === 'available' ? 'unavailable' : 'available',
                        )
                      }}
                    >
                      Toggle
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </TabPanel>

      <TabPanel id="medicines" active={tab}>
        <Card>
          <ul className="space-y-2">
            {MEDICINE_CATALOG.map((medicine) => {
              const entry = facility.medicines.find((m) => m.itemId === medicine.id)
              const status: StockStatus = entry?.status ?? 'out'
              return (
                <li
                  key={medicine.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="text-ink-900">{medicine.name}</span>
                  <span className="flex items-center gap-2">
                    <StockBadge status={status} />
                    {(['available', 'low', 'out'] as StockStatus[]).map((option) => (
                      <Button
                        key={option}
                        size="sm"
                        tone={status === option ? 'primary' : 'default'}
                        onClick={() => {
                          store.setFacilityMedicineStatus(facility.id, medicine.id, option)
                        }}
                      >
                        {option === 'available' ? 'In stock' : option === 'low' ? 'Low' : 'Out'}
                      </Button>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </TabPanel>

      <TabPanel id="vaccines" active={tab}>
        <Card>
          <ul className="space-y-2">
            {VACCINE_CATALOG.map((vaccine) => {
              const entry = facility.vaccines.find((v) => v.itemId === vaccine.id)
              const status: StockStatus = entry?.status ?? 'out'
              return (
                <li
                  key={vaccine.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="text-ink-900">
                    {vaccine.name}
                    {entry?.nextSlot ? (
                      <span className="block text-xs text-ink-500">Next: {entry.nextSlot}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <StockBadge status={status} />
                    {(['available', 'low', 'out'] as StockStatus[]).map((option) => (
                      <Button
                        key={option}
                        size="sm"
                        tone={status === option ? 'primary' : 'default'}
                        onClick={() => {
                          store.setFacilityVaccineStatus(facility.id, vaccine.id, option)
                        }}
                      >
                        {option === 'available' ? 'In stock' : option === 'low' ? 'Low' : 'Out'}
                      </Button>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </TabPanel>

      <TabPanel id="ambulances" active={tab}>
        <Card>
          {ambulances.length ? (
            <ul className="space-y-2">
              {ambulances.map((ambulance) => (
                <li
                  key={ambulance.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="text-ink-900">
                    {ambulance.code}
                    <span className="block text-xs text-ink-500">
                      {ambulance.driverName} · {ambulance.phone}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={ambulance.status === 'available' ? 'ok' : 'warn'}>
                      {ambulance.status}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        store.setAmbulanceStatus(
                          ambulance.id,
                          ambulance.status === 'available' ? 'busy' : 'available',
                        )
                        toast.show({
                          tone: 'ok',
                          title: 'Ambulance status changed',
                          body: 'Emergency availability on the patient side has changed.',
                        })
                      }}
                    >
                      Mark {ambulance.status === 'available' ? 'busy' : 'available'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🚑" title="No ambulance attached" />
          )}
        </Card>
      </TabPanel>

      <TabPanel id="beds" active={tab}>
        <Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <BedControl
              label="General beds"
              total={facility.beds.total}
              occupied={facility.beds.occupied}
              onChange={(value) => {
                store.setBedOccupancy(facility.id, 'beds', value)
              }}
            />
            {facility.icu.total > 0 ? (
              <BedControl
                label="ICU beds"
                total={facility.icu.total}
                occupied={facility.icu.occupied}
                onChange={(value) => {
                  store.setBedOccupancy(facility.id, 'icu', value)
                }}
              />
            ) : (
              <p className="text-sm text-ink-500">This facility has no ICU beds.</p>
            )}
          </div>
        </Card>
      </TabPanel>
    </div>
  )
}

function BedControl({
  label,
  total,
  occupied,
  onChange,
}: {
  label: string
  total: number
  occupied: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Meter label={label} value={occupied} total={total} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            onChange(occupied - 1)
          }}
          disabled={occupied <= 0}
        >
          − Discharge
        </Button>
        <Button
          onClick={() => {
            onChange(occupied + 1)
          }}
          disabled={occupied >= total}
        >
          + Admit
        </Button>
        <span className="text-sm text-ink-700">
          {total - occupied} free of {total}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Incoming referrals
// ---------------------------------------------------------------------------

export function FacilityReferralsPage() {
  const toast = useToast()
  const { store, facility } = useFacility()
  if (!facility) {
    return <EmptyState icon="🏥" title="No facility linked to this account" />
  }
  const referrals = store.referrals
    .filter((r) => r.toFacilityId === facility.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const advance = (id: string, status: Parameters<typeof store.advanceReferral>[1]) => {
    store.advanceReferral(id, status, facility.name, 'Updated from the facility dashboard (demo).')
    toast.show({ tone: 'ok', title: `Referral marked ${status.replace(/_/g, ' ')}` })
  }

  return (
    <div className="space-y-4">
      <SectionHeading sub="Referrals sent to this facility, with the full record attached.">
        Incoming referrals
      </SectionHeading>

      {referrals.length ? (
        <ul className="space-y-3">
          {referrals.map((referral) => {
            const patient = store.patients.find((p) => p.id === referral.patientId)
            return (
              <ReferralCard
                key={referral.id}
                referral={referral}
                patientLabel={patient?.name}
                showTimeline
                actions={
                  <>
                    {referral.status === 'created' ? (
                      <Button
                        tone="primary"
                        onClick={() => {
                          advance(referral.id, 'accepted')
                        }}
                      >
                        Accept referral
                      </Button>
                    ) : null}
                    {referral.status === 'accepted' ? (
                      <Button
                        tone="primary"
                        onClick={() => {
                          advance(referral.id, 'patient_reached')
                        }}
                      >
                        Mark patient reached
                      </Button>
                    ) : null}
                    {referral.status === 'patient_reached' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'consultation')
                        }}
                      >
                        Consultation started
                      </Button>
                    ) : null}
                    {referral.status === 'consultation' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'treatment')
                        }}
                      >
                        Treatment started
                      </Button>
                    ) : null}
                    {referral.status === 'treatment' ? (
                      <Button
                        tone="primary"
                        onClick={() => {
                          advance(referral.id, 'completed')
                        }}
                      >
                        Mark completed
                      </Button>
                    ) : null}
                    {referral.status !== 'completed' && referral.status !== 'cancelled' ? (
                      <Button
                        onClick={() => {
                          advance(referral.id, 'cancelled')
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </>
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon="🔁"
          title="No referrals yet"
          body="A referral created by a doctor or ASHA worker appears here instantly."
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Emergency pre-arrival alerts
// ---------------------------------------------------------------------------

export function FacilityEmergencyPage() {
  const toast = useToast()
  const { store, facility } = useFacility()
  if (!facility) {
    return <EmptyState icon="🏥" title="No facility linked to this account" />
  }
  const requests = store.emergencyRequests
    .filter((e) => e.destinationFacilityId === facility.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const active = requests.filter((e) => !['completed'].includes(e.status))
  const doctors = store.doctors.filter(
    (d) => d.facilityId === facility.id && d.status === 'available',
  )

  return (
    <div className="space-y-4">
      <SectionHeading sub="Pre-arrival alerts raised when an ambulance is assigned to this facility.">
        Emergency alerts
      </SectionHeading>

      {active.length ? (
        <ul className="space-y-4">
          {active.map((request) => {
            const ambulance = store.ambulances.find((a) => a.id === request.ambulanceId)
            return (
              <Card as="li" key={request.id} className="list-none" tone="danger">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink-900">
                      <span aria-hidden="true">🚑</span> INCOMING EMERGENCY
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                      Raised {formatDateTime(request.createdAt)} · demo alert
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <RiskBadge level={request.riskLevel} large />
                    {request.etaMin ? <Badge tone="warn">ETA {request.etaMin} minutes</Badge> : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KeyValue label="Patient">{request.patientName}</KeyValue>
                  <KeyValue label="Age">{request.patientAge}</KeyValue>
                  <KeyValue label="Village">{request.village}</KeyValue>
                  <KeyValue label="Ambulance">{ambulance?.code ?? 'Not assigned'}</KeyValue>
                  <KeyValue label="Symptoms">{request.symptoms}</KeyValue>
                  <KeyValue label="Emergency bay">
                    {request.emergencyPrepared ? 'Prepared' : 'Not prepared'}
                  </KeyValue>
                  <KeyValue label="Assigned doctor">
                    {store.doctors.find((d) => d.id === request.assignedDoctorId)?.name ??
                      'Not assigned'}
                  </KeyValue>
                  <KeyValue label="Status">{request.status.replace(/_/g, ' ')}</KeyValue>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    tone={request.emergencyPrepared ? 'subtle' : 'danger'}
                    size="lg"
                    disabled={request.emergencyPrepared}
                    onClick={() => {
                      store.prepareEmergency(request.id)
                      toast.show({ tone: 'ok', title: 'Emergency bay prepared (demo)' })
                    }}
                  >
                    {request.emergencyPrepared ? 'Emergency prepared ✓' : 'Prepare Emergency'}
                  </Button>
                  <AssignDoctorButton
                    requestId={request.id}
                    doctors={doctors}
                    assigned={request.assignedDoctorId}
                  />
                  {request.status !== 'patient_reached' &&
                  request.status !== 'in_treatment' &&
                  request.status !== 'completed' ? (
                    <Button
                      size="lg"
                      onClick={() => {
                        store.advanceEmergency(
                          request.id,
                          'patient_reached',
                          'Patient reached the facility (demo).',
                        )
                        toast.show({ tone: 'ok', title: 'Marked patient reached' })
                      }}
                    >
                      Mark Patient Reached
                    </Button>
                  ) : null}
                  {request.status === 'patient_reached' ? (
                    <Button
                      size="lg"
                      onClick={() => {
                        store.advanceEmergency(request.id, 'in_treatment', 'Treatment started (demo).')
                      }}
                    >
                      Start treatment
                    </Button>
                  ) : null}
                  {request.status === 'in_treatment' ? (
                    <Button
                      tone="primary"
                      size="lg"
                      onClick={() => {
                        store.advanceEmergency(
                          request.id,
                          'completed',
                          'Case closed; ambulance released (demo).',
                        )
                        toast.show({
                          tone: 'ok',
                          title: 'Emergency completed',
                          body: 'The ambulance is available again on the patient side.',
                        })
                      }}
                    >
                      Complete case
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-ink-700">Coordination log</h3>
                  <Timeline
                    steps={request.timeline.map((event, index) => ({
                      key: `${event.status}-${index}`,
                      label: event.status.replace(/_/g, ' '),
                      at: formatDateTime(event.at),
                      note: event.note,
                      state: index === request.timeline.length - 1 ? 'current' : 'done',
                    }))}
                  />
                </div>
              </Card>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon="🚑"
          title="No incoming emergency"
          body="When a patient or ASHA worker requests an ambulance and this facility is the destination, a pre-arrival alert appears here."
        />
      )}

      {requests.filter((r) => r.status === 'completed').length ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink-900">Closed cases</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {requests
              .filter((r) => r.status === 'completed')
              .map((request) => (
                <li key={request.id}>
                  {request.patientName}, {request.patientAge} · {request.symptoms} ·{' '}
                  {formatDate(request.createdAt)}
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

function AssignDoctorButton({
  requestId,
  doctors,
  assigned,
}: {
  requestId: string
  doctors: { id: string; name: string; specialty: string }[]
  assigned?: string
}) {
  const [open, setOpen] = useState(false)
  const [doctorId, setDoctorId] = useState(assigned ?? '')
  const store = useAppStore()
  const toast = useToast()

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setOpen(true)
        }}
      >
        {assigned ? 'Change assigned doctor' : 'Assign Doctor'}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Assign a doctor to this case"
        width="sm"
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              tone="primary"
              disabled={!doctorId}
              onClick={() => {
                store.assignEmergencyDoctor(requestId, doctorId)
                toast.show({ tone: 'ok', title: 'Doctor assigned (demo)' })
                setOpen(false)
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        {doctors.length ? (
          <Field label="Available doctor">
            {({ id }) => (
              <Select
                id={id}
                value={doctorId}
                onChange={(event) => {
                  setDoctorId(event.target.value)
                }}
              >
                <option value="">Choose a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <p className="text-sm text-ink-700">
            No doctor at this facility is currently marked available. Change availability from the
            resources page first.
          </p>
        )}
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Camps
// ---------------------------------------------------------------------------

export function FacilityCampsPage() {
  const toast = useToast()
  const { store, facility } = useFacility()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [village, setVillage] = useState('Kalyanpur')
  const [date, setDate] = useState(dayKeyOffset(7))
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('14:00')
  const [slots, setSlots] = useState('50')
  const [mobileUnit, setMobileUnit] = useState('no')

  if (!facility) {
    return <EmptyState icon="🏥" title="No facility linked to this account" />
  }

  const camps = store.camps.filter((c) => c.organiserFacilityId === facility.id)

  return (
    <div className="space-y-4">
      <SectionHeading
        sub="Camps organised by this facility. Patients and ASHA workers in the village are notified."
        right={
          <Button
            tone="primary"
            onClick={() => {
              setOpen(true)
            }}
          >
            + New camp
          </Button>
        }
      >
        Medical camps
      </SectionHeading>

      {camps.length ? (
        <ul className="space-y-3">
          {camps.map((camp) => {
            const registrations = store.campRegistrations.filter((r) => r.campId === camp.id)
            return (
              <CampCard
                key={camp.id}
                camp={camp}
                extraActions={
                  <>
                    <Badge tone="info">{registrations.length} registered</Badge>
                    <Badge tone="ok">{registrations.filter((r) => r.attended).length} attended</Badge>
                  </>
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="⛺" title="No camps organised yet" />
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Create a medical camp"
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              tone="primary"
              disabled={!name.trim()}
              onClick={() => {
                store.createCamp({
                  name: name.trim(),
                  village,
                  organiserFacilityId: facility.id,
                  date,
                  startTime: start,
                  endTime: end,
                  doctorIds: store.doctors
                    .filter((d) => d.facilityId === facility.id)
                    .map((d) => d.id),
                  services: [
                    'General consultation',
                    'BP measurement',
                    'Blood sugar test',
                    'Basic screening',
                  ],
                  tests: ['t_bp', 't_sugar'],
                  medicines: ['m_para', 'm_iron'],
                  slotsTotal: Number(slots) || 40,
                  mobileUnit: mobileUnit === 'yes',
                  contactAshaId: store.ashas.find((a) => a.villagesCovered.includes(village))?.id,
                })
                toast.show({
                  tone: 'ok',
                  title: 'Camp created',
                  body: 'Patients and ASHA workers in that village have been notified in the prototype.',
                })
                setName('')
                setOpen(false)
              }}
            >
              Create camp
            </Button>
          </>
        }
      >
        <Field label="Camp name" required>
          {({ id }) => (
            <TextInput
              id={id}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
              placeholder="e.g. Kalyanpur Health Camp"
            />
          )}
        </Field>
        <FieldRow>
          <Field label="Village">
            {({ id }) => (
              <Select
                id={id}
                value={village}
                onChange={(event) => {
                  setVillage(event.target.value)
                }}
              >
                {store.villages.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date">
            {({ id }) => (
              <TextInput
                id={id}
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label="Start time">
            {({ id }) => (
              <TextInput
                id={id}
                type="time"
                value={start}
                onChange={(event) => {
                  setStart(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label="End time">
            {({ id }) => (
              <TextInput
                id={id}
                type="time"
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label="Slots">
            {({ id }) => (
              <TextInput
                id={id}
                inputMode="numeric"
                value={slots}
                onChange={(event) => {
                  setSlots(event.target.value)
                }}
              />
            )}
          </Field>
          <Field label="Mobile medical unit?">
            {({ id }) => (
              <Select
                id={id}
                value={mobileUnit}
                onChange={(event) => {
                  setMobileUnit(event.target.value)
                }}
              >
                <option value="no">No - fixed camp</option>
                <option value="yes">Yes - mobile unit</option>
              </Select>
            )}
          </Field>
        </FieldRow>
      </Dialog>
    </div>
  )
}
