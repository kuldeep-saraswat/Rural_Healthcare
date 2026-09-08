import type { ExtractedEntities, IntentId } from './types'
import type { Language } from '@/types'

/**
 * Optional remote intent classifier.
 *
 * RuralCare AI ships with a deterministic on-device router so the demo works
 * with no key, no server and no network. If a deployment wants a hosted model,
 * it sets `VITE_AI_ROUTER_URL` to an endpoint that accepts
 *
 *   POST { text, language } -> { intent, entities? }
 *
 * and this module feeds that answer into exactly the same action builders.
 * Anything unexpected - a slow reply, a bad payload, an unknown intent - falls
 * straight back to the deterministic router. No API key is ever read from or
 * stored in client code: the URL is expected to point at the project's own
 * backend, which holds the credential.
 */

const ROUTER_URL: string | undefined = import.meta.env.VITE_AI_ROUTER_URL
const TIMEOUT_MS = Number(import.meta.env.VITE_AI_ROUTER_TIMEOUT_MS ?? 2500)

const KNOWN_INTENTS: IntentId[] = [
  'symptoms',
  'emergency',
  'ambulance',
  'doctor_consult',
  'nearby_doctor',
  'asha',
  'hospital',
  'phc',
  'chc',
  'diagnostic_test',
  'medicine_availability',
  'vaccine',
  'medical_camp',
  'health_kiosk',
  'referral_status',
  'follow_up',
  'health_record',
  'preventive_care',
  'weather_precaution',
  'outbreak_alert',
  'navigation',
]

export function hasRemoteRouter(): boolean {
  return typeof ROUTER_URL === 'string' && ROUTER_URL.length > 0
}

export interface RemoteClassification {
  intent: IntentId
  entities?: Partial<ExtractedEntities>
}

export async function classifyRemote(
  text: string,
  language: Language,
): Promise<RemoteClassification | null> {
  if (!hasRemoteRouter()) return null
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, TIMEOUT_MS)
  try {
    const response = await fetch(ROUTER_URL as string, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    })
    if (!response.ok) return null
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object') return null
    const intent = (payload as { intent?: unknown }).intent
    if (typeof intent !== 'string' || !KNOWN_INTENTS.includes(intent as IntentId)) return null
    const entities = (payload as { entities?: Partial<ExtractedEntities> }).entities
    return { intent: intent as IntentId, entities }
  } catch {
    // Offline, slow, blocked or malformed - the deterministic router takes over.
    return null
  } finally {
    clearTimeout(timer)
  }
}
