import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, DemoBadge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Field, TextArea } from '@/components/ui/Form'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useDemoAction } from '@/components/DemoAction'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient } from '@/store/selectors'
import { cx } from '@/lib/utils'
import { Icon } from '@/components/ui/Icon'

/**
 * Simulated teleconsultation room.
 *
 * There is no WebRTC signalling in the prototype, so nothing is transmitted -
 * the screen states that plainly. The layout, state machine and consultation
 * record it produces are the real parts, so a WebRTC media layer can be
 * dropped in behind the same UI later.
 */
export function ConsultPage() {
  const { doctorId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const demo = useDemoAction()
  const store = useAppStore()
  const patient = currentPatient(store)
  const doctor = store.doctors.find((d) => d.id === doctorId)
  const facility = store.facilities.find((f) => f.id === doctor?.facilityId)

  const [phase, setPhase] = useState<'waiting' | 'connected' | 'ended'>('waiting')
  const [seconds, setSeconds] = useState(0)
  const [complaint, setComplaint] = useState(patient?.mainIssue ?? '')

  useEffect(() => {
    if (phase !== 'connected') return
    const timer = setInterval(() => {
      setSeconds((value) => value + 1)
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [phase])

  if (!doctor) {
    return (
      <EmptyState
        icon="doctor"
        title="Doctor not found"
        body="This consultation link does not match any doctor in the demo data."
        action={
          <LinkButton to="/doctors" tone="primary">
            Back to doctors
          </LinkButton>
        }
      />
    )
  }

  const endConsultation = () => {
    setPhase('ended')
    if (!patient) return
    const consultationId = store.createConsultation({
      patientId: patient.id,
      doctorId: doctor.id,
      symptoms: complaint.trim() || patient.mainIssue,
      assessment: 'Simulated teleconsultation - doctor notes pending.',
      observations: 'No examination findings (video consultation in prototype).',
      testsAdvised: [],
      riskLevel: 'low',
      emergency: false,
      mode: 'video',
    })
    toast.show({
      tone: 'ok',
      title: 'Consultation recorded (demo)',
      body: 'It now appears in your health record and on the doctor dashboard for notes.',
    })
    return consultationId
  }

  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0')
  const secs = `${seconds % 60}`.padStart(2, '0')

  return (
    <div className="space-y-6">
      <PageHeader
        icon="video"
        eyebrow="Teleconsultation"
        title={`Consultation with ${doctor.name}`}
        description={`${doctor.specialty} · ${facility?.name ?? ''}`}
      />

      <Callout tone="warn" icon="video" title="Simulated video consultation">
        This prototype does not carry real audio or video. Nothing is recorded or transmitted. The
        room below shows the flow a real WebRTC consultation would follow.
      </Callout>

      <Card className="overflow-hidden p-0">
        <div className="relative aspect-video w-full bg-ink-900">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white/80">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 ring-inset"
            >
              <Icon
                name={phase === 'connected' ? 'stethoscope' : phase === 'ended' ? 'checkCircle' : 'clock'}
                size={30}
                strokeWidth={1.6}
              />
            </span>
            <p className="text-lg font-semibold text-white">
              {phase === 'waiting'
                ? 'Waiting to connect'
                : phase === 'connected'
                  ? `${doctor.name} (simulated video)`
                  : 'Consultation ended'}
            </p>
            <p className="max-w-sm text-sm">
              {phase === 'waiting'
                ? 'Press "Join consultation" to start the simulated room.'
                : phase === 'connected'
                  ? 'No real video stream is running - this is a placeholder pane.'
                  : 'Your consultation has been added to your health record.'}
            </p>
          </div>
          {phase === 'connected' ? (
            <div className="absolute right-3 bottom-3 flex h-24 w-32 items-center justify-center rounded-card border border-white/20 bg-ink-700 text-xs text-white/70">
              You (camera off)
            </div>
          ) : null}
          {phase === 'connected' ? (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="rounded-full bg-sos-600 px-2 py-0.5 text-xs font-bold text-white">
                ● SIMULATED
              </span>
              <span className="rounded-full bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {minutes}:{secs}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline p-4">
          {phase === 'waiting' ? (
            <Button
              tone="primary"
              size="lg"
              icon={<Icon name="video" size={16} />}
              onClick={() => {
                setPhase('connected')
              }}
            >
              Join consultation
            </Button>
          ) : null}
          {phase === 'connected' ? (
            <>
              <Button
                size="lg"
                icon={<Icon name="mic" size={16} />}
                onClick={() => {
                  demo.custom(
                    'Demo control: microphone',
                    <p>Audio devices are not used in the prototype, so there is nothing to mute.</p>,
                    'Real-world integration: WebRTC getUserMedia track toggling.',
                  )
                }}
              >
                Mute
              </Button>
              <Button
                size="lg"
                icon={<Icon name="video" size={16} />}
                onClick={() => {
                  demo.custom(
                    'Demo control: camera',
                    <p>No camera is opened in the prototype.</p>,
                    'Real-world integration: WebRTC video track toggling.',
                  )
                }}
              >
                Camera
              </Button>
              <Button tone="danger" size="lg" icon={<Icon name="cloudOff" size={16} />} onClick={endConsultation}>
                End consultation
              </Button>
            </>
          ) : null}
          {phase === 'ended' ? (
            <>
              <LinkButton to="/records" tone="primary" size="lg">
                Open my health record
              </LinkButton>
              <Button
                size="lg"
                onClick={() => {
                  navigate('/doctors')
                }}
              >
                Back to doctors
              </Button>
            </>
          ) : null}
          <span className="ml-auto flex items-center gap-2">
            <Badge tone={doctor.status === 'available' ? 'ok' : 'neutral'}>
              {doctor.status === 'available' ? 'Doctor available' : 'Doctor not available'}
            </Badge>
            <DemoBadge label="Simulated" />
          </span>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg leading-snug font-semibold tracking-tight text-ink-900">What would you like to tell the doctor?</h2>
        <p className="mt-1 text-sm text-ink-500">
          This is attached to the consultation record so the doctor can add notes and, if needed, a
          prescription or referral.
        </p>
        <div className="mt-3">
          <Field label="Your complaint">
            {({ id }) => (
              <TextArea
                id={id}
                value={complaint}
                onChange={(event) => {
                  setComplaint(event.target.value)
                }}
                placeholder="e.g. Fever for 2 days with cough"
                disabled={phase === 'ended'}
              />
            )}
          </Field>
        </div>
        {patient ? (
          <div className={cx('rounded-card border border-hairline bg-canvas p-3 text-sm')}>
            <p className="font-semibold text-ink-900">Shared with the doctor (with your consent)</p>
            <ul className="mt-1 space-y-0.5 text-ink-700">
              <li>Name, age and village</li>
              <li>Known conditions: {patient.conditions.join(', ') || 'none recorded'}</li>
              <li>Allergies: {patient.allergies.join(', ') || 'none recorded'}</li>
              <li>Current medicines: {patient.currentMedicines.join(', ') || 'none recorded'}</li>
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              You can change what is shared at any time from your profile consent settings.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
