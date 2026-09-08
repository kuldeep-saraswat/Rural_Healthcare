import type { Language, Patient, RiskLevel } from '@/types'
import type { NextStep, SymptomQuestion, SymptomSession, TriageResult } from './types'
import { matchesKeyword } from './intents'
import { normaliseText } from '@/lib/utils'

/**
 * Conversational symptom assistant.
 *
 * Safety rules baked in here:
 *  - one question at a time, never a long questionnaire
 *  - output is "possible causes" + a risk band, never a diagnosis
 *  - it never suggests a specific medicine or dose
 */

type SymptomKey =
  | 'fever'
  | 'cough'
  | 'cold'
  | 'headache'
  | 'bodyache'
  | 'vomiting'
  | 'diarrhoea'
  | 'abdominalPain'
  | 'weakness'
  | 'dizziness'
  | 'rash'
  | 'swelling'
  | 'breathlessness'
  | 'chestPain'
  | 'burningUrine'
  | 'itching'
  | 'appetiteLoss'
  | 'jointPain'
  | 'backPain'

const SYMPTOM_LEXICON: Record<SymptomKey, string[]> = {
  fever: ['fever', 'bukhar', 'temperature', 'taap', 'ताप', 'बुखार', 'jwar'],
  cough: ['cough', 'khansi', 'khasi', 'khokla', 'खांसी', 'खोकला', 'balgam', 'sputum'],
  cold: ['cold', 'sardi', 'zukam', 'jukam', 'naak beh', 'सर्दी', 'शिंका', 'runny nose'],
  headache: ['headache', 'sir dard', 'sirdard', 'sir me dard', 'डोकेदुखी', 'सिरदर्द', 'सिर दर्द'],
  bodyache: ['body ache', 'badan dard', 'sharir dard', 'अंगदुखी', 'बदन दर्द', 'शरीर दर्द'],
  vomiting: ['vomit', 'ulti', 'ultee', 'उलटी', 'ओकारी', 'nausea', 'ji machalna'],
  diarrhoea: ['diarrhoea', 'diarrhea', 'loose motion', 'dast', 'julab', 'जुलाब', 'दस्त', 'patla'],
  abdominalPain: ['pet dard', 'stomach pain', 'pet me dard', 'पोटदुखी', 'पेट दर्द', 'abdominal'],
  weakness: ['weakness', 'kamzori', 'thakan', 'thakawat', 'अशक्तपणा', 'कमजोरी', 'tired'],
  dizziness: ['chakkar', 'dizzy', 'giddiness', 'चक्कर', 'भोवळ', 'light headed'],
  rash: ['rash', 'daane', 'dane', 'chakte', 'पुरळ', 'दाने', 'red spots'],
  swelling: ['swelling', 'sujan', 'sooj', 'सूजन', 'सूज'],
  breathlessness: [
    'breathless',
    'saans phool',
    'saans lene',
    'saans nahi',
    'shortness of breath',
    'दम लागतो',
    'श्वास',
    'सांस',
  ],
  chestPain: ['chest pain', 'seene me dard', 'chhati me dard', 'छातीत दुखत', 'छाती में दर्द'],
  burningUrine: ['burning urine', 'peshab me jalan', 'jalan', 'लघवी जळजळ', 'पेशाब में जलन'],
  itching: ['itching', 'khujli', 'खाज', 'खुजली'],
  appetiteLoss: ['bhookh nahi', 'appetite', 'bhukh kam', 'भूक लागत नाही', 'भूख नहीं'],
  jointPain: ['joint pain', 'jodo me dard', 'ghutna dard', 'सांधेदुखी', 'जोड़ों में दर्द'],
  backPain: ['back pain', 'kamar dard', 'पाठदुखी', 'कमर दर्द'],
}

const SYMPTOM_LABEL: Record<SymptomKey, string> = {
  fever: 'Fever',
  cough: 'Cough',
  cold: 'Cold / runny nose',
  headache: 'Headache',
  bodyache: 'Body ache',
  vomiting: 'Vomiting',
  diarrhoea: 'Loose motions',
  abdominalPain: 'Stomach pain',
  weakness: 'Weakness',
  dizziness: 'Giddiness',
  rash: 'Rash',
  swelling: 'Swelling',
  breathlessness: 'Breathlessness',
  chestPain: 'Chest pain',
  burningUrine: 'Burning while passing urine',
  itching: 'Itching',
  appetiteLoss: 'Loss of appetite',
  jointPain: 'Joint pain',
  backPain: 'Back pain',
}

const RED_FLAG_LEXICON: { key: string; label: string; words: string[] }[] = [
  {
    key: 'breathing',
    label: 'Difficulty in breathing',
    words: ['saans nahi', 'saans lene', 'breathless', 'cannot breathe', 'श्वास', 'दम लागत'],
  },
  {
    key: 'chest',
    label: 'Chest pain',
    words: ['chest pain', 'seene me dard', 'chhati me dard', 'छातीत दुखत', 'छाती में दर्द'],
  },
  {
    key: 'unconscious',
    label: 'Unconsciousness or confusion',
    words: ['behosh', 'unconscious', 'faint', 'बेशुद्ध', 'बेहोश', 'confusion'],
  },
  {
    key: 'bleeding',
    label: 'Heavy bleeding',
    words: ['bleeding', 'khoon bah', 'bahut khoon', 'रक्तस्राव', 'खून बह'],
  },
  {
    key: 'convulsion',
    label: 'Fits / convulsions',
    words: ['jhatke', 'convulsion', 'fits', 'mirgi', 'झटके'],
  },
  {
    key: 'pregnancy',
    label: 'Pregnancy emergency',
    words: ['delivery', 'labour pain', 'prasav', 'प्रसूती', 'पानी गया'],
  },
  {
    key: 'dehydration',
    label: 'Very little urine / severe dehydration',
    words: ['peshab nahi', 'urine nahi', 'no urine', 'लघवी होत नाही'],
  },
]

export function detectSymptoms(rawText: string): SymptomKey[] {
  const text = normaliseText(rawText)
  const found: SymptomKey[] = []
  for (const key of Object.keys(SYMPTOM_LEXICON) as SymptomKey[]) {
    if (SYMPTOM_LEXICON[key].some((word) => matchesKeyword(text, word))) {
      found.push(key)
    }
  }
  return found
}

export function detectRedFlags(rawText: string): string[] {
  const text = normaliseText(rawText)
  return RED_FLAG_LEXICON.filter((flag) =>
    flag.words.some((word) => matchesKeyword(text, word)),
  ).map((flag) => flag.label)
}

// ---------------------------------------------------------------------------
// Question texts
// ---------------------------------------------------------------------------

const QUESTIONS: Record<SymptomQuestion, Record<Language, string>> = {
  duration: {
    en: 'How many days have you had this problem?',
    hi: 'Yeh takleef kitne din se hai?',
    mr: 'हा त्रास किती दिवसांपासून आहे?',
  },
  fever: {
    en: 'How high is the fever - mild, or does it feel very high?',
    hi: 'Bukhar kitna hai - halka hai ya bahut tez?',
    mr: 'ताप किती आहे - सौम्य आहे की खूप जास्त?',
  },
  age: {
    en: 'What is the age of the patient?',
    hi: 'Marij ki umar kitni hai?',
    mr: 'रुग्णाचे वय किती आहे?',
  },
  conditions: {
    en: 'Is there any long-term illness such as BP, diabetes, TB, asthma, or a pregnancy?',
    hi: 'Koi purani bimari hai - jaise BP, sugar, TB, dama, ya pregnancy?',
    mr: 'बीपी, मधुमेह, टीबी, दमा किंवा गर्भधारणा असे काही आहे का?',
  },
  severity: {
    en: 'How much is it troubling you - mild, moderate, or very much?',
    hi: 'Takleef kitni hai - halki, thodi zyada, ya bahut zyada?',
    mr: 'त्रास किती आहे - सौम्य, मध्यम, की खूप जास्त?',
  },
  redflags: {
    en: 'Is any of these present: difficulty breathing, chest pain, unconsciousness, fits, or heavy bleeding? Say "no" if none.',
    hi: 'Inme se koi dikkat hai: saans lene mein takleef, seene mein dard, behoshi, jhatke, ya bahut khoon? Nahi ho to "nahi" likhein.',
    mr: 'यापैकी काही आहे का: श्वास घेण्यास त्रास, छातीत दुखणे, बेशुद्धी, झटके, किंवा जास्त रक्तस्राव? नसेल तर "नाही" लिहा.',
  },
}

const ACK: Record<Language, string[]> = {
  en: ['Got it.', 'Thank you.', 'Noted.', 'Understood.'],
  hi: ['Theek hai.', 'Shukriya.', 'Note kar liya.', 'Samajh gaya.'],
  mr: ['ठीक आहे.', 'धन्यवाद.', 'नोंद घेतली.', 'समजले.'],
}

export function questionText(question: SymptomQuestion, language: Language): string {
  return QUESTIONS[question][language]
}

export function acknowledgement(language: Language, index: number): string {
  const list = ACK[language]
  return list[index % list.length]
}

// ---------------------------------------------------------------------------
// Session flow
// ---------------------------------------------------------------------------

export function startSymptomSession(text: string, patient?: Patient): SymptomSession {
  const session: SymptomSession = {
    symptomKeys: detectSymptoms(text),
    rawInputs: [text],
    answers: {},
    asked: [],
    redFlags: detectRedFlags(text),
    complete: false,
  }
  const durationMatch = /(\d+)\s*(din|dino|day|days|दिन|दिवस)/.exec(normaliseText(text))
  if (durationMatch) session.answers.duration = durationMatch[1]
  if (patient) {
    session.answers.age = String(patient.age)
    if (patient.conditions.length) session.answers.conditions = patient.conditions.join(', ')
    else session.answers.conditions = 'none recorded'
  }
  return session
}

/** The next question to ask, or undefined when there is enough information. */
export function nextQuestion(session: SymptomSession): SymptomQuestion | undefined {
  const order: SymptomQuestion[] = ['duration', 'fever', 'age', 'conditions', 'severity', 'redflags']
  for (const question of order) {
    if (question === 'fever' && !session.symptomKeys.includes('fever')) continue
    if (session.answers[question] !== undefined) continue
    return question
  }
  return undefined
}

export function applyAnswer(
  session: SymptomSession,
  question: SymptomQuestion,
  text: string,
): SymptomSession {
  const next: SymptomSession = {
    ...session,
    rawInputs: [...session.rawInputs, text],
    answers: { ...session.answers },
    asked: [...session.asked, question],
    symptomKeys: Array.from(new Set([...session.symptomKeys, ...detectSymptoms(text)])),
    redFlags: Array.from(new Set([...session.redFlags, ...detectRedFlags(text)])),
  }
  next.answers[question] = text.trim()
  next.pending = undefined
  next.complete = nextQuestion(next) === undefined
  return next
}

// ---------------------------------------------------------------------------
// Possible causes + risk
// ---------------------------------------------------------------------------

interface CauseRule {
  when: (keys: SymptomKey[], session: SymptomSession) => boolean
  causes: string[]
}

const CAUSE_RULES: CauseRule[] = [
  {
    when: (k) => k.includes('fever') && (k.includes('cough') || k.includes('cold')),
    causes: [
      'A flu-like viral infection of the nose, throat or chest',
      'Throat or ear infection',
      'In this season a mosquito-borne fever also has to be ruled out by a blood test',
    ],
  },
  {
    when: (k, s) => k.includes('cough') && Number(s.answers.duration ?? 0) >= 14,
    causes: [
      'A long-standing chest infection',
      'Cough for more than 2 weeks needs TB screening at the PHC',
      'Asthma or allergy-related cough',
    ],
  },
  {
    when: (k) => k.includes('vomiting') && k.includes('diarrhoea'),
    causes: [
      'A food or water-borne stomach infection',
      'Dehydration from fluid loss',
      'Food poisoning',
    ],
  },
  {
    when: (k) => k.includes('fever') && k.includes('rash'),
    causes: [
      'A viral illness that causes rash',
      'A mosquito-borne fever such as dengue - needs a blood test',
      'An allergic skin reaction',
    ],
  },
  {
    when: (k) => k.includes('weakness') && k.includes('dizziness'),
    causes: [
      'Low haemoglobin (anaemia)',
      'Low blood sugar or low blood pressure',
      'Dehydration or poor food intake',
    ],
  },
  {
    when: (k) => k.includes('burningUrine'),
    causes: ['A urinary tract infection', 'A kidney or urinary stone - may need imaging'],
  },
  {
    when: (k) => k.includes('abdominalPain'),
    causes: [
      'Acidity or gastritis',
      'An intestinal infection',
      'A stone or other cause that needs an ultrasound',
    ],
  },
  {
    when: (k) => k.includes('headache') && k.includes('fever'),
    causes: ['A viral fever', 'A sinus or ear infection', 'Raised blood pressure'],
  },
  {
    when: (k) => k.includes('jointPain'),
    causes: ['Viral joint pain', 'Arthritis-type joint problem', 'Chikungunya-type illness'],
  },
  {
    when: (k) => k.includes('breathlessness') || k.includes('chestPain'),
    causes: [
      'A heart-related cause that must be checked urgently',
      'A serious chest or lung problem',
      'Severe anaemia or an asthma attack',
    ],
  },
  {
    when: (k) => k.includes('fever'),
    causes: [
      'A viral fever',
      'A mosquito-borne fever such as malaria or dengue - needs a blood test',
      'A typhoid-like illness if fever lasts more than a week',
    ],
  },
]

function severityBand(text?: string): 'mild' | 'moderate' | 'severe' | undefined {
  if (!text) return undefined
  const t = normaliseText(text)
  if (/bahut|severe|zyada|tez|very|khoob|तीव्र|जास्त|खूप|बहुत/.test(t)) return 'severe'
  if (/madhyam|moderate|thoda|thodi|medium|मध्यम/.test(t)) return 'moderate'
  if (/halka|halki|mild|kam|थोड|सौम्य|हलक/.test(t)) return 'mild'
  return undefined
}

function feverBand(text?: string): 'mild' | 'high' | undefined {
  if (!text) return undefined
  const t = normaliseText(text)
  const number = /(\d{2,3})/.exec(t)
  if (number) {
    const value = Number(number[1])
    if (value >= 102) return 'high'
    if (value >= 30 && value <= 45) return value >= 39 ? 'high' : 'mild' // Celsius
    return 'mild'
  }
  if (/tez|high|bahut|zyada|खूप|जास्त|तेज/.test(t)) return 'high'
  return 'mild'
}

const CHRONIC_WORDS =
  /bp|blood pressure|sugar|diabet|tb|asthma|dama|pregnan|garbh|heart|kidney|मधुमेह|दमा|गर्भ|हृदय|रक्तदाब/

export function buildTriage(session: SymptomSession, patient?: Patient): TriageResult {
  const keys = session.symptomKeys as SymptomKey[]
  const duration = Number(session.answers.duration?.replace(/\D/g, '') || 0)
  const age = Number(session.answers.age?.replace(/\D/g, '') || patient?.age || 0)
  const severity = severityBand(session.answers.severity)
  const fever = feverBand(session.answers.fever)
  const conditionsText = `${session.answers.conditions ?? ''} ${patient?.conditions.join(' ') ?? ''}`
  const hasChronic = CHRONIC_WORDS.test(normaliseText(conditionsText))

  const reasons: string[] = []
  let level: RiskLevel = 'low'
  const bump = (to: RiskLevel, why: string) => {
    const order: RiskLevel[] = ['low', 'medium', 'high']
    if (order.indexOf(to) > order.indexOf(level)) level = to
    reasons.push(why)
  }

  if (session.redFlags.length) {
    bump('high', `Warning signs reported: ${session.redFlags.join(', ')}`)
  }
  if (keys.includes('breathlessness') || keys.includes('chestPain')) {
    bump('high', 'Breathing difficulty or chest pain always needs urgent care')
  }
  if (severity === 'severe') {
    bump('medium', 'You described the problem as very troubling')
  }
  if (fever === 'high') {
    bump('medium', 'High fever reported')
  }
  if (duration >= 7 && keys.includes('fever')) {
    bump('medium', `Fever continuing for about ${duration} days`)
  }
  if (keys.includes('cough') && duration >= 14) {
    bump('medium', 'Cough for more than 2 weeks needs TB screening')
  }
  if (keys.includes('vomiting') && keys.includes('diarrhoea') && (age >= 60 || age <= 5)) {
    bump('high', 'Vomiting with loose motions is risky at this age (dehydration)')
  }
  if (age >= 60 && level === 'low') {
    bump('medium', 'Age above 60 needs a lower threshold for a doctor visit')
  }
  if (age > 0 && age <= 5 && level === 'low') {
    bump('medium', 'Young children need earlier medical review')
  }
  if (hasChronic && level === 'low') {
    bump('medium', 'A long-term illness makes closer review sensible')
  }
  if (!reasons.length) {
    reasons.push('No warning signs reported and the problem sounds mild so far')
  }

  const matchedRule = CAUSE_RULES.find((rule) => rule.when(keys, session))
  const possibleCauses = matchedRule
    ? matchedRule.causes
    : [
        'A common short-term illness',
        'A problem that needs a doctor to examine you before anything can be said',
      ]

  const nextSteps = buildNextSteps(level)

  return {
    symptomsSummary: keys.length
      ? keys.map((k) => SYMPTOM_LABEL[k]).join(', ') + (duration ? ` (about ${duration} day(s))` : '')
      : session.rawInputs[0],
    possibleCauses,
    riskLevel: level,
    reasons,
    nextSteps,
    redFlags: session.redFlags,
  }
}

function buildNextSteps(level: RiskLevel): NextStep[] {
  if (level === 'high') {
    return [
      { label: 'Open emergency mode', path: '/emergency', tone: 'danger' },
      { label: 'Nearest emergency hospital', path: '/nearby?filter=emergency', tone: 'primary' },
      { label: 'Emergency doctor now', path: '/doctors?emergency=1', tone: 'default' },
      { label: 'Call ASHA worker', path: '/asha-contact', tone: 'default' },
    ]
  }
  if (level === 'medium') {
    return [
      { label: 'Talk to a doctor now', path: '/doctors', tone: 'primary' },
      { label: 'Nearest PHC / CHC', path: '/nearby?type=phc,chc', tone: 'default' },
      { label: 'Call ASHA worker', path: '/asha-contact', tone: 'default' },
      { label: 'Set a follow-up reminder', path: '/follow-ups', tone: 'default' },
    ]
  }
  return [
    { label: 'Nearest PHC', path: '/nearby?type=phc', tone: 'primary' },
    { label: 'Talk to a doctor', path: '/doctors', tone: 'default' },
    { label: 'Call ASHA worker', path: '/asha-contact', tone: 'default' },
    { label: 'Set a follow-up reminder', path: '/follow-ups', tone: 'default' },
  ]
}
