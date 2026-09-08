import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, KeyValue, SectionHeading } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Toggle } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { ConnectivityControls, LanguageSwitcher } from '@/components/layout/HeaderWidgets'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient, currentUser } from '@/store/selectors'
import { ROLE_LABEL } from '@/services/permissions'
import { formatDateTime } from '@/lib/utils'

export function ProfilePage() {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const patient = currentPatient(store)
  const household = store.households.find((h) => h.id === patient?.householdId)
  const asha = store.ashas.find((a) => a.id === patient?.ashaId)

  if (!patient) {
    return (
      <EmptyState
        icon="👤"
        title="No patient profile on this account"
        body={`You are signed in as ${user.name} (${ROLE_LABEL[user.role]}).`}
      />
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeading sub="Your details, what you share, and how the app behaves on a weak connection.">
        Profile
      </SectionHeading>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">{patient.name}</h2>
            <p className="text-sm text-ink-700">
              {patient.age} years · {patient.gender} · {patient.village}
            </p>
          </div>
          <Badge tone="info">Blood group {patient.bloodGroup}</Badge>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue label="Phone">{patient.phone}</KeyValue>
          <KeyValue label="Household">{household ? household.code : 'Not linked'}</KeyValue>
          <KeyValue label="ASHA worker">{asha ? asha.name : 'Not assigned'}</KeyValue>
          <KeyValue label="Allergies">
            {patient.allergies.length ? patient.allergies.join(', ') : 'None recorded'}
          </KeyValue>
          <KeyValue label="Existing conditions">
            {patient.conditions.length ? patient.conditions.join('; ') : 'None recorded'}
          </KeyValue>
          <KeyValue label="Current medicines">
            {patient.currentMedicines.length ? patient.currentMedicines.join(', ') : 'None recorded'}
          </KeyValue>
          <KeyValue label="Registered by">{patient.registeredBy}</KeyValue>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Consent - who can see my record</h2>
        <p className="mt-1 mb-2 text-sm text-ink-500">
          Turning a switch off hides those sections from that role immediately, everywhere in the
          app. Last updated {formatDateTime(patient.consent.updatedAt)}.
        </p>
        <Toggle
          label="Treating doctors"
          description="Doctors who are consulting you or receiving your referral."
          checked={patient.consent.shareWithTreatingDoctors}
          onChange={(value) => {
            store.updateConsent(patient.id, { shareWithTreatingDoctors: value })
            toast.show({
              tone: value ? 'ok' : 'warn',
              title: value ? 'Doctors can see your record' : 'Doctors can no longer see your record',
            })
          }}
        />
        <Toggle
          label="Referral facility"
          description="Hospital or PHC staff at the facility you have been referred to."
          checked={patient.consent.shareWithReferralFacility}
          onChange={(value) => {
            store.updateConsent(patient.id, { shareWithReferralFacility: value })
          }}
        />
        <Toggle
          label="ASHA worker"
          description="Your village health worker, for screening and follow-up support."
          checked={patient.consent.shareWithAsha}
          onChange={(value) => {
            store.updateConsent(patient.id, { shareWithAsha: value })
          }}
        />
        <Toggle
          label="Anonymised statistics"
          description="Counts only, with no name or phone number, used for district planning."
          checked={patient.consent.shareAnonymisedWithAdmin}
          onChange={(value) => {
            store.updateConsent(patient.id, { shareAnonymisedWithAdmin: value })
          }}
        />
        <Callout tone="neutral" className="mt-3" icon="🔐" title="Prototype privacy model">
          Admin and government accounts never see an identifiable patient record in this
          prototype - only aggregates. Patient data stays in this browser and is never sent
          anywhere.
        </Callout>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Language</h2>
        <p className="mt-1 mb-3 text-sm text-ink-500">
          The assistant understands all three, including Roman transliteration.
        </p>
        <LanguageSwitcher />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-900">Connection</h2>
        <ConnectivityControls />
      </Card>

      <div className="flex flex-wrap gap-2">
        <LinkButton to="/records" tone="primary">
          Open my health record
        </LinkButton>
        <LinkButton to="/village">Village health access</LinkButton>
      </div>
    </div>
  )
}
