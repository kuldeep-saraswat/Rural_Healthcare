import { useNavigate } from 'react-router-dom'
import type { AiCard } from '@/services/ai/types'
import { DoctorCard } from '@/components/cards/DoctorCard'
import {
  AmbulanceCard,
  AshaCard,
  FacilityCard,
  KioskCard,
} from '@/components/cards/FacilityCards'
import {
  MedicineAvailabilityCard,
  TestAvailabilityCard,
  VaccineAvailabilityCard,
} from '@/components/cards/ResourceCards'
import {
  FollowUpCard,
  ReferralCard,
  ScheduleSummaryCard,
} from '@/components/cards/CareCards'
import { AlertCard, CampCard, EnvironmentCard } from '@/components/cards/PublicHealthCards'
import { TriageCard } from '@/components/ai/TriageCard'
import { Card } from '@/components/ui/Card'
import { Button, LinkButton } from '@/components/ui/Button'
import { Icon, IconChip } from '@/components/ui/Icon'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { useToast } from '@/components/ui/Toast'
import { summariseRecord } from '@/services/ai/decisionSupport'

/**
 * Renders the assistant's action cards. Every card here is the *same* card
 * component used on the dedicated page, so an action taken from chat behaves
 * exactly like the one taken from the page.
 */
export function AiCardList({ cards }: { cards: AiCard[] }) {
  if (!cards.length) return null
  return (
    <ul className="mt-3.5 space-y-3">
      {cards.map((card, index) => (
        <AiCardRenderer key={`${card.kind}-${index}`} card={card} />
      ))}
    </ul>
  )
}

function AiCardRenderer({ card }: { card: AiCard }) {
  const navigate = useNavigate()
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)

  switch (card.kind) {
    case 'doctor': {
      const doctor = store.doctors.find((d) => d.id === card.doctorId)
      if (!doctor) return null
      return (
        <DoctorCard
          doctor={doctor}
          facility={store.facilities.find((f) => f.id === doctor.facilityId)}
          emergency={card.emergency}
          compact
        />
      )
    }
    case 'ambulance': {
      const ambulance = store.ambulances.find((a) => a.id === card.ambulanceId)
      if (!ambulance) return null
      return (
        <AmbulanceCard
          ambulance={ambulance}
          onRequest={() => {
            navigate('/emergency')
          }}
        />
      )
    }
    case 'facility': {
      const facility = store.facilities.find((f) => f.id === card.facilityId)
      if (!facility) return null
      return <FacilityCard facility={facility} note={card.note} showResources={false} />
    }
    case 'kiosk': {
      const facility = store.facilities.find((f) => f.id === card.facilityId)
      if (!facility) return null
      return (
        <KioskCard
          facility={facility}
          onStart={() => {
            navigate(`/kiosks?facility=${facility.id}`)
          }}
        />
      )
    }
    case 'medicine': {
      const facility = store.facilities.find((f) => f.id === card.facilityId)
      if (!facility) return null
      return <MedicineAvailabilityCard medicineId={card.medicineId} facility={facility} />
    }
    case 'test': {
      const facility = store.facilities.find((f) => f.id === card.facilityId)
      if (!facility) return null
      return <TestAvailabilityCard testId={card.testId} facility={facility} />
    }
    case 'vaccine': {
      const facility = store.facilities.find((f) => f.id === card.facilityId)
      if (!facility) return null
      return (
        <VaccineAvailabilityCard
          vaccineId={card.vaccineId}
          facility={facility}
          onRemind={() => {
            toast.show({
              tone: 'ok',
              title: 'Reminder set (demo)',
              body: 'You will see this vaccine in your preventive care list.',
            })
          }}
        />
      )
    }
    case 'camp': {
      const camp = store.camps.find((c) => c.id === card.campId)
      if (!camp) return null
      const registered = store.campRegistrations.some(
        (r) => r.campId === camp.id && r.patientId === user.patientId,
      )
      return (
        <CampCard
          camp={camp}
          registered={registered}
          onRegister={
            user.patientId
              ? () => {
                  const id = store.registerForCamp(camp.id, user.patientId!, user.name, 'patient')
                  toast.show({
                    tone: id ? 'ok' : 'warn',
                    title: id ? 'Registered for the camp (demo)' : 'Could not register',
                    body: id ? camp.name : 'Slots may be full or you are already registered.',
                  })
                }
              : undefined
          }
        />
      )
    }
    case 'asha': {
      const asha = store.ashas.find((a) => a.id === card.ashaId)
      if (!asha) return null
      return <AshaCard asha={asha} />
    }
    case 'referral': {
      const referral = store.referrals.find((r) => r.id === card.referralId)
      if (!referral) return null
      return <ReferralCard referral={referral} showTimeline />
    }
    case 'followUp': {
      const followUp = store.followUps.find((f) => f.id === card.followUpId)
      if (!followUp) return null
      return (
        <FollowUpCard
          followUp={followUp}
          actions={
            <LinkButton to="/follow-ups" iconAfter={<Icon name="arrowRight" size={15} />}>
              View follow-up
            </LinkButton>
          }
        />
      )
    }
    case 'alert': {
      const alert = store.alerts.find((a) => a.id === card.alertId)
      if (!alert) return null
      return <AlertCard alert={alert} compact />
    }
    case 'environment': {
      const reading = store.environment.find((e) => e.village === card.village)
      if (!reading) return null
      return <EnvironmentCard reading={reading} />
    }
    case 'medication':
      return <ScheduleSummaryCard scheduleId={card.scheduleId} />
    case 'record': {
      const summary = summariseRecord(store, card.patientId)
      return (
        <Card as="li" className="list-none">
          <div className="flex items-start gap-3">
            <IconChip name="record" tone="care" size="sm" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-ink-900">{summary.headline}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
                {summary.lines.slice(0, 4).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-300"
                    />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <Button
              tone="primary"
              iconAfter={<Icon name="arrowRight" size={16} />}
              onClick={() => {
                navigate('/records')
              }}
            >
              Open full health record
            </Button>
          </div>
        </Card>
      )
    }
    case 'triage':
      return <TriageCard result={card.result} />
    case 'link':
      return (
        <Card as="li" className="list-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <IconChip name="compass" tone="info" size="sm" />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-ink-900">{card.label}</h3>
                {card.description ? (
                  <p className="mt-0.5 text-sm text-ink-500">{card.description}</p>
                ) : null}
              </div>
            </div>
            <Button
              tone="primary"
              iconAfter={<Icon name="arrowRight" size={16} />}
              onClick={() => {
                navigate(card.path)
              }}
            >
              Open
            </Button>
          </div>
        </Card>
      )
    default:
      return null
  }
}
