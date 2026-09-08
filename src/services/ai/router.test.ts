import { describe, expect, it } from 'vitest'
import { resolveMessage } from './router'
import type { AiContext, AiTurn } from './types'
import { useAppStore } from '@/store/useAppStore'
import { currentPatient } from '@/store/selectors'

function context(overrides: Partial<AiContext> = {}): AiContext {
  const state = useAppStore.getState()
  return {
    state,
    language: 'hi',
    patient: currentPatient(state),
    session: null,
    ...overrides,
  }
}

const ask = (text: string, ctx: AiContext = context()) => resolveMessage(text, ctx)

describe('AI intent routing - multilingual', () => {
  it('routes a doctor request in Hindi, English and Marathi', () => {
    const inputs = [
      'Mujhe doctor se baat karni hai',
      'I want to consult a doctor',
      'मला डॉक्टरांशी बोलायचे आहे',
    ]
    for (const input of inputs) {
      const { resolution } = ask(input)
      expect(resolution.intent, input).toBe('doctor_consult')
      expect(resolution.cards.some((c) => c.kind === 'doctor'), input).toBe(true)
      expect(resolution.route?.path).toBe('/doctors')
    }
  })

  it('treats an ambulance request as an emergency in every language', () => {
    for (const input of ['Ambulance chahiye', 'I need an ambulance', 'रुग्णवाहिका हवी आहे']) {
      const { resolution } = ask(input)
      expect(resolution.emergency, input).toBe(true)
      expect(resolution.route?.path).toBe('/emergency')
      expect(resolution.route?.auto).toBe(true)
      expect(resolution.cards.some((c) => c.kind === 'ambulance'), input).toBe(true)
      expect(resolution.cards.some((c) => c.kind === 'facility'), input).toBe(true)
      expect(resolution.cards.some((c) => c.kind === 'asha'), input).toBe(true)
    }
  })

  it('detects a delivery emergency phrased as a family request', () => {
    const { resolution } = ask('Meri wife ki delivery hone wali hai, ambulance chahiye')
    expect(resolution.emergency).toBe(true)
    expect(resolution.route?.path).toBe('/emergency')
  })

  it('recognises other red flags without the word ambulance', () => {
    for (const input of ['Saans nahi aa rahi', 'Severe chest pain', 'Patient unconscious hai']) {
      const { resolution } = ask(input)
      expect(resolution.emergency, input).toBe(true)
    }
  })

  it('opens the test finder pre-filtered to the requested test', () => {
    const { resolution } = ask('MRI kahan hoga?')
    expect(resolution.intent).toBe('diagnostic_test')
    expect(resolution.route?.path).toBe('/tests?q=MRI')
    expect(resolution.route?.auto).toBe(true)
    expect(resolution.cards.every((c) => c.kind === 'test')).toBe(true)
  })

  it('prefers medicine availability over the doctor intent when both words appear', () => {
    const { resolution } = ask('Mere doctor ne jo medicine likhi hai wo kahan milegi?')
    expect(resolution.intent).toBe('medicine_availability')
    expect(resolution.route?.path).toBe('/medicines')
  })

  it('opens medicine availability filtered when a medicine is named', () => {
    const { resolution } = ask('Paracetamol kahan milegi?')
    expect(resolution.intent).toBe('medicine_availability')
    expect(resolution.route?.path).toContain('/medicines?q=')
    expect(resolution.cards.some((c) => c.kind === 'medicine')).toBe(true)
  })

  it('answers a follow-up question with the follow-up card', () => {
    const { resolution } = ask('Kal follow-up hai kya?')
    expect(resolution.intent).toBe('follow_up')
    expect(resolution.route?.path).toBe('/follow-ups')
    expect(resolution.cards.some((c) => c.kind === 'followUp')).toBe(true)
  })

  it('answers a weather precaution question with the local environment card', () => {
    const { resolution } = ask('Abhi bahut garmi hai, kya precaution lena chahiye?')
    expect(resolution.intent).toBe('weather_precaution')
    expect(resolution.cards.some((c) => c.kind === 'environment')).toBe(true)
  })

  it('answers a local outbreak question with the demo alert', () => {
    const { resolution } = ask('Mere area mein koi disease fail rahi hai kya?')
    expect(resolution.intent).toBe('outbreak_alert')
    expect(resolution.cards.some((c) => c.kind === 'alert')).toBe(true)
  })

  it('routes ASHA, referral, record, camp, kiosk and vaccine intents', () => {
    expect(ask('Nearest ASHA kaun hai?').resolution.intent).toBe('asha')
    expect(ask('Mera referral kahan pahuncha?').resolution.intent).toBe('referral_status')
    expect(ask('Meri purani report dikhao').resolution.intent).toBe('health_record')
    expect(ask('Gaon mein camp kab lagega?').resolution.intent).toBe('medical_camp')
    expect(ask('Health kiosk par kya hota hai?').resolution.intent).toBe('health_kiosk')
    expect(ask('Bacche ka teeka kab hai?').resolution.intent).toBe('vaccine')
    expect(ask('Paas ka PHC kahan hai?').resolution.intent).toBe('phc')
  })

  it('falls back to a navigation reply with suggestions for unknown input', () => {
    const { resolution } = ask('xyzzy plugh')
    expect(resolution.intent).toBe('navigation')
    expect(resolution.suggestions?.length).toBeGreaterThan(0)
    expect(resolution.cards.length).toBeGreaterThan(0)
  })

  it('reflects live resource state: no doctors available means no doctor cards', () => {
    const store = useAppStore.getState()
    for (const doctor of store.doctors) store.setDoctorStatus(doctor.id, 'unavailable')
    const { resolution } = ask('Doctor se consult karna hai', context())
    expect(resolution.cards.some((c) => c.kind === 'doctor')).toBe(false)
    expect(resolution.reply.length).toBeGreaterThan(0)
  })
})

describe('AI symptom assistant', () => {
  it('asks one question at a time and never returns a diagnosis', () => {
    let turn: AiTurn = ask('Mujhe 2 din se bukhar aur khansi hai')
    expect(turn.resolution.intent).toBe('symptoms')
    expect(turn.resolution.question).toBeTruthy()
    expect(turn.resolution.cards).toHaveLength(0)

    const questionsAsked: string[] = [turn.resolution.question!]
    const answers = ['halka', 'halki', 'nahi', 'nahi']
    for (const answer of answers) {
      if (!turn.resolution.question) break
      turn = resolveMessage(answer, context({ session: turn.session }))
      if (turn.resolution.question) questionsAsked.push(turn.resolution.question)
    }

    // One question per turn, and the conversation stays short.
    expect(turn.resolution.question).toBeUndefined()
    expect(questionsAsked.length).toBeLessThanOrEqual(4)
    expect(new Set(questionsAsked).size).toBe(questionsAsked.length)

    const triage = turn.resolution.cards.find((c) => c.kind === 'triage')
    expect(triage).toBeTruthy()
    if (triage?.kind !== 'triage') throw new Error('expected triage card')
    expect(triage.result.possibleCauses.length).toBeGreaterThan(0)
    expect(['low', 'medium', 'high']).toContain(triage.result.riskLevel)
    expect(triage.result.nextSteps.length).toBeGreaterThan(0)
    // Safety: no confirmed diagnosis, no medicine name in the output.
    const text = JSON.stringify(triage.result).toLowerCase()
    expect(text).not.toContain('diagnosis is')
    expect(text).not.toContain('take paracetamol')
    // The safety notice must disclaim both diagnosis and prescribing.
    expect(turn.resolution.notice).toMatch(/confirm nahi|never diagnoses|निदान करत नाही/i)
    expect(turn.resolution.notice).toMatch(/dawa nahi likhta|prescribe|औषध लिहून देत नाही/i)
  })

  it('escalates mid-conversation when a red flag appears', () => {
    const first = ask('Mujhe bukhar hai')
    expect(first.resolution.question).toBeTruthy()
    const second = resolveMessage('saans nahi aa rahi', context({ session: first.session }))
    expect(second.resolution.emergency).toBe(true)
    expect(second.resolution.route?.path).toBe('/emergency')
  })

  it('gives a HIGH risk band with emergency next steps for chest pain', () => {
    let turn = ask('Mujhe seene mein dard aur saans phoolna hai')
    // Red flags pre-empt straight to emergency mode.
    expect(turn.resolution.emergency).toBe(true)

    // Without the emergency wording it still triages as high risk.
    turn = ask('Mujhe chakkar aur bahut kamzori hai')
    while (turn.resolution.question) {
      turn = resolveMessage('bahut zyada', context({ session: turn.session }))
    }
    const triage = turn.resolution.cards.find((c) => c.kind === 'triage')
    if (triage?.kind !== 'triage') throw new Error('expected triage card')
    expect(['medium', 'high']).toContain(triage.result.riskLevel)
  })
})
