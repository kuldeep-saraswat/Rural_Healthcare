import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from '@/types'
import { speechTagFor } from '@/services/i18n'

/**
 * Voice input via the browser Web Speech API.
 *
 * When the API is missing (Firefox, many Android WebViews, older browsers) the
 * hook reports `supported: false` and the UI keeps a fully working text input
 * plus an honest "voice not available" message. Nothing is faked as heard.
 */

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike
  isFinal: boolean
  length: number
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSpeechSupported(): boolean {
  return Boolean(getRecognitionCtor())
}

export interface UseSpeechInput {
  supported: boolean
  listening: boolean
  transcript: string
  error?: string
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechInput(language: Language, onFinal?: (text: string) => void): UseSpeechInput {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef(onFinal)

  const supported = isSpeechSupported()

  useEffect(() => {
    finalRef.current = onFinal
  }, [onFinal])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError('unsupported')
      return
    }
    try {
      recognitionRef.current?.abort()
      const recognition = new Ctor()
      recognition.lang = speechTagFor(language)
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.onstart = () => {
        setError(undefined)
        setListening(true)
      }
      recognition.onresult = (event) => {
        let text = ''
        let isFinal = false
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          text += result[0].transcript
          if (result.isFinal) isFinal = true
        }
        setTranscript(text)
        if (isFinal && text.trim()) {
          finalRef.current?.(text.trim())
        }
      }
      recognition.onerror = (event) => {
        setError(event.error ?? 'error')
        setListening(false)
      }
      recognition.onend = () => {
        setListening(false)
      }
      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setError('start_failed')
      setListening(false)
    }
  }, [language])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setError(undefined)
  }, [])

  return { supported, listening, transcript, error, start, stop, reset }
}

/** Human-readable reason for a speech failure. */
export function speechErrorMessage(error?: string): string | undefined {
  if (!error) return undefined
  switch (error) {
    case 'unsupported':
      return 'This browser does not support voice input. Please type instead.'
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was refused. Please type instead, or allow the microphone.'
    case 'no-speech':
      return 'Nothing was heard. Please try again or type.'
    case 'network':
      return 'Voice recognition needs a network connection. Please type instead.'
    case 'audio-capture':
      return 'No microphone was found. Please type instead.'
    default:
      return 'Voice input did not work. Please type instead.'
  }
}
