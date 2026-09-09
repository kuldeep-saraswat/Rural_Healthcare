import { useSearchParams } from 'react-router-dom'
import { PatientRecordView } from '@/components/record/PatientRecordView'
import { PageHeader } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient, currentUser } from '@/store/selectors'

export function RecordsPage() {
  const [params] = useSearchParams()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)

  if (!patient) {
    return (
      <EmptyState
        icon="clipboard"
        title="No patient record on this account"
        body="Switch to the patient demo account (Ramesh Singh) to see a longitudinal health record."
        action={
          <LinkButton to="/" tone="primary">
            Back to home
          </LinkButton>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon="record"
        eyebrow="My health"
        title="Digital Health Record"
        description="Your complete record - consultations, prescriptions, reports, vaccinations, referrals and follow-ups."
      />

      <Callout tone="neutral" icon="lock" title="Who can see this">
        You always see your full record. Doctors, ASHA workers and facilities see only the parts
        your consent allows, and only while they are treating you. You can change consent from{' '}
        <strong>Profile</strong>.
      </Callout>

      <PatientRecordView
        patient={patient}
        viewer={user}
        focusPrescriptionId={params.get('prescription') ?? undefined}
      />
    </div>
  )
}
