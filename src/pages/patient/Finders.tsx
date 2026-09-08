import { useSearchParams } from 'react-router-dom'
import { MEDICINE_CATALOG, TEST_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import {
  MedicineAvailabilityCard,
  TestAvailabilityCard,
  VaccineAvailabilityCard,
} from '@/components/cards/ResourceCards'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Callout, SafetyNote } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import {
  currentPatient,
  currentUser,
  findMedicineAvailability,
  findTestAvailability,
  findVaccineAvailability,
} from '@/store/selectors'
import { useT } from '@/services/i18n'
import { cx, formatDate } from '@/lib/utils'

/** Shared search header used by the medicine, test and vaccine finders. */
function FinderSearch({
  label,
  placeholder,
  chips,
}: {
  label: string
  placeholder: string
  chips: { id: string; label: string }[]
}) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  const setQuery = (value: string) => {
    const updated = new URLSearchParams(params)
    if (value) updated.set('q', value)
    else updated.delete('q')
    setParams(updated, { replace: true })
  }

  return (
    <Card>
      <label htmlFor="finder-q" className="mb-1 block text-sm font-semibold text-ink-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id="finder-q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          placeholder={placeholder}
          className="min-h-12 w-full rounded-card border border-hairline bg-surface px-3 text-[15px] focus:border-care-500"
        />
        {query ? (
          <Button
            onClick={() => {
              setQuery('')
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={query.toLowerCase() === chip.label.toLowerCase()}
            onClick={() => {
              setQuery(chip.label)
            }}
            className={cx(
              'min-h-10 rounded-card border px-3 text-sm font-medium',
              query.toLowerCase() === chip.label.toLowerCase()
                ? 'border-care-600 bg-care-600 text-white'
                : 'border-hairline bg-surface text-ink-700 hover:bg-care-50',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Medicines
// ---------------------------------------------------------------------------

export function MedicinesPage() {
  const t = useT()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const facilities = useAppStore((s) => s.facilities)
  const results = findMedicineAvailability(facilities, query)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Stock status reported by facilities in the demo dataset. This is availability information only.">
        Medicine availability
      </SectionHeading>

      <FinderSearch
        label="Which medicine are you looking for?"
        placeholder="e.g. Paracetamol, sugar ki dawa, पैरासिटामोल"
        chips={MEDICINE_CATALOG.slice(0, 6).map((m) => ({ id: m.id, label: m.name }))}
      />

      {results.length ? (
        <>
          <p className="text-sm text-ink-500">{results.length} result(s), nearest first.</p>
          <ul className="space-y-3">
            {results.map((result) => (
              <MedicineAvailabilityCard
                key={`${result.medicine.id}-${result.facility.id}`}
                medicineId={result.medicine.id}
                facility={result.facility}
                entry={{
                  itemId: result.medicine.id,
                  status: result.status,
                  updatedAt: result.updatedAt,
                }}
              />
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon="💊"
          title={query ? t('empty.noMedicine') : 'Search for a medicine'}
          body={
            query
              ? 'Try another spelling, or ask your ASHA worker to check with the PHC.'
              : 'Type a medicine name above, or ask the assistant "Ye medicine kahan milegi?".'
          }
          action={<LinkButton to="/ai">Ask the assistant</LinkButton>}
        />
      )}

      <SafetyNote>{t('symptom.noPrescription')}</SafetyNote>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export function TestsPage() {
  const t = useT()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const facilities = useAppStore((s) => s.facilities)
  const results = findTestAvailability(facilities, query)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Where a test is available, how long the report takes and the indicative cost.">
        Test finder
      </SectionHeading>

      <FinderSearch
        label="Which test do you need?"
        placeholder="e.g. MRI, CBC, sugar test, सोनोग्राफी"
        chips={[
          { id: 't_mri', label: 'MRI' },
          { id: 't_ct', label: 'CT' },
          { id: 't_cbc', label: 'CBC' },
          { id: 't_usg', label: 'USG' },
          { id: 't_ecg', label: 'ECG' },
          { id: 't_sugar', label: 'Blood Sugar' },
        ]}
      />

      {results.length ? (
        <>
          <p className="text-sm text-ink-500">{results.length} facility(ies), nearest first.</p>
          <ul className="space-y-3">
            {results.map((result) => (
              <TestAvailabilityCard
                key={`${result.test.id}-${result.facility.id}`}
                testId={result.test.id}
                facility={result.facility}
                entry={{
                  itemId: result.test.id,
                  status: 'available',
                  updatedAt: new Date().toISOString(),
                  reportInHours: result.reportInHours,
                }}
              />
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon="🔬"
          title={query ? t('empty.noTest') : 'Search for a test'}
          body={
            query
              ? 'No demo facility currently reports this test as available. A doctor can refer you to a higher centre.'
              : 'Type a test name above, or ask the assistant "MRI kahan hoga?".'
          }
          action={
            <>
              <LinkButton to="/ai">Ask the assistant</LinkButton>
              <LinkButton to="/doctors">Talk to a doctor</LinkButton>
            </>
          }
        />
      )}

      <Callout tone="neutral" icon="🧪" title="Prototype only">
        Availability, report times and costs are fictional demo values. In a real deployment these
        would come from each facility&apos;s own system.
      </Callout>

      <details className="rounded-card border border-hairline bg-surface p-4">
        <summary className="cursor-pointer font-semibold text-ink-900">
          All tests in the demo catalogue ({TEST_CATALOG.length})
        </summary>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {TEST_CATALOG.map((test) => (
            <li key={test.id} className="text-sm text-ink-700">
              <span className="font-medium text-ink-900">{test.name}</span> · {test.category}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vaccines
// ---------------------------------------------------------------------------

export function VaccinesPage() {
  const toast = useToast()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)
  const results = findVaccineAvailability(store.facilities, query)

  const myDue = patient
    ? store.vaccinations.filter((v) => v.patientId === patient.id && v.status !== 'given')
    : []
  const household = patient?.householdId
    ? store.patients.filter((p) => p.householdId === patient.householdId)
    : []
  const householdDue = store.vaccinations.filter(
    (v) => household.some((p) => p.id === v.patientId) && v.status !== 'given',
  )

  return (
    <div className="space-y-4">
      <SectionHeading sub="Eligibility, centres, next session and registration.">
        Vaccination
      </SectionHeading>

      {myDue.length || householdDue.length ? (
        <Card tone="warn">
          <h2 className="text-lg font-semibold text-ink-900">Due in your family</h2>
          <ul className="mt-2 space-y-2">
            {(myDue.length ? myDue : householdDue).map((record) => {
              const person = store.patients.find((p) => p.id === record.patientId)
              return (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2 last:border-0"
                >
                  <span>
                    <span className="font-medium text-ink-900">{person?.name}</span>{' '}
                    <span className="text-sm text-ink-700">
                      · {record.vaccineName} dose {record.doseNumber}
                    </span>
                    {record.dueDate ? (
                      <span className="block text-xs text-ink-500">
                        Due {formatDate(record.dueDate)}
                      </span>
                    ) : null}
                  </span>
                  <Badge tone={record.status === 'overdue' ? 'danger' : 'warn'}>
                    {record.status}
                  </Badge>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Your ASHA worker sees the same list as missed-vaccination follow-ups.
          </p>
        </Card>
      ) : null}

      <FinderSearch
        label="Which vaccine?"
        placeholder="e.g. MR, polio, Td, खसरा"
        chips={VACCINE_CATALOG.slice(0, 5).map((v) => ({ id: v.id, label: v.name }))}
      />

      {results.length ? (
        <ul className="space-y-3">
          {results.map((result) => (
            <VaccineAvailabilityCard
              key={`${result.vaccine.id}-${result.facility.id}`}
              vaccineId={result.vaccine.id}
              facility={result.facility}
              onRegister={() => {
                toast.show({
                  tone: 'ok',
                  title: 'Registered for the vaccination session (demo)',
                  body: `${result.vaccine.name} at ${result.facility.name}. Nothing was sent to a real registry.`,
                })
              }}
              onRemind={() => {
                store.pushNotification({
                  userId: user.id,
                  title: `Reminder set: ${result.vaccine.name}`,
                  body: `${result.facility.name} · ${result.nextSlot ?? 'session time to be confirmed'}`,
                  kind: 'alert',
                  actionPath: '/vaccines',
                  actionLabel: 'Open vaccines',
                })
                toast.show({ tone: 'ok', title: 'Reminder added to your notifications' })
              }}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="💉"
          title="No vaccine stock matches"
          body="Try another vaccine name, or check with your ASHA worker for the next immunisation session."
          action={<LinkButton to="/asha-contact">Contact ASHA</LinkButton>}
        />
      )}
    </div>
  )
}
