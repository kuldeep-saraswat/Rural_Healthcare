import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAiChat } from './AiChatContext'
import { AiCardList } from './AiCardList'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { DemoBadge } from '@/components/ui/Badge'
import { Icon, Spinner } from '@/components/ui/Icon'
import { useSpeechInput, speechErrorMessage } from '@/services/speech'
import { aiModeLabel } from '@/services/ai/router'
import { useAppStore } from '@/store/useAppStore'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

/**
 * The primary interaction surface of RuralCare AI.
 *
 * Voice first, text always. A rural patient should be able to say one sentence
 * and land on the right action - no menu hunting. The surface reads as a
 * clinical assistant rather than a chat toy: it has a named identity, states
 * plainly what it can and cannot do, and every answer resolves into the same
 * action cards the dedicated screens use.
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
      className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm"
    >
      {/* ---- Assistant identity ---- */}
      <div className="rc-wash flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <span
          aria-hidden="true"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-care-600 text-white shadow-xs"
        >
          <Icon name="stethoscope" size={21} strokeWidth={1.9} />
          <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface">
            <span className="h-2 w-2 rounded-full bg-ok-500" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] leading-tight font-semibold text-ink-900">
            RuralCare Assistant
            <Icon name="sparkle" size={14} className="text-care-500" />
          </h2>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            Hindi · English · मराठी — {t('home.question')}
          </p>
        </div>
        {messages.length ? (
          <Button size="sm" tone="ghost" icon={<Icon name="refresh" size={14} />} onClick={reset}>
            Clear chat
          </Button>
        ) : null}
      </div>

      {/* ---- Conversation ---- */}
      {visible.length > 0 ? (
        <div
          ref={listRef}
          className={cx(
            'space-y-5 overflow-y-auto border-b border-hairline bg-canvas/40 px-4 py-5 sm:px-5',
            variant === 'home' ? 'max-h-[26rem]' : 'max-h-[58vh]',
          )}
          aria-live="polite"
          aria-atomic="false"
        >
          {visible.map((message) => (
            <div key={message.id} className="rc-rise">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-lg rounded-br-xs bg-care-600 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-xs">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-care-100 text-care-700"
                  >
                    <Icon name="stethoscope" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="rounded-lg rounded-tl-xs border border-hairline bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink-900 shadow-xs">
                      {message.text}
                    </p>
                    {message.resolution?.notice ? (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500">
                        <Icon name="info" size={13} className="mt-px shrink-0" />
                        {message.resolution.notice}
                      </p>
                    ) : null}
                    <AiCardList cards={message.resolution?.cards ?? []} />
                    {message.resolution?.route && !message.resolution.route.auto ? (
                      <div className="mt-3">
                        <Button
                          tone="primary"
                          iconAfter={<Icon name="arrowRight" size={16} />}
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
              )}
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2.5 text-sm text-ink-500" role="status">
              <Spinner size={16} className="text-care-600" />
              Thinking...
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---- Composer ---- */}
      <div className="px-4 py-4 sm:px-5">
        {voiceNotice ? (
          <Callout tone="warn" className="mb-4" icon="mic" title="Voice input">
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
            className={speech.listening ? 'sos-pulse' : undefined}
            icon={<Icon name="mic" size={20} strokeWidth={1.9} />}
          >
            {speech.listening ? t('home.listening') : t('home.speak')}
          </Button>

          {speech.listening && speech.transcript ? (
            <p
              className="rounded-card border border-dashed border-care-200 bg-care-50 px-3.5 py-2 text-sm text-care-800"
              aria-live="polite"
            >
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
              className="min-h-13 w-full rounded-card border border-hairline-strong bg-surface px-4 text-[15px] text-ink-900 shadow-xs transition-[border-color,box-shadow] placeholder:text-ink-400 hover:border-ink-300 focus:border-care-500 focus:shadow-[var(--shadow-focus)] focus:outline-none"
            />
            <Button
              type="submit"
              tone="primary"
              size="lg"
              disabled={!draft.trim() || busy}
              icon={<Icon name="send" size={17} />}
              className="min-h-13 shrink-0"
            >
              {t('home.send')}
            </Button>
          </form>
        </div>

        {/* Suggested prompts */}
        <div className="mt-5">
          <p className="eyebrow mb-2.5 text-ink-400">{t('home.orChoose')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  void send(suggestion)
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-care-200 bg-care-50 px-3.5 text-left text-[13px] font-semibold text-care-800 transition-colors hover:border-care-300 hover:bg-care-100"
              >
                <Icon name="sparkle" size={13} className="text-care-500" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3.5">
          <span className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <DemoBadge label="Prototype" />
            {aiModeLabel()}
          </span>
          {variant === 'home' ? (
            <Button
              size="sm"
              tone="ghost"
              iconAfter={<Icon name="arrowRight" size={14} />}
              onClick={() => {
                navigate('/ai')
              }}
            >
              Open full assistant
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
