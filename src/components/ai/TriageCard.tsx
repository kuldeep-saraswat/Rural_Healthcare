import { useNavigate } from 'react-router-dom'
import type { TriageResult } from '@/services/ai/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'
import { SafetyNote } from '@/components/ui/Callout'
import { useT } from '@/services/i18n'

export function TriageCard({ result }: { result: TriageResult }) {
  const t = useT()
  const navigate = useNavigate()

  return (
    <Card
      as="li"
      className="list-none"
      tone={result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'warn' : 'ok'}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-ink-900">{t('symptom.possibleCauses')}</h3>
          <p className="text-sm text-ink-500">Based on: {result.symptomsSummary}</p>
        </div>
        <div className="text-right">
          <div className="mb-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">
            {t('risk.level')}
          </div>
          <RiskBadge level={result.riskLevel} large />
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-[15px] text-ink-900">
        {result.possibleCauses.map((cause) => (
          <li key={cause} className="flex gap-2">
            <span aria-hidden="true" className="text-ink-500">
              •
            </span>
            <span>{cause}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-medium text-ink-700">{t('symptom.notDiagnosis')}</p>

      {result.redFlags.length ? (
        <div
          role="alert"
          className="mt-3 rounded-card border border-sos-200 bg-sos-50 p-3 text-sm text-sos-700"
        >
          <strong>Warning signs reported:</strong> {result.redFlags.join(', ')}. Please seek
          emergency care now.
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-ink-700">Why this risk level</h4>
        <ul className="mt-1 space-y-1 text-sm text-ink-700">
          {result.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden="true">→</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-base font-bold text-ink-900">{t('symptom.whatToDo')}</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.nextSteps.map((step) => (
            <Button
              key={step.path + step.label}
              tone={step.tone}
              size="lg"
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
