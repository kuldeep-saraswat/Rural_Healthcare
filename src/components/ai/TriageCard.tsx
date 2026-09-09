import { useNavigate } from 'react-router-dom'
import type { TriageResult } from '@/services/ai/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'
import { SafetyNote } from '@/components/ui/Callout'
import { Icon } from '@/components/ui/Icon'
import { useT } from '@/services/i18n'

/**
 * The assistant's symptom result. It is deliberately structured like a
 * clinical hand-off - what was reported, what it might be, why that risk band,
 * what to do next - and it always says out loud that it is not a diagnosis.
 */
export function TriageCard({ result }: { result: TriageResult }) {
  const t = useT()
  const navigate = useNavigate()
  const tone =
    result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'warn' : 'ok'

  return (
    <Card as="li" className="list-none" padding="lg" tone={tone}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-ink-500">Assistant assessment</p>
          <h3 className="mt-1 text-lg leading-snug font-semibold tracking-tight text-ink-900">
            {t('symptom.possibleCauses')}
          </h3>
          <p className="mt-1 text-sm text-ink-600">Based on: {result.symptomsSummary}</p>
        </div>
        <RiskBadge level={result.riskLevel} large />
      </div>

      <ul className="mt-4 space-y-2 text-[15px] text-ink-900">
        {result.possibleCauses.map((cause) => (
          <li key={cause} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300"
            />
            <span className="leading-relaxed">{cause}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-medium text-ink-700">{t('symptom.notDiagnosis')}</p>

      {result.redFlags.length ? (
        <div
          role="alert"
          className="mt-4 flex gap-2.5 rounded-card border border-sos-200 bg-sos-50 p-3.5 text-sm text-sos-700"
        >
          <Icon name="alert" size={18} className="mt-px shrink-0 text-sos-600" />
          <span className="leading-relaxed">
            <strong>Warning signs reported:</strong> {result.redFlags.join(', ')}. Please seek
            emergency care now.
          </span>
        </div>
      ) : null}

      <div className="mt-5 rounded-card border border-hairline bg-surface/70 p-3.5">
        <h4 className="eyebrow text-ink-400">Why this risk level</h4>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
          {result.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <Icon name="arrowRight" size={14} className="mt-1 shrink-0 text-ink-400" />
              <span className="leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h4 className="text-[15px] font-semibold text-ink-900">{t('symptom.whatToDo')}</h4>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {result.nextSteps.map((step) => (
            <Button
              key={step.path + step.label}
              tone={step.tone}
              size="lg"
              iconAfter={<Icon name="arrowRight" size={16} />}
              onClick={() => {
                navigate(step.path)
              }}
            >
              {step.label}
            </Button>
          ))}
        </div>
      </div>

      <SafetyNote>{t('symptom.noPrescription')}</SafetyNote>
    </Card>
  )
}
