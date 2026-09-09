import { useState } from 'react'
import type { RiskLevel } from '@/types'
import { AmbulanceCard, AshaCard, FacilityCard } from '@/components/cards/FacilityCards'
import { DoctorCard } from '@/components/cards/DoctorCard'
import { Badge, RiskBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Field, Select, TextArea } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { Timeline } from '@/components/ui/Timeline'
import type { TimelineStep } from '@/components/ui/Timeline'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import {
  ashaForPatient,
  availableAmbulances,
  availableDoctors,
  currentPatient,
  currentUser,
} from '@/store/selectors'
import { useT } from '@/services/i18n'
import { formatDateTime } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

const EMERGENCY_FLOW = [
  'requested',
  'ambulance_assigned',
  'hospital_alerted',
  'en_route',
  'patient_reached',
  'in_treatment',
  'completed',
] as const

const STATUS_LABEL: Record<string, string> = {
  requested: 'Emergency requested',
  ambulance_assigned: 'Ambulance assigned',
  hospital_alerted: 'Hospital pre-arrival alert sent',
  en_route: 'On the way to hospital',
  patient_reached: 'Patient reached hospital',
  in_treatment: 'Treatment started',
  completed: 'Completed',
  no_ambulance: 'No ambulance available',
}

export function EmergencyPage() {
  const t = useT()
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)
  const [symptoms, setSymptoms] = useState('')
  const [risk, setRisk] = useState<RiskLevel>('high')
  const [requesting, setRequesting] = useState(false)

  const ambulances = availableAmbulances(store)
  const emergencyFacilities = store.facilities
    .filter((f) => f.emergency)
    .sort((a, b) => a.distanceKm - b.distanceKm)
  const emergencyDoctors = availableDoctors(store.doctors, store.facilities, {
    emergencyOnly: true,
  })
  const asha = ashaForPatient(store.ashas, patient)

  const activeRequest = store.emergencyRequests.find(
    (e) =>
      (store.activeEmergencyId ? e.id === store.activeEmergencyId : e.patientId === patient?.id) &&
      e.status !== 'completed',
  )

  const request = () => {
    if (!patient) {
      toast.show({
        tone: 'warn',
        title: 'Switch to a patient account',
        body: 'Emergency requests are raised from a patient (or ASHA) account in this demo.',
      })
      return
    }
    setRequesting(true)
    const result = store.requestEmergency({
      patientId: patient.id,
      symptoms: symptoms.trim() || patient.mainIssue,
      riskLevel: risk,
      requestedByUserId: user.id,
    })
    setRequesting(false)
    if (result.reason === 'no_ambulance') {
      toast.show({
        tone: 'warn',
        title: 'No demo ambulance is free',
        body: 'Use the emergency hospital and ASHA contacts shown below.',
      })
      return
    }
    toast.show({
      tone: 'ok',
      title: 'Demo ambulance assigned',
      body: 'A pre-arrival alert has been sent to the hospital dashboard in this prototype.',
    })
  }

  const steps: TimelineStep[] = activeRequest
    ? EMERGENCY_FLOW.map((status, index) => {
        const currentIndex = EMERGENCY_FLOW.indexOf(
          activeRequest.status as (typeof EMERGENCY_FLOW)[number],
        )
        const event = [...activeRequest.timeline].reverse().find((e) => e.status === status)
        return {
          key: status,
          label: STATUS_LABEL[status],
          at: event ? formatDateTime(event.at) : undefined,
          note: event?.note,
          state:
            currentIndex < 0
              ? 'todo'
              : index < currentIndex
                ? 'done'
                : index === currentIndex
                  ? 'current'
                  : 'todo',
        }
      })
    : []

  return (
    <div className="space-y-6">
      {/* Emergency mode banner - the only aggressive visual in the app */}
      <div className="overflow-hidden rounded-lg bg-sos-600 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden="true"
              className="sos-pulse flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-white/15 text-white ring-1 ring-white/25 ring-inset"
            >
              <Icon name="siren" size={26} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl">
                {t('emergency.title')}
              </h1>
              <p className="mt-1 text-sm text-white/85">{t('emergency.subtitle')}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-dashed border-white/40 px-2.5 py-1 text-2xs font-bold tracking-wide text-white/85 uppercase">
            Prototype
          </span>
        </div>
      </div>

      {activeRequest ? (
        <Card tone="danger">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl leading-snug font-semibold tracking-tight text-ink-900">
                {STATUS_LABEL[activeRequest.status]}
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                {activeRequest.patientName}, {activeRequest.patientAge} · {activeRequest.village}
              </p>
              <p className="mt-1 text-[15px] text-ink-900">{activeRequest.symptoms}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <RiskBadge level={activeRequest.riskLevel} />
              {activeRequest.etaMin ? <Badge tone="info">ETA {activeRequest.etaMin} min</Badge> : null}
            </div>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-500 uppercase">Ambulance</dt>
              <dd className="text-[15px] font-semibold text-ink-900">
                {store.ambulances.find((a) => a.id === activeRequest.ambulanceId)?.code ??
                  'Not assigned'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500 uppercase">Destination hospital</dt>
              <dd className="text-[15px] font-semibold text-ink-900">
                {store.facilities.find((f) => f.id === activeRequest.destinationFacilityId)?.name ??
                  'Not assigned'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500 uppercase">Emergency bay</dt>
              <dd className="text-[15px] font-semibold text-ink-900">
                {activeRequest.emergencyPrepared ? 'Prepared by hospital' : 'Awaiting hospital'}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Coordination status</h3>
            <Timeline steps={steps} />
          </div>

          <Callout tone="neutral" className="mt-3" icon="flask" title="Prototype behaviour">
            The ambulance, hospital alert and ETA above are simulated inside this browser. No real
            ambulance has been dispatched and no hospital has been contacted.
          </Callout>

          <div className="mt-4 flex flex-wrap gap-2">
            {activeRequest.status === 'hospital_alerted' ? (
              <Button
                tone="primary"
                onClick={() => {
                  store.advanceEmergency(activeRequest.id, 'en_route', 'Ambulance picked up the patient (demo).')
                }}
              >
                Mark ambulance arrived & en route
              </Button>
            ) : null}
            <Button
              onClick={() => {
                store.clearActiveEmergency()
              }}
            >
              Hide this panel
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Request form + nearest ambulance */}
      {!activeRequest ? (
        <>
          <Card>
            <SectionHeading sub="Tell us briefly what has happened. This is attached to the hospital pre-arrival alert.">
              Request an ambulance
            </SectionHeading>
            <Field label="What is the emergency?" hint="One line is enough.">
              {({ id, describedBy }) => (
                <TextArea
                  id={id}
                  aria-describedby={describedBy}
                  value={symptoms}
                  onChange={(event) => {
                    setSymptoms(event.target.value)
                  }}
                  placeholder={
                    patient
                      ? `e.g. ${patient.mainIssue}`
                      : 'e.g. Severe chest pain since 20 minutes'
                  }
                />
              )}
            </Field>
            <Field label="How serious is it?">
              {({ id }) => (
                <Select
                  id={id}
                  value={risk}
                  onChange={(event) => {
                    setRisk(event.target.value as RiskLevel)
                  }}
                >
                  <option value="high">Very serious - life threatening</option>
                  <option value="medium">Serious - needs a hospital soon</option>
                  <option value="low">Not life threatening</option>
                </Select>
              )}
            </Field>
          </Card>

          <section aria-labelledby="ambulance-heading">
            <SectionHeading id="ambulance-heading" sub={t('emergency.subtitle')}>
              {t('emergency.nearestAmbulance')}
            </SectionHeading>
            {ambulances.length ? (
              <ul className="space-y-3">
                {ambulances.slice(0, 2).map((ambulance) => (
                  <AmbulanceCard
                    key={ambulance.id}
                    ambulance={ambulance}
                    requesting={requesting}
                    onRequest={request}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="ambulance"
                title={t('emergency.none')}
                body="Every demo ambulance is marked busy. Call the emergency hospital directly, or contact your ASHA worker for transport help."
              />
            )}
          </section>
        </>
      ) : null}

      <section aria-labelledby="hospital-heading">
        <SectionHeading id="hospital-heading">{t('emergency.nearestHospital')}</SectionHeading>
        {emergencyFacilities.length ? (
          <ul className="space-y-3">
            {emergencyFacilities.slice(0, 2).map((facility) => (
              <FacilityCard key={facility.id} facility={facility} note="24x7 emergency care" />
            ))}
          </ul>
        ) : (
          <EmptyState icon="hospital" title="No emergency facility in the demo data" />
        )}
      </section>

      {asha ? (
        <section aria-labelledby="asha-heading">
          <SectionHeading id="asha-heading">{t('emergency.ashaWorker')}</SectionHeading>
          <ul className="space-y-3">
            <AshaCard asha={asha} />
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="edoc-heading">
        <SectionHeading id="edoc-heading" sub="Doctors marked available for emergency care.">
          Emergency doctors
        </SectionHeading>
        {emergencyDoctors.length ? (
          <ul className="space-y-3">
            {emergencyDoctors.map(({ doctor, facility }) => (
              <DoctorCard key={doctor.id} doctor={doctor} facility={facility} emergency compact />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="doctor"
            title="No emergency doctor is marked available"
            body="Facility staff can change doctor availability from the facility dashboard."
          />
        )}
      </section>
    </div>
  )
}
