import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AiResolution, SymptomSession } from '@/services/ai/types'
import { resolveMessageAsync, suggestionsFor } from '@/services/ai/router'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient } from '@/store/selectors'
import { newId } from '@/lib/utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  at: string
  resolution?: AiResolution
}

interface AiChatApi {
  messages: ChatMessage[]
  busy: boolean
  suggestions: string[]
  /** Sends a message. Returns the resolution so callers can react to it. */
  send: (text: string) => Promise<AiResolution | undefined>
  reset: () => void
  awaitingAnswer: boolean
}

const AiChatContext = createContext<AiChatApi | null>(null)

export function useAiChat(): AiChatApi {
  const context = useContext(AiChatContext)
  if (!context) throw new Error('useAiChat must be used inside AiChatProvider')
  return context
}

/**
 * Conversation state lives above the router so the assistant keeps its history
 * (and its half-finished symptom questions) when an intent navigates the user
 * to another page.
 */
export function AiChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const language = useAppStore((s) => s.language)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const sessionRef = useRef<SymptomSession | null>(null)
  const [awaitingAnswer, setAwaitingAnswer] = useState(false)

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return undefined

      setMessages((current) => [
        ...current,
        { id: newId('m'), role: 'user', text: trimmed, at: new Date().toISOString() },
      ])
      setBusy(true)

      // Small delay so the typing indicator is visible; keeps the UI honest
      // about the assistant "thinking" without faking a network call.
      await new Promise((resolve) => {
        setTimeout(resolve, 260)
      })

      const state = useAppStore.getState()
      const turn = await resolveMessageAsync(trimmed, {
        state,
        language,
        patient: currentPatient(state),
        session: sessionRef.current,
      })
      sessionRef.current = turn.session
      setAwaitingAnswer(Boolean(turn.resolution.question))

      setMessages((current) => [
        ...current,
        {
          id: newId('m'),
          role: 'ai',
          text: turn.resolution.reply,
          at: new Date().toISOString(),
          resolution: turn.resolution,
        },
      ])
      setBusy(false)

      if (turn.resolution.route?.auto) {
        navigate(turn.resolution.route.path)
      }
      return turn.resolution
    },
    [busy, language, navigate],
  )

  const reset = useCallback(() => {
    setMessages([])
    sessionRef.current = null
    setAwaitingAnswer(false)
  }, [])

  const value = useMemo<AiChatApi>(
    () => ({
      messages,
      busy,
      suggestions: suggestionsFor(language),
      send,
      reset,
      awaitingAnswer,
    }),
    [messages, busy, language, send, reset, awaitingAnswer],
  )

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}
