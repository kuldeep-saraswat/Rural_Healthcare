import { useState } from 'react'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, SectionHeading, StatTile, PageHeader, StatGrid } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { BarList, Donut, Meter } from '@/components/ui/Charts'
import { Dialog } from '@/components/ui/Dialog'
import { Field, FieldRow, Select, TextArea, TextInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { TableWrap, Td, Th, Tr } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { AlertCard, CampCard } from '@/components/cards/PublicHealthCards'
import { useAppStore } from '@/store/useAppStore'
import { bucketFollowUp, currentUser } from '@/store/selectors'
import {
  DECISION_SUPPORT_DISCLAIMER,
  facilityPressure,
  predictDemand,
} from '@/services/ai/decisionSupport'
import { MEDICINE_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import { daysBetween, formatDate, pct } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

const ADMIN_NOTE =
  'Admin accounts never see an identifiable patient record in this prototype - only counts and aggregates from fictional demo data.'

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function AdminOverviewPage() {
  const store = useAppStore()
  const villages = store.villages
  const patientsByVillage = villages.map((village) => ({
    label: village.name,
    value: store.patients.filter((p) => p.village === village.name).length,
  }))
  const phcWorkload = store.facilities
    .filter((f) => f.type === 'phc' || f.type === 'chc')
    .map((facility) => ({
      label: facility.name.replace(' Primary Health Centre', ' PHC').replace(' Community Health Centre', ' CHC'),
      value: store.consultations.filter((c) => c.facilityId === facility.id).length,
      tone: 'info' as const,
    }))
  const hospitalWorkload = store.facilities
    .filter((f) => f.beds.total > 20)
    .map((facility) => ({
      label: facility.name,
      value: pct(facility.beds.occupied, facility.beds.total),
      hint: `${facility.beds.occupied}/${facility.beds.total} beds`,
      tone: (pct(facility.beds.occupied, facility.beds.total) >= 85 ? 'danger' : 'care') as
        | 'danger'
        | 'care',
    }))

  const referralCounts = {
    created: store.referrals.filter((r) => r.status === 'created').length,
    accepted: store.referrals.filter((r) => r.status === 'accepted').length,
    inProgress: store.referrals.filter((r) =>
      ['patient_reached', 'consultation', 'treatment'].includes(r.status),
    ).length,
    completed: store.referrals.filter((r) => r.status === 'completed').length,
  }
  const completedReferrals = store.referrals.filter((r) => r.status === 'completed')
  const averageCompletionDays = completedReferrals.length
    ? Math.round(
        completedReferrals.reduce((sum, referral) => {
          const completedAt = [...referral.history].reverse().find((h) => h.status === 'completed')
          return sum + (completedAt ? Math.abs(daysBetween(completedAt.at, referral.createdAt)) : 0)
        }, 0) / completedReferrals.length,
      )
    : 0

  const doctorShortage = store.facilities.filter(
    (facility) =>
      facility.doctorIds.length > 0 &&
      store.doctors.filter((d) => d.facilityId === facility.id && d.status === 'available')
        .length === 0,
  )
  const medicineShortages = store.facilities.flatMap((facility) =>
    facility.medicines
      .filter((m) => m.status !== 'available')
      .map((m) => ({
        facility: facility.name,
        item: MEDICINE_CATALOG.find((x) => x.id === m.itemId)?.name ?? m.itemId,
        status: m.status,
      })),
  )
  const vaccineShortages = store.facilities.flatMap((facility) =>
    facility.vaccines
      .filter((v) => v.status !== 'available')
      .map((v) => ({
        facility: facility.name,
        item: VACCINE_CATALOG.find((x) => x.id === v.itemId)?.name ?? v.itemId,
        status: v.status,
      })),
  )
  const testGaps = store.facilities.flatMap((facility) =>
    facility.tests.filter((t) => t.status !== 'available').map(() => ({ facility: facility.name })),
  )
  const ambulancesAvailable = store.ambulances.filter((a) => a.status === 'available').length

  const camps = store.camps
  const campRegistrations = store.campRegistrations
  const overdueFollowUps = store.followUps.filter((f) => bucketFollowUp(f) === 'overdue').length
  const vaccinationGaps = store.vaccinations.filter((v) => v.status !== 'given').length
  const screeningCoverage = pct(
    new Set(store.screenings.map((s) => s.patientId)).size,
    store.patients.length,
  )
  const pressure = facilityPressure(store)

  return (
    <div className="space-y-6">
      <PageHeader
        icon="dashboard"
        eyebrow="District health office"
        title="Government / admin dashboard"
        description="District health office view. Aggregates only."
      />

      <Callout tone="neutral" icon="lock" title="Privacy">
        {ADMIN_NOTE}
      </Callout>

      <StatGrid>
        <StatTile label="Villages covered" value={villages.length} icon="household" />
        <StatTile label="Registered patients" value={store.patients.length} icon="users" />
        <StatTile
          label="Ambulances available"
          value={`${ambulancesAvailable}/${store.ambulances.length}`}
          icon="ambulance"
          tone={ambulancesAvailable ? 'ok' : 'danger'}
        />
        <StatTile
          label="Overdue follow-ups"
          value={overdueFollowUps}
          icon="calendar"
          tone={overdueFollowUps ? 'danger' : 'ok'}
        />
      </StatGrid>

      {/* Healthcare demand */}
      <Card>
        <SectionHeading sub="Where the demand is coming from.">Healthcare demand</SectionHeading>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Patients by area</h3>
            <BarList data={patientsByVillage} ariaLabel="Registered patients by village" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">PHC / CHC workload</h3>
            <BarList
              data={phcWorkload}
              unit=" visits"
              ariaLabel="Consultations recorded per primary facility"
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Hospital bed occupancy</h3>
            <BarList data={hospitalWorkload} max={100} unit="%" ariaLabel="Hospital bed occupancy" />
          </div>
        </div>
      </Card>

      {/* Resource availability */}
      <Card>
        <SectionHeading sub="Shortages that patients feel immediately.">
          Resource availability
        </SectionHeading>
        <StatGrid>
          <StatTile
            label="Facilities with no doctor available"
            value={doctorShortage.length}
            icon="doctor"
            tone={doctorShortage.length ? 'danger' : 'ok'}
            hint={doctorShortage.map((f) => f.name).join(', ') || 'All covered'}
          />
          <StatTile
            label="Medicine stock alerts"
            value={medicineShortages.length}
            icon="pill"
            tone={medicineShortages.length ? 'warn' : 'ok'}
          />
          <StatTile
            label="Vaccine stock alerts"
            value={vaccineShortages.length}
            icon="syringe"
            tone={vaccineShortages.length ? 'warn' : 'ok'}
          />
          <StatTile
            label="Diagnostic gaps"
            value={testGaps.length}
            icon="microscope"
            tone={testGaps.length ? 'warn' : 'ok'}
          />
        </StatGrid>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Beds and ICU</h3>
            <div className="space-y-3">
              {store.facilities
                .filter((f) => f.beds.total > 0)
                .map((facility) => (
                  <div key={facility.id}>
                    <Meter
                      label={`${facility.name} - beds`}
                      value={facility.beds.occupied}
                      total={facility.beds.total}
                    />
                    {facility.icu.total > 0 ? (
                      <div className="mt-1.5">
                        <Meter
                          label={`${facility.name} - ICU`}
                          value={facility.icu.occupied}
                          total={facility.icu.total}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Stock alerts detail</h3>
            {medicineShortages.length + vaccineShortages.length ? (
              <ul className="space-y-1 text-sm">
                {[...medicineShortages, ...vaccineShortages].map((row, index) => (
                  <li
                    key={`${row.facility}-${row.item}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1 last:border-0"
                  >
                    <span className="text-ink-900">
                      {row.item} <span className="text-ink-500">· {row.facility}</span>
                    </span>
                    <Badge tone={row.status === 'out' ? 'danger' : 'warn'}>{row.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No stock alerts.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Referral analytics */}
      <Card>
        <SectionHeading sub="How referrals move through the system.">Referral analytics</SectionHeading>
        <div className="grid gap-6 lg:grid-cols-2">
          <Donut
            ariaLabel="Referrals by stage"
            centerValue={store.referrals.length}
            centerLabel="referrals"
            slices={[
              { label: 'Created', value: referralCounts.created },
              { label: 'Accepted', value: referralCounts.accepted },
              { label: 'In progress', value: referralCounts.inProgress },
              { label: 'Completed', value: referralCounts.completed },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Created" value={referralCounts.created} />
            <StatTile label="Accepted" value={referralCounts.accepted} />
            <StatTile label="In progress" value={referralCounts.inProgress} tone="info" />
            <StatTile label="Completed" value={referralCounts.completed} tone="ok" />
            <StatTile
              label="Average completion"
              value={`${averageCompletionDays} day(s)`}
              hint="From creation to completion"
            />
            <StatTile
              label="Not reached (flagged)"
              value={store.referrals.filter((r) => r.dropOffFlagged).length}
              tone={store.referrals.some((r) => r.dropOffFlagged) ? 'danger' : 'ok'}
            />
          </div>
        </div>
      </Card>

      {/* Hospital analytics */}
      <Card>
        <SectionHeading sub="Load, waiting time and utilisation (demo estimates).">
          Hospital analytics
        </SectionHeading>
        <TableWrap caption="Facility load and utilisation">
          <thead>
            <Tr>
              <Th>Facility</Th>
              <Th>Patient load</Th>
              <Th>Est. waiting time</Th>
              <Th>Beds</Th>
              <Th>ICU</Th>
              <Th>Pressure</Th>
            </Tr>
          </thead>
          <tbody>
            {pressure.map((row) => (
              <Tr key={row.facility.id}>
                <Td>{row.facility.name}</Td>
                <Td>{row.activeReferrals + row.incomingEmergencies + row.facility.beds.occupied}</Td>
                <Td>{Math.max(5, Math.round(row.bedOccupancyPct / 2))} min</Td>
                <Td>{row.bedOccupancyPct}%</Td>
                <Td>{row.facility.icu.total ? `${row.icuOccupancyPct}%` : '-'}</Td>
                <Td>
                  <Badge
                    tone={row.level === 'high' ? 'danger' : row.level === 'watch' ? 'warn' : 'ok'}
                  >
                    {row.level}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      {/* Camp analytics */}
      <Card>
        <SectionHeading sub="Camps, coverage and attendance.">Medical camp analytics</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Camps" value={camps.length} />
          <StatTile
            label="Villages covered"
            value={new Set(camps.map((c) => c.village)).size}
          />
          <StatTile label="Registrations" value={campRegistrations.length} />
          <StatTile
            label="Attendance"
            value={`${pct(campRegistrations.filter((r) => r.attended).length, campRegistrations.length)}%`}
            tone="ok"
          />
        </div>
      </Card>

      {/* Preventive healthcare */}
      <Card>
        <SectionHeading sub="Where prevention is slipping.">Preventive healthcare</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatTile
            label="Missed follow-ups"
            value={overdueFollowUps}
            tone={overdueFollowUps ? 'danger' : 'ok'}
          />
          <StatTile
            label="Vaccination gaps"
            value={vaccinationGaps}
            tone={vaccinationGaps ? 'warn' : 'ok'}
          />
          <StatTile label="Screening coverage" value={`${screeningCoverage}%`} tone="info" />
        </div>
      </Card>

      {/* Village accessibility */}
      <Card>
        <SectionHeading sub="Which villages are underserved. Demo indicator, not an official metric.">
          Village accessibility
        </SectionHeading>
        <TableWrap caption="Village-level healthcare accessibility">
          <thead>
            <Tr>
              <Th>Village</Th>
              <Th>Access</Th>
              <Th>Nearest PHC</Th>
              <Th>Doctor available</Th>
              <Th>Telemedicine</Th>
              <Th>ASHA</Th>
            </Tr>
          </thead>
          <tbody>
            {villages.map((village) => {
              const phc = store.facilities.find((f) => f.id === village.nearestPhcId)
              const doctorAvailable = store.doctors.some(
                (d) => d.facilityId === village.nearestPhcId && d.status === 'available',
              )
              const telemedicine = store.doctors.some(
                (d) => d.telemedicine && d.status === 'available',
              )
              return (
                <Tr key={village.id}>
                  <Td>{village.name}</Td>
                  <Td>
                    <Badge
                      tone={
                        village.accessLevel === 'good'
                          ? 'ok'
                          : village.accessLevel === 'moderate'
                            ? 'warn'
                            : 'danger'
                      }
                    >
                      {village.accessLevel}
                    </Badge>
                  </Td>
                  <Td>{phc ? `${phc.name} (${phc.distanceKm} km)` : '-'}</Td>
                  <Td>
                    <Badge tone={doctorAvailable ? 'ok' : 'danger'}>
                      {doctorAvailable ? 'Yes' : 'No'}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={telemedicine ? 'ok' : 'warn'}>
                      {telemedicine ? 'Available' : 'None online'}
                    </Badge>
                  </Td>
                  <Td>{store.ashas.find((a) => a.id === village.ashaId)?.name ?? 'Not assigned'}</Td>
                </Tr>
              )
            })}
          </tbody>
        </TableWrap>
      </Card>

      {/* Alerts */}
      <Card>
        <SectionHeading sub="What needs an administrative decision today.">Alerts</SectionHeading>
        {(() => {
          const rows: { id: string; label: string; detail: string; tone: 'danger' | 'warn' | 'info' }[] = []
          if (doctorShortage.length) {
            rows.push({
              id: 'doctors',
              label: 'Doctor shortage',
              detail: `No doctor available at: ${doctorShortage.map((f) => f.name).join(', ')}`,
              tone: 'danger',
            })
          }
          const outMedicines = medicineShortages.filter((m) => m.status === 'out')
          if (outMedicines.length) {
            rows.push({
              id: 'medicines',
              label: 'Medicine shortage',
              detail: outMedicines
                .slice(0, 4)
                .map((m) => `${m.item} (${m.facility})`)
                .join('; '),
              tone: 'danger',
            })
          }
          const lowVaccineStock = vaccineShortages.filter((v) => v.status !== 'available')
          if (lowVaccineStock.length) {
            rows.push({
              id: 'vaccines',
              label: 'Vaccine low stock',
              detail: lowVaccineStock
                .slice(0, 4)
                .map((v) => `${v.item} (${v.facility})`)
                .join('; '),
              tone: 'warn',
            })
          }
          for (const row of pressure.filter((p) => p.level === 'high')) {
            rows.push({
              id: `pressure-${row.facility.id}`,
              label: 'High hospital workload',
              detail: `${row.facility.name} - ${row.notes.join('; ') || `${row.bedOccupancyPct}% beds occupied`}`,
              tone: 'danger',
            })
          }
          for (const alert of store.alerts) {
            rows.push({
              id: `alert-${alert.id}`,
              label: 'Public health alert (demo)',
              detail: `${alert.title} - ${alert.areas.join(', ')}`,
              tone: alert.severity === 'severe' ? 'danger' : 'warn',
            })
          }
          if (!rows.length) {
            return <p className="text-sm text-ink-500">No alerts. Nothing needs attention today.</p>
          }
          return (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{row.label}</span>
                    <span className="block text-sm text-ink-700">{row.detail}</span>
                  </span>
                  <Badge tone={row.tone}>{row.tone === 'danger' ? 'Act now' : 'Watch'}</Badge>
                </li>
              ))}
            </ul>
          )
        })()}
      </Card>

      <div className="flex flex-wrap gap-2">
        <LinkButton to="/admin/demand" tone="primary" size="lg">
          Healthcare demand map
        </LinkButton>
        <LinkButton to="/admin/alerts" size="lg">
          Manage public health alerts
        </LinkButton>
        <LinkButton to="/admin/resources" size="lg">
          Resource controls
        </LinkButton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demand map
// ---------------------------------------------------------------------------

export function AdminDemandPage() {
  const store = useAppStore()
  const predictions = predictDemand(store)

  return (
    <div className="space-y-6">
      <PageHeader
        icon="map"
        eyebrow="District planning"
        title="Healthcare demand map"
        description="Village → demand → available resources → shortages. A demo visualisation to spot underserved areas."
      />

      <Callout tone="neutral" icon="compass" title="AI resource demand (decision support)">
        Next-week demand is projected from the open follow-ups and referrals in the demo data using
        a simple, explainable rule. {DECISION_SUPPORT_DISCLAIMER}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Current demand index</h2>
          <BarList
            ariaLabel="Current demand index by village"
            max={100}
            data={predictions.map((p) => ({
              label: p.village.name,
              value: p.currentDemand,
              tone: p.currentDemand >= 80 ? 'danger' : p.currentDemand >= 60 ? 'warn' : 'care',
            }))}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Projected next week</h2>
          <BarList
            ariaLabel="Projected demand index by village"
            max={100}
            data={predictions.map((p) => ({
              label: p.village.name,
              value: p.predictedNextWeek,
              hint: p.trend,
              tone: p.trend === 'rising' ? 'danger' : p.trend === 'falling' ? 'care' : 'info',
            }))}
          />
        </Card>
      </div>

      <ul className="grid gap-3 lg:grid-cols-2">
        {predictions.map((prediction) => (
          <Card
            as="li"
            key={prediction.village.id}
            className="list-none"
            tone={
              prediction.village.accessLevel === 'limited'
                ? 'danger'
                : prediction.village.accessLevel === 'moderate'
                  ? 'warn'
                  : 'ok'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">{prediction.village.name}</h3>
                <p className="text-sm text-ink-500">
                  Population {prediction.village.population.toLocaleString('en-IN')} · access{' '}
                  {prediction.village.accessLevel}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  tone={
                    prediction.currentDemand >= 80
                      ? 'danger'
                      : prediction.currentDemand >= 60
                        ? 'warn'
                        : 'ok'
                  }
                >
                  Demand {prediction.currentDemand}
                </Badge>
                <Badge tone={prediction.trend === 'rising' ? 'danger' : 'info'}>
                  {prediction.trend} → {prediction.predictedNextWeek}
                </Badge>
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-[13px] font-semibold text-ink-700">Shortages</h4>
              {prediction.shortages.length ? (
                <ul className="mt-1 space-y-1 text-sm text-ink-900">
                  {prediction.shortages.map((shortage) => (
                    <li key={shortage} className="flex gap-2">
                      <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-warn-600" />
                      {shortage}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-ink-700">No shortage detected.</p>
              )}
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <KeyValue label="Nearest PHC">
                {store.facilities.find((f) => f.id === prediction.village.nearestPhcId)?.name ?? '-'}
              </KeyValue>
              <KeyValue label="ASHA worker">
                {store.ashas.find((a) => a.id === prediction.village.ashaId)?.name ?? 'Not assigned'}
              </KeyValue>
            </dl>
          </Card>
        ))}
      </ul>
      <p className="text-xs text-ink-500">
        <DemoBadge label="Demo visualisation" /> Not a geographic map and not an official
        government dataset.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resource controls (district-wide)
// ---------------------------------------------------------------------------

export function AdminResourcesPage() {
  const toast = useToast()
  const store = useAppStore()

  return (
    <div className="space-y-6">
      <PageHeader
        icon="toolbox"
        eyebrow="District planning"
        title="Resource controls"
        description="District-wide overrides. Every change is visible to patients immediately."
      />

      <Callout tone="info" icon="externalLink" title="Connected demo">
        Toggle a doctor here and the patient-side doctor list changes. Change medicine or vaccine
        stock and the finders update. Mark an ambulance busy and emergency availability changes.
      </Callout>

      <Card>
        <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Doctors</h2>
        <TableWrap caption="Doctor availability across the district">
          <thead>
            <Tr>
              <Th>Doctor</Th>
              <Th>Facility</Th>
              <Th>Status</Th>
              <Th>Emergency</Th>
              <Th>Action</Th>
            </Tr>
          </thead>
          <tbody>
            {store.doctors.map((doctor) => (
              <Tr key={doctor.id}>
                <Td>
                  {doctor.name}
                  <span className="block text-xs text-ink-500">{doctor.specialty}</span>
                </Td>
                <Td>{store.facilities.find((f) => f.id === doctor.facilityId)?.name}</Td>
                <Td>
                  <Badge tone={doctor.status === 'available' ? 'ok' : 'neutral'}>
                    {doctor.status}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={doctor.emergencyAvailable ? 'danger' : 'neutral'}>
                    {doctor.emergencyAvailable ? 'Yes' : 'No'}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    onClick={() => {
                      const next = doctor.status === 'available' ? 'unavailable' : 'available'
                      store.setDoctorStatus(doctor.id, next)
                      toast.show({
                        tone: next === 'available' ? 'ok' : 'warn',
                        title: `${doctor.name} marked ${next}`,
                        body: 'Patient-side availability updated.',
                      })
                    }}
                  >
                    Toggle
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Ambulances</h2>
        <TableWrap caption="Ambulance availability">
          <thead>
            <Tr>
              <Th>Ambulance</Th>
              <Th>Base</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </Tr>
          </thead>
          <tbody>
            {store.ambulances.map((ambulance) => (
              <Tr key={ambulance.id}>
                <Td>{ambulance.code}</Td>
                <Td>{store.facilities.find((f) => f.id === ambulance.facilityId)?.name}</Td>
                <Td>
                  <Badge tone={ambulance.status === 'available' ? 'ok' : 'warn'}>
                    {ambulance.status}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    onClick={() => {
                      store.setAmbulanceStatus(
                        ambulance.id,
                        ambulance.status === 'available' ? 'busy' : 'available',
                      )
                    }}
                  >
                    Toggle
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg leading-snug font-semibold tracking-tight text-ink-900">Beds and ICU</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {store.facilities
            .filter((f) => f.beds.total > 0)
            .map((facility) => (
              <div key={facility.id} className="rounded-card border border-hairline p-3">
                <Meter
                  label={`${facility.name} - beds`}
                  value={facility.beds.occupied}
                  total={facility.beds.total}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      store.setBedOccupancy(facility.id, 'beds', facility.beds.occupied - 1)
                    }}
                  >
                    − Free a bed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      store.setBedOccupancy(facility.id, 'beds', facility.beds.occupied + 1)
                    }}
                  >
                    + Occupy a bed
                  </Button>
                </div>
                {facility.icu.total > 0 ? (
                  <div className="mt-3">
                    <Meter
                      label={`${facility.name} - ICU`}
                      value={facility.icu.occupied}
                      total={facility.icu.total}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          store.setBedOccupancy(facility.id, 'icu', facility.icu.occupied - 1)
                        }}
                      >
                        − Free ICU
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          store.setBedOccupancy(facility.id, 'icu', facility.icu.occupied + 1)
                        }}
                      >
                        + Occupy ICU
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Referral analytics detail
// ---------------------------------------------------------------------------

export function AdminReferralsPage() {
  const store = useAppStore()
  const referrals = [...store.referrals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="space-y-6">
      <PageHeader
        icon="chart"
        eyebrow="District planning"
        title="Referral analytics"
        description="Aggregate view. Patient names are shown only because every record here is fictional demo data."
      />

      <TableWrap caption="All referrals in the demo dataset">
        <thead>
          <Tr>
            <Th>Created</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th>Urgency</Th>
            <Th>Status</Th>
            <Th>Reached?</Th>
          </Tr>
        </thead>
        <tbody>
          {referrals.map((referral) => (
            <Tr key={referral.id}>
              <Td>{formatDate(referral.createdAt)}</Td>
              <Td>{store.facilities.find((f) => f.id === referral.fromFacilityId)?.name}</Td>
              <Td>{store.facilities.find((f) => f.id === referral.toFacilityId)?.name}</Td>
              <Td>
                <Badge
                  tone={
                    referral.urgency === 'emergency'
                      ? 'danger'
                      : referral.urgency === 'urgent'
                        ? 'warn'
                        : 'neutral'
                  }
                >
                  {referral.urgency}
                </Badge>
              </Td>
              <Td>{referral.status.replace(/_/g, ' ')}</Td>
              <Td>
                {referral.dropOffFlagged ? (
                  <Badge tone="danger">Not reached</Badge>
                ) : (
                  <Badge tone="ok">On track</Badge>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public health alerts
// ---------------------------------------------------------------------------

export function AdminAlertsPage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const [open, setOpen] = useState(false)

  const [kind, setKind] = useState<'outbreak' | 'weather' | 'advisory'>('outbreak')
  const [severity, setSeverity] = useState<'info' | 'warning' | 'severe'>('warning')
  const [title, setTitle] = useState('')
  const [areas, setAreas] = useState<string[]>(['Kalyanpur'])
  const [summary, setSummary] = useState('')
  const [precautions, setPrecautions] = useState('Maintain hygiene\nDrink safe water')
  const [symptomsToWatch, setSymptomsToWatch] = useState('Fever\nVomiting')
  const [whatToDo, setWhatToDo] = useState('Contact your ASHA worker or PHC if symptoms appear')
  const [whatToAvoid, setWhatToAvoid] = useState('Do not take antibiotics without a doctor')
  const [expiryDays, setExpiryDays] = useState('14')

  const lines = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        icon="megaphone"
        eyebrow="District response"
        title="Public health alerts"
        description="Alerts reach patients and ASHA workers in the selected villages as notifications."
        actions={
          <Button
            tone="primary"
            onClick={() => {
              setOpen(true)
            }}
          
            icon={<Icon name="plus" size={16} />}
          >
            New alert
          </Button>
        }
      />

      <Callout tone="warn" icon="alert" title="Never claim an unverified outbreak">
        Every alert created here is published with a <strong>Demo public health alert</strong> badge
        and wording that avoids panic. In a real deployment only verified district health data would
        be published.
      </Callout>

      {store.alerts.length ? (
        <ul className="space-y-3">
          {store.alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              actions={
                <Button
                  tone="danger"
                  onClick={() => {
                    store.deleteAlert(alert.id)
                    toast.show({ tone: 'warn', title: 'Alert removed' })
                  }}
                >
                  Delete alert
                </Button>
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon="megaphone" title="No alerts published" />
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Create a demo public health alert"
        description="One item per line for the list fields."
        width="lg"
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
              disabled={!title.trim() || !summary.trim() || !areas.length}
              onClick={() => {
                store.createAlert({
                  kind,
                  severity,
                  title: title.trim(),
                  summary: summary.trim(),
                  areas,
                  precautions: lines(precautions),
                  symptomsToWatch: lines(symptomsToWatch),
                  whatToDo: lines(whatToDo),
                  whatToAvoid: lines(whatToAvoid),
                  expiryDays: Number(expiryDays) || 7,
                  createdBy: `${user.name} (demo account)`,
                })
                toast.show({
                  tone: 'ok',
                  title: 'Demo alert published',
                  body: 'Patients and ASHA workers in the selected villages have been notified.',
                })
                setTitle('')
                setSummary('')
                setOpen(false)
              }}
            >
              Publish alert
            </Button>
          </>
        }
      >
        <FieldRow>
          <Field label="Alert type">
            {({ id }) => (
              <Select
                id={id}
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as typeof kind)
                }}
              >
                <option value="outbreak">Local disease / outbreak advisory</option>
                <option value="weather">Weather / environment</option>
                <option value="advisory">General advisory</option>
              </Select>
            )}
          </Field>
          <Field label="Severity">
            {({ id }) => (
              <Select
                id={id}
                value={severity}
                onChange={(event) => {
                  setSeverity(event.target.value as typeof severity)
                }}
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="severe">Severe</option>
              </Select>
            )}
          </Field>
          <Field label="Valid for (days)">
            {({ id }) => (
              <TextInput
                id={id}
                inputMode="numeric"
                value={expiryDays}
                onChange={(event) => {
                  setExpiryDays(event.target.value)
                }}
              />
            )}
          </Field>
        </FieldRow>

        <Field label="Title" required>
          {({ id }) => (
            <TextInput
              id={id}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
              }}
              placeholder="e.g. Health Alert - Devgaon"
            />
          )}
        </Field>

        <fieldset className="mb-3">
          <legend className="mb-1 block text-sm font-semibold text-ink-700">Areas</legend>
          <div className="flex flex-wrap gap-2">
            {store.villages.map((village) => {
              const active = areas.includes(village.name)
              return (
                <button
                  key={village.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setAreas((current) =>
                      current.includes(village.name)
                        ? current.filter((v) => v !== village.name)
                        : [...current, village.name],
                    )
                  }}
                  className={
                    active
                      ? 'min-h-11 rounded-card border border-care-600 bg-care-600 px-3 text-sm font-medium text-white'
                      : 'min-h-11 rounded-card border border-hairline bg-surface px-3 text-sm font-medium text-ink-700 hover:bg-care-50'
                  }
                >
                  {village.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <Field label="Summary" required hint="Calm, factual wording. Avoid creating panic.">
          {({ id, describedBy }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value)
              }}
              placeholder="Increased reports of a seasonal illness have been noted in this area..."
            />
          )}
        </Field>
        <Field label="Precautions (one per line)">
          {({ id }) => (
            <TextArea
              id={id}
              value={precautions}
              onChange={(event) => {
                setPrecautions(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Symptoms to watch (one per line)">
          {({ id }) => (
            <TextArea
              id={id}
              value={symptomsToWatch}
              onChange={(event) => {
                setSymptomsToWatch(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="What to do (one per line)">
          {({ id }) => (
            <TextArea
              id={id}
              value={whatToDo}
              onChange={(event) => {
                setWhatToDo(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="What to avoid (one per line)">
          {({ id }) => (
            <TextArea
              id={id}
              value={whatToAvoid}
              onChange={(event) => {
                setWhatToAvoid(event.target.value)
              }}
            />
          )}
        </Field>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Camps
// ---------------------------------------------------------------------------

export function AdminCampsPage() {
  const store = useAppStore()
  const camps = [...store.camps].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <PageHeader
        icon="tent"
        eyebrow="District programmes"
        title="Medical camps"
        description="All camps across the district, with registrations and attendance."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Camps" value={camps.length} />
        <StatTile label="Upcoming" value={camps.filter((c) => c.status !== 'completed').length} />
        <StatTile label="Registrations" value={store.campRegistrations.length} />
        <StatTile
          label="Attended"
          value={store.campRegistrations.filter((r) => r.attended).length}
          tone="ok"
        />
      </div>

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
                    <Badge tone="neutral">
                      {camp.mobileUnit ? 'Mobile unit' : 'Fixed camp'}
                    </Badge>
                  </>
                }
              />
            )
          })}
        </ul>
      ) : (
        <EmptyState icon="tent" title="No camps in the demo data" />
      )}
    </div>
  )
}
