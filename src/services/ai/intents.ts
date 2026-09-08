import type { ExtractedEntities, IntentId } from './types'
import { MEDICINE_CATALOG, TEST_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import { normaliseText } from '@/lib/utils'

/**
 * Deterministic multilingual intent detection.
 *
 * This is the fallback that makes the demo work with no LLM key configured
 * (see `router.ts` for how a hosted model would slot in). Keywords cover
 * English, Hindi (Devanagari + Roman transliteration) and Marathi, because
 * rural users type Hinglish far more often than pure Devanagari.
 *
 * Adding an intent = adding one entry to INTENTS. No UI file changes.
 */

export interface IntentDefinition {
  id: IntentId
  /** Higher wins when several intents match. */
  priority: number
  emergency?: boolean
  keywords: string[]
  /** Optional regexes for phrase-shaped matches. */
  patterns?: RegExp[]
}

const EMERGENCY_PHRASES = [
  'emergency',
  'emergancy',
  'bahut emergency',
  'turant',
  'jaldi',
  'urgent',
  'serious',
  'saans nahi',
  'saans nhi',
  'sans nahi',
  'saans lene',
  'breathless',
  'not able to breathe',
  'cannot breathe',
  'chest pain',
  'severe chest pain',
  'seene me dard',
  'seene mein dard',
  'chhati me dard',
  'heart attack',
  'behosh',
  'behoshi',
  'unconscious',
  'faint',
  'bleeding',
  'khoon bah',
  'khoon nikal',
  'bahut khoon',
  'accident',
  'delivery',
  'labour pain',
  'labor pain',
  'prasav',
  'baccha hone',
  'bachcha hone',
  'snake bite',
  'saap ne kata',
  'saanp',
  'poison',
  'zeher',
  'jahar',
  'stroke',
  'paralysis',
  'lakwa',
  'convulsion',
  'jhatke',
  'mirgi',
  'fits',
  'burn',
  'jal gaya',
  'suicide',
  'very serious',
  'critical',
  'श्वास घेता येत नाही',
  'श्वास नहीं',
  'छातीत दुखत',
  'छाती में दर्द',
  'बेशुद्ध',
  'बेहोश',
  'रक्तस्राव',
  'खून बह',
  'अपघात',
  'दुर्घटना',
  'प्रसूती',
  'आपत्काल',
  'तातडीने',
  'अत्यावश्यक',
  'सर्पदंश',
  'सांप',
  'विष',
  'झटके',
  'लकवा',
]

const AMBULANCE_WORDS = [
  'ambulance',
  'ambulence',
  'ambulans',
  '108',
  '102',
  'rugnavahika',
  'rugnvahika',
  'gaadi chahiye',
  'gadi chahiye',
  'van chahiye',
  'रुग्णवाहिका',
  'एम्बुलेंस',
  'एंबुलेंस',
  'अ‍ॅम्बुलन्स',
]

export const INTENTS: IntentDefinition[] = [
  {
    id: 'ambulance',
    priority: 100,
    emergency: true,
    keywords: AMBULANCE_WORDS,
  },
  {
    id: 'emergency',
    priority: 95,
    emergency: true,
    keywords: EMERGENCY_PHRASES,
  },
  {
    id: 'diagnostic_test',
    priority: 76,
    keywords: [
      'test',
      'jaanch',
      'janch',
      'jaach',
      'tapasani',
      'tapasni',
      'scan',
      'report banwana',
      'blood test',
      'khoon ki jaanch',
      'तपासणी',
      'जांच',
      'चाचणी',
      ...TEST_CATALOG.flatMap((t) => [t.shortName.toLowerCase(), ...t.aliases]),
    ],
  },
  {
    id: 'medicine_availability',
    priority: 75,
    keywords: [
      'medicine',
      'medicin',
      'dawa',
      'dawai',
      'davai',
      'dava',
      'goli',
      'tablet',
      'syrup',
      'pharmacy',
      'medical store',
      'jan aushadhi',
      'stock',
      'औषध',
      'औषधी',
      'दवा',
      'दवाई',
      'गोली',
      'गोळी',
      ...MEDICINE_CATALOG.flatMap((m) => [m.generic.toLowerCase(), ...m.aliases]),
    ],
  },
  {
    id: 'vaccine',
    priority: 74,
    keywords: [
      'vaccine',
      'vaccin',
      'teeka',
      'tika',
      'immunisation',
      'immunization',
      'लस',
      'टीका',
      'लसीकरण',
      ...VACCINE_CATALOG.flatMap((v) => v.aliases),
    ],
  },
  {
    id: 'medical_camp',
    priority: 70,
    keywords: [
      'camp',
      'kaimp',
      'shibir',
      'medical camp',
      'health camp',
      'mobile unit',
      'mobile medical',
      'शिबिर',
      'कैंप',
      'आरोग्य शिबिर',
      'स्वास्थ्य शिविर',
    ],
  },
  {
    id: 'health_kiosk',
    priority: 70,
    keywords: [
      'kiosk',
      'kiyosk',
      'panchayat computer',
      'health kiosk',
      'कियोस्क',
      'आरोग्य कियोस्क',
    ],
  },
  {
    id: 'referral_status',
    priority: 68,
    keywords: [
      'referral',
      'refer',
      'refer kiya',
      'bheja hai',
      'district hospital bheja',
      'रेफर',
      'संदर्भ',
      'रेफरल',
    ],
  },
  {
    id: 'follow_up',
    priority: 68,
    keywords: [
      'follow up',
      'followup',
      'follow-up',
      'dobara kab',
      'agli visit',
      'next visit',
      'kab aana hai',
      'फॉलो अप',
      'फॉलो-अप',
      'पुढील भेट',
      'अगली विजिट',
    ],
  },
  {
    id: 'health_record',
    priority: 66,
    keywords: [
      'record',
      'health record',
      'my report',
      'purani report',
      'parchi',
      'file',
      'history',
      'medical history',
      'रिकॉर्ड',
      'नोंद',
      'अहवाल',
      'पर्ची',
    ],
  },
  {
    id: 'asha',
    priority: 65,
    keywords: [
      'asha',
      'aasha',
      'asha worker',
      'asha didi',
      'anm',
      'sunita',
      'आशा',
      'आशा सेविका',
      'आशा कार्यकर्ता',
    ],
  },
  {
    id: 'doctor_consult',
    priority: 64,
    keywords: [
      'doctor',
      'docter',
      'daktar',
      'dr',
      'consult',
      'consultation',
      'baat karni',
      'baat karna',
      'salah',
      'sallah',
      'dikhana hai',
      'dikhwana hai',
      'video call',
      'teleconsultation',
      'telemedicine',
      'डॉक्टर',
      'डॉक्टरांशी',
      'डॉक्टरशी',
      'सल्ला',
      'दाखवायचे',
    ],
  },
  {
    id: 'nearby_doctor',
    priority: 63,
    keywords: [
      'paas ka doctor',
      'najdiki doctor',
      'nearby doctor',
      'nearest doctor',
      'jawal doctor',
      'जवळचा डॉक्टर',
      'पास का डॉक्टर',
    ],
  },
  {
    id: 'preventive_care',
    priority: 58,
    keywords: [
      'preventive',
      'prevention',
      'bachav',
      'bachaav',
      'screening',
      'bp check',
      'sugar check',
      'checkup',
      'check up',
      'jaanch karwani hai',
      'प्रतिबंध',
      'तपासणी शिबिर',
      'रोकथाम',
      'बचाव',
    ],
  },
  {
    id: 'outbreak_alert',
    priority: 57,
    keywords: [
      'bimari fail',
      'bimari fail',
      'disease spread',
      'outbreak',
      'epidemic',
      'area mein bimari',
      'gaon mein bimari',
      'health alert',
      'alert',
      'fail rahi',
      'phail rahi',
      'फैल रही',
      'साथीचा आजार',
      'आजार पसरत',
      'रोग फैल',
      'आरोग्य सूचना',
    ],
  },
  {
    id: 'weather_precaution',
    priority: 56,
    keywords: [
      'garmi',
      'garami',
      'heat',
      'heat wave',
      'loo',
      'barish',
      'baarish',
      'rain',
      'flood',
      'baadh',
      'thand',
      'sardi ka mausam',
      'cold wave',
      'mausam',
      'weather',
      'precaution',
      'गरमी',
      'गर्मी',
      'उष्णता',
      'पाऊस',
      'बारिश',
      'पूर',
      'बाढ़',
      'हवामान',
      'मौसम',
      'सावधानी',
    ],
  },
  {
    id: 'hospital',
    priority: 52,
    keywords: [
      'hospital',
      'aspatal',
      'haspatal',
      'dawakhana',
      'davakhana',
      'अस्पताल',
      'रुग्णालय',
      'दवाखाना',
    ],
  },
  {
    id: 'phc',
    priority: 52,
    keywords: [
      'phc',
      'primary health centre',
      'primary health center',
      'swasthya kendra',
      'arogya kendra',
      'प्राथमिक आरोग्य केंद्र',
      'स्वास्थ्य केंद्र',
      'प्राथमिक केंद्र',
    ],
  },
  {
    id: 'chc',
    priority: 52,
    keywords: [
      'chc',
      'community health centre',
      'community health center',
      'samudayik',
      'सामुदायिक आरोग्य केंद्र',
      'सामुदायिक स्वास्थ्य केंद्र',
    ],
  },
  {
    id: 'symptoms',
    priority: 45,
    keywords: [
      'bukhar',
      'bukhar',
      'fever',
      'temperature',
      'khansi',
      'khasi',
      'cough',
      'sardi',
      'cold',
      'zukam',
      'jukam',
      'dard',
      'pain',
      'sir dard',
      'sirdard',
      'headache',
      'ulti',
      'vomit',
      'vomiting',
      'dast',
      'loose motion',
      'diarrhoea',
      'diarrhea',
      'pet dard',
      'stomach pain',
      'kamzori',
      'weakness',
      'thakan',
      'chakkar',
      'giddiness',
      'dizzy',
      'rash',
      'daane',
      'sujan',
      'swelling',
      'tabiyat kharab',
      'tabiyat theek nahi',
      'bimar',
      'unwell',
      'not feeling well',
      'body ache',
      'badan dard',
      'jalan',
      'burning',
      'khujli',
      'itching',
      'bhookh nahi',
      'appetite',
      'saans phoolna',
      'बुखार',
      'ताप',
      'खांसी',
      'खोकला',
      'सर्दी',
      'दर्द',
      'दुखणे',
      'डोकेदुखी',
      'सिरदर्द',
      'उलटी',
      'उलटी होणे',
      'जुलाब',
      'दस्त',
      'पेट दर्द',
      'पोटदुखी',
      'अशक्तपणा',
      'कमजोरी',
      'चक्कर',
      'सूजन',
      'तबियत',
      'तब्येत',
      'आजारी',
      'बीमार',
    ],
  },
  {
    id: 'navigation',
    priority: 10,
    keywords: [
      'help',
      'madad',
      'kya kar sakte',
      'kaise use',
      'menu',
      'options',
      'मदत',
      'मदद',
      'कैसे',
      'कसे',
    ],
  },
]

export interface IntentMatch {
  intent: IntentId
  score: number
  emergency: boolean
  matched: string[]
}

const ASCII_ONLY = /^[a-z0-9 ]+$/

/**
 * Keyword matching that does not fire on accidental substrings.
 *
 * Short latin abbreviations are the dangerous ones: a plain `includes('ct')`
 * matches "do-ct-or" and hijacks a doctor request into a CT-scan request.
 * Those are matched on word boundaries (with an optional plural "s"), while
 * longer words and Devanagari keep forgiving substring matching so that
 * misspellings and compounds ("sirdard") still work.
 */
export function matchesKeyword(normalisedText: string, keyword: string): boolean {
  const needle = normaliseText(keyword)
  if (!needle) return false
  if (needle.length <= 4 && ASCII_ONLY.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z0-9])${escaped}s?(?![a-z0-9])`).test(normalisedText)
  }
  return normalisedText.includes(needle)
}

/** Scores every intent against the normalised text and returns the best match. */
export function detectIntent(rawText: string): IntentMatch {
  const text = normaliseText(rawText)
  let best: IntentMatch = { intent: 'unknown', score: 0, emergency: false, matched: [] }

  for (const definition of INTENTS) {
    const matched: string[] = []
    for (const keyword of definition.keywords) {
      if (matchesKeyword(text, keyword)) matched.push(keyword)
    }
    if (definition.patterns) {
      for (const pattern of definition.patterns) {
        if (pattern.test(text)) matched.push(pattern.source)
      }
    }
    if (!matched.length) continue
    // Longer keyword hits are stronger signals than single short words.
    const specificity = Math.max(...matched.map((m) => Math.min(m.length, 24)))
    const score = definition.priority + matched.length * 2 + specificity / 4
    if (score > best.score) {
      best = {
        intent: definition.id,
        score,
        emergency: Boolean(definition.emergency),
        matched,
      }
    }
  }

  return best
}

/** True when the message contains a red flag that must pre-empt everything. */
export function detectEmergency(rawText: string): { emergency: boolean; flags: string[] } {
  const text = normaliseText(rawText)
  const flags = [...EMERGENCY_PHRASES, ...AMBULANCE_WORDS].filter((phrase) =>
    matchesKeyword(text, phrase),
  )
  return { emergency: flags.length > 0, flags }
}

const VILLAGE_NAMES = ['kalyanpur', 'devgaon', 'rampur', 'bhilwadi', 'shivpur']

export function extractEntities(rawText: string): ExtractedEntities {
  const text = normaliseText(rawText)

  const test = TEST_CATALOG.find(
    (t) =>
      matchesKeyword(text, t.shortName) ||
      matchesKeyword(text, t.name) ||
      t.aliases.some((a) => matchesKeyword(text, a)),
  )
  const medicine = MEDICINE_CATALOG.find(
    (m) =>
      matchesKeyword(text, m.name.split(' ')[0]) ||
      matchesKeyword(text, m.generic) ||
      m.aliases.some((a) => matchesKeyword(text, a)),
  )
  const vaccine = VACCINE_CATALOG.find(
    (v) => matchesKeyword(text, v.name) || v.aliases.some((a) => matchesKeyword(text, a)),
  )

  const villageMatch = VILLAGE_NAMES.find((v) => text.includes(v))
  const durationMatch = /(\d+)\s*(din|dino|day|days|दिन|दिवस)/.exec(text)
  const tempMatch = /(\d{2,3})(?:\s*)(?:f|degree|digri|डिग्री)/.exec(text)

  let facilityType: ExtractedEntities['facilityType']
  if (/\bphc\b|primary health|प्राथमिक/.test(text)) facilityType = 'phc'
  else if (/\bchc\b|community health|सामुदायिक/.test(text)) facilityType = 'chc'
  else if (/medical college|मेडिकल कॉलेज/.test(text)) facilityType = 'medical_college'
  else if (/district hospital|जिला अस्पताल|जिल्हा रुग्णालय/.test(text))
    facilityType = 'district_hospital'
  else if (/diagnostic|lab|प्रयोगशाळा/.test(text)) facilityType = 'diagnostic_centre'

  return {
    testId: test?.id,
    medicineId: medicine?.id,
    vaccineId: vaccine?.id,
    village: villageMatch ? villageMatch[0].toUpperCase() + villageMatch.slice(1) : undefined,
    durationDays: durationMatch ? Number(durationMatch[1]) : undefined,
    temperatureF: tempMatch ? Number(tempMatch[1]) : undefined,
    facilityType,
    freeText: rawText.trim(),
  }
}
