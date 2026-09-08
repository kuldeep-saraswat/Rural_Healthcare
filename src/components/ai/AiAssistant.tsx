import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAiChat } from './AiChatContext'
import { AiCardList } from './AiCardList'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { DemoBadge } from '@/components/ui/Badge'
import { useSpeechInput, speechErrorMessage } from '@/services/speech'
import { aiModeLabel } from '@/services/ai/router'
import { useAppStore } from '@/store/useAppStore'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

/**
 * The primary interaction surface of RuralCare AI.
 *
 * Voice first, text always. A rural patient should be able to say one sentence
 * and land on the right action - no menu hunting.
 */
export function AiAssistant({
  variant = 'page',
  maxMessages,
}: {
  variant?: 'home' | 'page'
  maxMessages?: number
}) {
  const t = useT()
  const navigate = useNavigate()
  const { messages, busy, suggestions, send, reset, awaitingAnswer } = useAiChat()
  const language = useAppStore((s) => s.language)
  const [draft, setDraft] = useState('')
  const [manualNotice, setManualNotice] = useState<string | undefined>(undefined)
  const listRef = useRef<HTMLDivElement>(null)

  const speech = useSpeechInput(language, (finalText) => {
    setDraft('')
    void send(finalText)
  })

  // Derived during render - a speech error always wins over a manual notice.
  const voiceNotice = speechErrorMessage(speech.error) ?? manualNotice

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages.length, busy])

  const visible = maxMessages ? messages.slice(-maxMessages) : messages

  const submit = () => {
    const text = draft
    setDraft('')
    void send(text)
  }

  return (
    <section
      aria-label="RuralCare AI health assistant"
      className={cx(
        'rounded-card border border-hairline bg-surface',
        variant === 'home' ? 'shadow-sm' : '',
      )}
    >
      {/* Conversation */}
      {visible.length > 0 ? (
        <div
          ref={listRef}
          className={cx(
            'space-y-4 overflow-y-auto border-b border-hairline p-4',
            variant === 'home' ? 'max-h-[26rem]' : 'max-h-[60vh]',
          )}
          aria-live="polite"
          aria-atomic="false"
        >
          {visible.map((message) => (
            <div key={message.id}>
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-card rounded-br-sm bg-care-600 px-4 py-2.5 text-[15px] text-white">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-care-100 text-base"
                    >
                      🩺
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="rounded-card rounded-tl-sm bg-canvas px-4 py-2.5 text-[15px] text-ink-900">
                        {message.text}
                      </p>
                      {message.resolution?.notice ? (
                        <p className="mt-1.5 text-xs text-ink-500">
                          ℹ️ {message.resolution.notice}
                        </p>
                      ) : null}
                      <AiCardList cards={message.resolution?.cards ?? []} />
                      {message.resolution?.route && !message.resolution.route.auto ? (
                        <div className="mt-3">
                          <Button
                            tone="primary"
                            size="lg"
                            onClick={() => {
                              navigate(message.resolution!.route!.path)
                            }}
                          >
                            {message.resolution.route.label}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-ink-500" role="status">
              <span
                aria-hidden="true"
                className="rc-spin inline-block h-4 w-4 rounded-full border-2 border-care-200 border-t-care-600"
              />
              Thinking...
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Composer */}
      <div className="p-4">
        {voiceNotice ? (
          <Callout tone="warn" className="mb-3" icon="🎙️" title="Voice input">
            {voiceNotice}
          </Callout>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            tone={speech.listening ? 'danger' : 'primary'}
            size="xl"
            block
            aria-pressed={speech.listening}
            onClick={() => {
              if (!speech.supported) {
                setManualNotice(t('home.voiceUnavailable'))
                return
              }
              if (speech.listening) speech.stop()
              else speech.start()
            }}
            icon="🎙️"
          >
            {speech.listening ? t('home.listening') : t('home.speak')}
          </Button>

          {speech.listening && speech.transcript ? (
            <p className="text-sm text-ink-500" aria-live="polite">
              “{speech.transcript}”
            </p>
          ) : null}

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <label className="sr-only" htmlFor="ai-input">
              {awaitingAnswer ? 'Answer the assistant' : t('home.question')}
            </label>
            <input
              id="ai-input"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
              }}
              placeholder={t('home.type')}
              autoComplete="off"
              className="min-h-14 w-full rounded-card border border-hairline bg-surface px-4 text-base text-ink-900 placeholder:text-ink-300 focus:border-care-500"
            />
            <Button type="submit" tone="primary" size="xl" disabled={!draft.trim() || busy}>
              {t('home.send')}
            </Button>
          </form>
        </div>

        {/* Suggested prompts */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink-500">{t('home.orChoose')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  void send(suggestion)
                }}
                className="min-h-11 rounded-card border border-care-200 bg-care-50 px-3.5 text-left text-sm font-medium text-care-700 hover:bg-care-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
          <span className="flex items-center gap-2 text-xs text-ink-500">
            <DemoBadge label="Prototype" />
            {aiModeLabel()}
          </span>
          <div className="flex gap-2">
            {messages.length ? (
              <Button size="sm" onClick={reset}>
                Clear chat
              </Button>
            ) : null}
            {variant === 'home' ? (
              <Button
                size="sm"
                onClick={() => {
                  navigate('/ai')
                }}
              >
                Open full assistant
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
