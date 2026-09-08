import { useNavigate, useSearchParams } from 'react-router-dom'
import { AshaCard, KioskCard } from '@/components/cards/FacilityCards'
import { CampCard } from '@/components/cards/PublicHealthCards'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { FlowStrip } from '@/components/ui/Timeline'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useAppStore } from '@/store/useAppStore'
import { ashaForPatient, currentPatient, currentUser, upcomingCamps } from '@/store/selectors'

// ---------------------------------------------------------------------------
// Medical camps
// ---------------------------------------------------------------------------

export function CampsPage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)
  const camps = upcomingCamps(store.camps)
  const past = store.camps.filter((c) => c.status === 'completed')

  const isRegistered = (campId: string) =>
    store.campRegistrations.some((r) => r.campId === campId && r.patientId === patient?.id)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Camps and mobile medical units coming to villages near you.">
        Medical camps
      </SectionHeading>

      {camps.length ? (
        <ul className="space-y-3">
          {camps.map((camp) => (
            <CampCard
              key={camp.id}
              camp={camp}
              registered={isRegistered(camp.id)}
              onRegister={
                patient
                  ? () => {
                      const id = store.registerForCamp(camp.id, patient.id, user.name, 'patient')
                      toast.show({
                        tone: id ? 'ok' : 'warn',
                        title: id ? 'Registered (demo)' : 'Could not register',
                        body: id
                          ? `${camp.name}. Your ASHA worker and the organising facility can see this registration.`
                          : 'Slots may be full, or you are already registered.',
                      })
                    }
                  : undefined
              }
              onCancel={
                patient
                  ? () => {
                      const registration = store.campRegistrations.find(
                        (r) => r.campId === camp.id && r.patientId === patient.id,
                      )
                      if (registration) {
                        store.cancelCampRegistration(registration.id)
                        toast.show({ tone: 'warn', title: 'Registration cancelled' })
                      }
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon="⛺" title="No upcoming camps listed" />
      )}

      {past.length ? (
        <section>
          <h2 className="mt-6 mb-3 text-lg font-bold text-ink-900">Past camps</h2>
          <ul className="space-y-3">
            {past.map((camp) => (
              <CampCard key={camp.id} camp={camp} registered={isRegistered(camp.id)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Health kiosks + assisted mode entry
// ---------------------------------------------------------------------------

export function KiosksPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const store = useAppStore()
  const patient = currentPatient(store)
  const kiosks = store.facilities
    .filter((f) => f.type === 'kiosk')
    .sort((a, b) => a.distanceKm - b.distanceKm)
  const focused = params.get('facility')

  return (
    <div className="space-y-4">
      <SectionHeading sub="For people without a smartphone, with low digital literacy, or without reliable internet. A trained village volunteer helps you use the system.">
        Village health kiosk
      </SectionHeading>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">How assisted healthcare works</h2>
        <p className="mt-1 mb-3 text-sm text-ink-500">
          The patient never has to operate the website alone.
        </p>
        <FlowStrip
          steps={[
            { label: 'Patient', hint: 'walks in' },
            { label: 'ASHA / volunteer', hint: 'assists' },
            { label: 'Basic screening', hint: 'BP, sugar' },
            { label: 'AI assistance', hint: 'possible causes' },
            { label: 'Doctor', hint: 'teleconsultation' },
            { label: 'Referral', hint: 'if needed' },
            { label: 'Hospital', hint: 'treatment' },
            { label: 'Follow-up', hint: 'ASHA tracks' },
          ]}
        />
        <div className="mt-4">
          <Button
            tone="primary"
            size="lg"
            icon="🤝"
            onClick={() => {
              navigate(patient ? `/assisted?patient=${patient.id}` : '/assisted')
            }}
          >
            Start Assisted Consultation
          </Button>
        </div>
      </Card>

      {kiosks.length ? (
        <ul className="space-y-3">
          {kiosks.map((kiosk) => (
            <KioskCard
              key={kiosk.id}
              facility={kiosk}
              onStart={() => {
                navigate(
                  patient
                    ? `/assisted?patient=${patient.id}&kiosk=${kiosk.id}`
                    : `/assisted?kiosk=${kiosk.id}`,
                )
              }}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon="🖥️" title="No kiosk in the demo data" />
      )}

      {focused ? (
        <Callout tone="info" icon="📍" title="Selected kiosk">
          {store.facilities.find((f) => f.id === focused)?.name}
        </Callout>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ASHA contact (patient view)
// ---------------------------------------------------------------------------

export function AshaContactPage() {
  const store = useAppStore()
  const patient = currentPatient(store)
  const asha = ashaForPatient(store.ashas, patient)
  const others = store.ashas.filter((a) => a.id !== asha?.id)

  return (
    <div className="space-y-4">
      <SectionHeading sub="Your village-level health worker - usually the fastest way to get help.">
        ASHA worker
      </SectionHeading>

      {asha ? (
        <ul className="space-y-3">
          <AshaCard asha={asha} />
        </ul>
      ) : (
        <EmptyState icon="🧑‍🤝‍🧑" title="No ASHA worker mapped to your village" />
      )}

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">What your ASHA worker can do</h2>
        <ul className="mt-2 space-y-1 text-[15px] text-ink-900">
          {[
            'Register you and your household in the system',
            'Do a basic screening (BP, blood sugar, temperature)',
            'Help you reach a doctor or a teleconsultation',
            'Create a referral and arrange transport support',
            'Track your referral and follow-ups',
            'Register you for a medical camp',
            'Work offline in your village and sync later',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-ok-700">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <LinkButton to="/kiosks">See assisted healthcare mode</LinkButton>
        </div>
      </Card>

      {others.length ? (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink-900">Other ASHA workers nearby</h2>
          <ul className="space-y-3">
            {others.map((worker) => (
              <AshaCard key={worker.id} asha={worker} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
