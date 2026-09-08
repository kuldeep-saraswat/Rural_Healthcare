import { AiAssistant } from '@/components/ai/AiAssistant'
import { Card, SectionHeading } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { useT } from '@/services/i18n'
import { aiModeLabel } from '@/services/ai/router'

const CAPABILITIES: { icon: string; title: string; example: string }[] = [
  { icon: '🤒', title: 'Symptoms', example: 'Mujhe 2 din se bukhar aur khansi hai' },
  { icon: '🚑', title: 'Ambulance / emergency', example: 'Ambulance chahiye' },
  { icon: '👨‍⚕️', title: 'Doctor consultation', example: 'Doctor se baat karni hai' },
  { icon: '🏥', title: 'PHC / CHC / hospital', example: 'Paas ka PHC kahan hai?' },
  { icon: '🔬', title: 'Diagnostic tests', example: 'MRI kahan hoga?' },
  { icon: '💊', title: 'Medicine availability', example: 'Ye medicine kahan milegi?' },
  { icon: '💉', title: 'Vaccination', example: 'Bacche ka teeka kab hai?' },
  { icon: '⛺', title: 'Medical camps', example: 'Gaon mein camp kab lagega?' },
  { icon: '🖥️', title: 'Health kiosk', example: 'Kiosk par kya hota hai?' },
  { icon: '🔁', title: 'Referral status', example: 'Mera referral kahan pahuncha?' },
  { icon: '📅', title: 'Follow-up', example: 'Kal follow-up hai kya?' },
  { icon: '📋', title: 'Health record', example: 'Meri purani report dikhao' },
  { icon: '🛡️', title: 'Preventive care', example: 'BP check karwana hai' },
  { icon: '☀️', title: 'Weather precautions', example: 'Abhi bahut garmi hai, kya karein?' },
  { icon: '📢', title: 'Local disease alerts', example: 'Mere area mein koi bimari fail rahi hai?' },
  { icon: '🧑‍🤝‍🧑', title: 'ASHA worker', example: 'Nearest ASHA kaun hai?' },
]

export function AiHealthPage() {
  const t = useT()
  return (
    <div className="space-y-5">
      <SectionHeading sub={t('app.tagline')}>{t('nav.ai')}</SectionHeading>

      <AiAssistant variant="page" />

      <Callout tone="neutral" icon="🧠" title="How the assistant works in this prototype">
        {aiModeLabel()}. Your message is matched against a multilingual intent catalogue (Hindi,
        English and Marathi, including Roman transliteration), the relevant demo data is looked up,
        and the assistant opens the right screen with your context already applied. Nothing is sent
        to an external service.
      </Callout>

      <section aria-labelledby="cap-heading">
        <SectionHeading
          id="cap-heading"
          sub="Type or speak any of these in Hindi, English or Marathi."
        >
          What you can ask
        </SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <Card as="li" key={capability.title} className="list-none">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="text-xl">
                  {capability.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-ink-900">{capability.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">“{capability.example}”</p>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      </section>

      <Callout tone="warn" icon="⚕️" title="Medical safety">
        RuralCare AI gives possible causes, a risk level and next steps. It never confirms a
        diagnosis, never prescribes medicine or a dose, and never makes a clinical decision on its
        own. Medicine reminders are created only from a doctor&apos;s prescription.
      </Callout>
    </div>
  )
}
