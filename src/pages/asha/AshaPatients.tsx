import { useState } from 'react'
import { PatientRecordView } from '@/components/record/PatientRecordView'
import { Badge, PendingSyncBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Dialog } from '@/components/ui/Dialog'
import { Field, FieldRow, Select, TextArea, TextInput } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { TableWrap, Td, Th, Tr } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useDemoAction } from '@/components/DemoAction'
import { isEffectivelyOffline, useAppStore } from '@/store/useAppStore'
import { bucketFollowUp, currentUser } from '@/store/selectors'
import { formatDate } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

export function AshaPatientsPage() {
  const toast = useToast()
  const demo = useDemoAction()
  const store = useAppStore()
  const user = currentUser(store)
  const offline = isEffectivelyOffline(store)

  const [openPatientId, setOpenPatientId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [screeningFor, setScreeningFor] = useState<string | null>(null)

  const patients = store.patients.filter((p) => p.ashaId === user.ashaId)
  const openPatient = patients.find((p) => p.id === openPatientId)

  return (
    <div className="space-y-6">
      <PageHeader
        icon="users"
        eyebrow="Field work"
        title="My patients"
        description="Everything here works offline. Actions are queued and synced when the connection returns."
        actions={
          <Button
            tone="primary"
            size="lg"
            onClick={() => {
              setRegisterOpen(true)
            }}
          
            icon={<Icon name="plus" size={16} />}
          >
            New patient
          </Button>
        }
      />

      {offline ? (
        <Callout tone="warn" icon="cloudOff" title="Working offline">
          You can still register patients, add screenings, create referrals and set follow-ups.
          Everything is saved on this device and marked &ldquo;waiting to sync&rdquo;.
        </Callout>
      ) : null}

      {patients.length ? (
        <TableWrap caption="Patients assigned to this ASHA worker">
          <thead>
            <Tr>
              <Th>Name</Th>
              <Th>Age</Th>
              <Th>Main issue</Th>
              <Th>Last visit</Th>
              <Th>Referral</Th>
              <Th>Follow-up</Th>
              <Th>Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const referral = store.referrals.find(
                (r) =>
                  r.patientId === patient.id && r.status !== 'completed' && r.status !== 'cancelled',
              )
              const followUps = store.followUps.filter(
                (f) => f.patientId === patient.id && f.status === 'scheduled',
              )
              const overdue = followUps.filter((f) => bucketFollowUp(f) === 'overdue').length
              return (
                <Tr key={patient.id}>
                  <Td>
                    <span className="font-medium text-ink-900">{patient.name}</span>
                    <span className="block text-xs text-ink-500">{patient.village}</span>
                    {patient.pendingSync ? (
                      <span className="mt-1 block">
                        <PendingSyncBadge />
                      </span>
                    ) : null}
                  </Td>
                  <Td>{patient.age}</Td>
                  <Td className="max-w-56">{patient.mainIssue}</Td>
                  <Td>{formatDate(patient.lastVisit)}</Td>
                  <Td>
                    {referral ? (
                      <Badge tone={referral.dropOffFlagged ? 'danger' : 'info'}>
                        {referral.dropOffFlagged
                          ? 'Not reached'
                          : referral.status.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-ink-500">None</span>
                    )}
                  </Td>
                  <Td>
                    {overdue ? (
                      <Badge tone="danger">{overdue} overdue</Badge>
                    ) : followUps.length ? (
                      <Badge tone="warn">{followUps.length} scheduled</Badge>
                    ) : (
                      <span className="text-xs text-ink-500">None</span>
                    )}
                  </Td>
                  <Td>
                    <span className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => {
                          setOpenPatientId(patient.id)
                        }}
                      >
                        Record
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setScreeningFor(patient.id)
                        }}
                      >
                        Screening
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          demo.call(patient.name, patient.phone)
                        }}
                      >
                        Call
                      </Button>
                      <LinkButton size="sm" to={`/assisted?patient=${patient.id}`}>
                        Assist
                      </LinkButton>
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState
          icon="users"
          title="No patients assigned"
          body="Register the first household member to get started."
          action={
            <Button
              tone="primary"
              onClick={() => {
                setRegisterOpen(true)
              }}
            >
              Register a patient
            </Button>
          }
        />
      )}

      {/* Patient record */}
      <Dialog
        open={Boolean(openPatient)}
        onClose={() => {
          setOpenPatientId(null)
        }}
        title={openPatient?.name ?? ''}
        description="You see only the sections this patient's consent allows an ASHA worker to see."
        width="lg"
      >
        {openPatient ? <PatientRecordView patient={openPatient} viewer={user} /> : null}
      </Dialog>

      <RegisterPatientDialog
        open={registerOpen}
        onClose={() => {
          setRegisterOpen(false)
        }}
        onDone={(name) => {
          toast.show({
            tone: 'ok',
            title: offline ? 'Patient saved offline' : 'Patient registered',
            body: offline
              ? `${name} is queued for the next prototype sync.`
              : `${name} added to your patient list.`,
          })
        }}
      />

      <ScreeningDialog
        patientId={screeningFor}
        onClose={() => {
          setScreeningFor(null)
        }}
      />
    </div>
  )
}

function RegisterPatientDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (name: string) => void
}) {
  const store = useAppStore()
  const user = currentUser(store)
  const asha = store.ashas.find((a) => a.id === user.ashaId)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState(asha?.village ?? 'Kalyanpur')
  const [householdId, setHouseholdId] = useState('')
  const [bloodGroup, setBloodGroup] = useState('Unknown')
  const [conditions, setConditions] = useState('')
  const [allergies, setAllergies] = useState('')
  const [mainIssue, setMainIssue] = useState('')

  const submit = () => {
    store.registerPatient({
      name: name.trim(),
      age: Number(age) || 0,
      gender,
      phone: phone.trim() || 'Not given',
      village,
      householdId: householdId || undefined,
      bloodGroup,
      allergies: allergies
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      conditions: conditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      mainIssue: mainIssue.trim() || 'General registration',
      ashaId: user.ashaId,
      registeredBy: 'asha',
    })
    onDone(name.trim())
    setName('')
    setAge('')
    setPhone('')
    setMainIssue('')
    setConditions('')
    setAllergies('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Register a new patient"
      description="Works offline. Only the fields you actually have are needed."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" disabled={!name.trim() || !age} onClick={submit}>
            Save patient
          </Button>
        </>
      }
    >
      <FieldRow>
        <Field label="Full name" required>
          {({ id }) => (
            <TextInput
              id={id}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Age" required>
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={age}
              onChange={(event) => {
                setAge(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Gender">
          {({ id }) => (
            <Select
              id={id}
              value={gender}
              onChange={(event) => {
                setGender(event.target.value as typeof gender)
              }}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          )}
        </Field>
        <Field label="Phone" hint="Leave blank if the family has no phone.">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Village">
          {({ id }) => (
            <Select
              id={id}
              value={village}
              onChange={(event) => {
                setVillage(event.target.value)
              }}
            >
              {(asha?.villagesCovered ?? ['Kalyanpur']).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Household">
          {({ id }) => (
            <Select
              id={id}
              value={householdId}
              onChange={(event) => {
                setHouseholdId(event.target.value)
              }}
            >
              <option value="">Not linked</option>
              {store.households
                .filter((h) => (asha?.householdIds ?? []).includes(h.id))
                .map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.code} - {household.headName}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Blood group">
          {({ id }) => (
            <Select
              id={id}
              value={bloodGroup}
              onChange={(event) => {
                setBloodGroup(event.target.value)
              }}
            >
              {['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldRow>
      <Field label="Existing conditions" hint="Comma separated">
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={conditions}
            onChange={(event) => {
              setConditions(event.target.value)
            }}
            placeholder="e.g. BP, diabetes"
          />
        )}
      </Field>
      <Field label="Allergies" hint="Comma separated">
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={allergies}
            onChange={(event) => {
              setAllergies(event.target.value)
            }}
          />
        )}
      </Field>
      <Field label="Main health issue">
        {({ id }) => (
          <TextArea
            id={id}
            value={mainIssue}
            onChange={(event) => {
              setMainIssue(event.target.value)
            }}
          />
        )}
      </Field>
    </Dialog>
  )
}

function ScreeningDialog({
  patientId,
  onClose,
}: {
  patientId: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const store = useAppStore()
  const user = currentUser(store)
  const offline = isEffectivelyOffline(store)
  const patient = store.patients.find((p) => p.id === patientId)
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [sugar, setSugar] = useState('')
  const [temp, setTemp] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')

  const submit = () => {
    if (!patient) return
    store.addScreening({
      patientId: patient.id,
      byAshaId: user.ashaId ?? 'asha_sunita',
      bpSystolic: bpSys ? Number(bpSys) : undefined,
      bpDiastolic: bpDia ? Number(bpDia) : undefined,
      bloodSugar: sugar ? Number(sugar) : undefined,
      temperatureF: temp ? Number(temp) : undefined,
      weightKg: weight ? Number(weight) : undefined,
      notes: notes || 'Household screening visit.',
    })
    toast.show({
      tone: 'ok',
      title: offline ? 'Screening saved offline' : 'Screening saved',
      body: offline
        ? 'Queued for the next prototype sync.'
        : 'Visible in the patient record and to the treating doctor.',
    })
    setBpSys('')
    setBpDia('')
    setSugar('')
    setTemp('')
    setWeight('')
    setNotes('')
    onClose()
  }

  return (
    <Dialog
      open={Boolean(patient)}
      onClose={onClose}
      title={`Add screening - ${patient?.name ?? ''}`}
      description="A risk band is calculated from these values as a triage aid. It is not a diagnosis."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="primary" onClick={submit}>
            Save screening
          </Button>
        </>
      }
    >
      <FieldRow>
        <Field label="BP systolic">
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={bpSys}
              onChange={(event) => {
                setBpSys(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="BP diastolic">
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={bpDia}
              onChange={(event) => {
                setBpDia(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Blood sugar (mg/dL)">
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={sugar}
              onChange={(event) => {
                setSugar(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Temperature (°F)">
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="decimal"
              value={temp}
              onChange={(event) => {
                setTemp(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label="Weight (kg)">
          {({ id }) => (
            <TextInput
              id={id}
              inputMode="decimal"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value)
              }}
            />
          )}
        </Field>
      </FieldRow>
      <Field label="Notes">
        {({ id }) => (
          <TextArea
            id={id}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
            }}
          />
        )}
      </Field>
    </Dialog>
  )
}
