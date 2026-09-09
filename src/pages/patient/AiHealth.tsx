import { AiAssistant } from '@/components/ai/AiAssistant'
import { PageHeader, SectionHeading } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { DemoBadge } from '@/components/ui/Badge'
import { useT } from '@/services/i18n'
import { aiModeLabel } from '@/services/ai/router'

/** What the assistant can actually resolve. Every entry maps to a real intent. */
const CAPABILITIES: { icon: IconName; title: string; example: string }[] = [
  { icon: 'thermometer', title: 'Symptoms', example: 'Mujhe 2 din se bukhar aur khansi hai' },
  { icon: 'ambulance', title: 'Ambulance / emergency', example: 'Ambulance chahiye' },
  { icon: 'doctor', title: 'Doctor consultation', example: 'Doctor se baat karni hai' },
  { icon: 'hospital', title: 'PHC / CHC / hospital', example: 'Paas ka PHC kahan hai?' },
  { icon: 'microscope', title: 'Diagnostic tests', example: 'MRI kahan hoga?' },
  { icon: 'pill', title: 'Medicine availability', example: 'Ye medicine kahan milegi?' },
  { icon: 'syringe', title: 'Vaccination', example: 'Bacche ka teeka kab hai?' },
  { icon: 'tent', title: 'Medical camps', example: 'Gaon mein camp kab lagega?' },
  { icon: 'kiosk', title: 'Health kiosk', example: 'Kiosk par kya hota hai?' },
  { icon: 'route', title: 'Referral status', example: 'Mera referral kahan pahuncha?' },
  { icon: 'calendar', title: 'Follow-up', example: 'Kal follow-up hai kya?' },
  { icon: 'record', title: 'Health record', example: 'Meri purani report dikhao' },
  { icon: 'shieldCheck', title: 'Preventive care', example: 'BP check karwana hai' },
  { icon: 'sun', title: 'Weather precautions', example: 'Abhi bahut garmi hai, kya karein?' },
  { icon: 'megaphone', title: 'Local disease alerts', example: 'Mere area mein koi bimari fail rahi hai?' },
  { icon: 'users', title: 'ASHA worker', example: 'Nearest ASHA kaun hai?' },
]

export function AiHealthPage() {
  const t = useT()
  return (
    <div className="space-y-7">
      <PageHeader
        icon="sparkle"
        eyebrow="Voice-first assistant"
        title={t('nav.ai')}
        description={t('app.tagline')}
        meta={<DemoBadge label="Prototype" />}
      />

      <AiAssistant variant="page" />

      <Callout tone="neutral" icon="info" title="How the assistant works in this prototype">
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
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <li
              key={capability.title}
              className="rc-raise flex items-start gap-3 rounded-card border border-hairline bg-surface p-3.5 shadow-xs"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-care-50 text-care-700 ring-1 ring-care-100 ring-inset"
              >
                <Icon name={capability.icon} size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink-900">{capability.title}</h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500 italic">
                  “{capability.example}”
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Callout tone="warn" icon="shield" title="Medical safety">
        RuralCare AI gives possible causes, a risk level and next steps. It never confirms a
        diagnosis, never prescribes medicine or a dose, and never makes a clinical decision on its
        own. Medicine reminders are created only from a doctor&apos;s prescription.
      </Callout>
    </div>
  )
}
