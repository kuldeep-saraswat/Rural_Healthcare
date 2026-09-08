import type { Language } from '@/types'
import type { AiCard, AiContext, AiTurn, IntentId } from './types'
import { detectEmergency, detectIntent, extractEntities } from './intents'
import { classifyRemote, hasRemoteRouter } from './remote'
import {
  acknowledgement,
  applyAnswer,
  buildTriage,
  nextQuestion,
  questionText,
  startSymptomSession,
} from './symptomEngine'
import {
  ashaForPatient,
  availableAmbulances,
  availableDoctors,
  bucketFollowUp,
  findMedicineAvailability,
  findTestAvailability,
  findVaccineAvailability,
  nearestEmergencyFacility,
  referralsForPatient,
  upcomingCamps,
} from '@/store/selectors'
import { MEDICINE_CATALOG, TEST_CATALOG, VACCINE_CATALOG } from '@/data/catalog'
import { normaliseText } from '@/lib/utils'

/**
 * The AI intent-routing layer.
 *
 * `resolveMessage` is the single entry point used by every surface (home
 * assistant, AI Health page, kiosk assisted mode). It is deterministic and
 * runs fully offline, which is what makes the prototype usable in a village
 * with no connectivity and no model API key.
 *
 * A hosted model can be plugged in without touching any UI: set
 * VITE_AI_ROUTER_URL and `resolveMessageAsync` will ask it for the intent,
 * then feed the answer into these same action builders. Emergency detection
 * and the symptom conversation always run locally first, so patient safety
 * never depends on a network round trip.
 */

const SAFETY_NOTICE: Record<Language, string> = {
  en: 'RuralCare AI gives possible causes and next steps only. It never diagnoses or prescribes medicine.',
  hi: 'RuralCare AI sirf sambhavit kaaran aur agla kadam batata hai. Yeh bimari confirm nahi karta aur dawa nahi likhta.',
  mr: 'RuralCare AI फक्त संभाव्य कारणे व पुढील पाऊल सांगते. ते निदान करत नाही किंवा औषध लिहून देत नाही.',
}

const DEMO_NOTICE: Record<Language, string> = {
  en: 'Demo workflow - no real ambulance, call or dispatch happens in this prototype.',
  hi: 'Demo workflow - is prototype mein asli ambulance ya call nahi hoti.',
  mr: 'डेमो प्रक्रिया - या प्रोटोटाइपमध्ये खरी रुग्णवाहिका किंवा कॉल होत नाही.',
}

type Phrases = Record<Language, string>

const say = (p: Phrases, language: Language) => p[language]

function suggestionsFor(language: Language): string[] {
  const list: Record<Language, string[]> = {
    en: [
      'I want to consult a doctor',
      'I need an ambulance',
      'Where will I get medicine?',
      'Where can I get an MRI?',
      'I am feeling unwell',
      'Do I have a follow-up?',
    ],
    hi: [
      'Doctor se consult karna hai',
      'Ambulance chahiye',
      'Ye medicine kahan milegi?',
      'MRI kahan hoga?',
      'Tabiyat kharab hai',
      'Kal follow-up hai kya?',
    ],
    mr: [
      'डॉक्टरांशी बोलायचे आहे',
      'रुग्णवाहिका हवी आहे',
      'औषध कुठे मिळेल?',
      'एमआरआय कुठे होईल?',
      'तब्येत बरी नाही',
      'उद्या फॉलो-अप आहे का?',
    ],
  }
  return list[language]
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function resolveMessage(text: string, ctx: AiContext): AiTurn {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      session: ctx.session,
      resolution: {
        intent: 'unknown',
        emergency: false,
        reply: say(
          {
            en: 'Please tell me what you need - you can type or speak.',
            hi: 'Bataiye aapko kya chahiye - type kar sakte hain ya bol sakte hain.',
            mr: 'तुम्हाला काय हवे ते सांगा - लिहू शकता किंवा बोलू शकता.',
          },
          ctx.language,
        ),
        cards: [],
        suggestions: suggestionsFor(ctx.language),
      },
    }
  }

  const emergencyCheck = detectEmergency(trimmed)

  // 1. A live symptom conversation takes priority - unless a red flag appears,
  //    in which case we escalate immediately.
  if (ctx.session && !ctx.session.complete) {
    if (emergencyCheck.emergency) {
      return emergencyTurn(ctx, 'emergency')
    }
    const pending = ctx.session.pending ?? nextQuestion(ctx.session)
    if (pending) {
      const updated = applyAnswer(ctx.session, pending, trimmed)
      const following = nextQuestion(updated)
      if (following) {
        updated.pending = following
        return {
          session: updated,
          resolution: {
            intent: 'symptoms',
            emergency: false,
            reply: `${acknowledgement(ctx.language, updated.asked.length)} ${questionText(
              following,
              ctx.language,
            )}`,
            cards: [],
            question: questionText(following, ctx.language),
            notice: SAFETY_NOTICE[ctx.language],
          },
        }
      }
      return triageTurn(updated, ctx)
    }
  }

  // 2. Emergency red flags always pre-empt normal routing.
  if (emergencyCheck.emergency) {
    const match = detectIntent(trimmed)
    return emergencyTurn(ctx, match.intent === 'ambulance' ? 'ambulance' : 'emergency')
  }

  // 3. Normal intent routing.
  const match = detectIntent(trimmed)
  const entities = extractEntities(trimmed)
  const intent: IntentId = match.intent === 'unknown' ? 'navigation' : match.intent
  return buildTurn(intent, entities, trimmed, ctx)
}

/**
 * Same as `resolveMessage`, but consults a configured remote classifier for
 * the intent. Safety-critical paths (emergency red flags, an in-flight symptom
 * conversation) are still decided locally before any network call.
 */
export async function resolveMessageAsync(text: string, ctx: AiContext): Promise<AiTurn> {
  const trimmed = text.trim()
  if (!hasRemoteRouter() || !trimmed) return resolveMessage(text, ctx)

  if (ctx.session && !ctx.session.complete) return resolveMessage(text, ctx)
  if (detectEmergency(trimmed).emergency) return resolveMessage(text, ctx)

  const remote = await classifyRemote(trimmed, ctx.language)
  if (!remote) return resolveMessage(text, ctx)

  const entities = { ...extractEntities(trimmed), ...remote.entities }
  if (remote.intent === 'emergency' || remote.intent === 'ambulance') {
    return emergencyTurn(ctx, remote.intent)
  }
  return buildTurn(remote.intent, entities, trimmed, ctx)
}

function buildTurn(
  intent: IntentId,
  entities: ReturnType<typeof extractEntities>,
  trimmed: string,
  ctx: AiContext,
): AiTurn {
  switch (intent) {
    case 'symptoms':
      return startSymptomTurn(trimmed, ctx)
    case 'doctor_consult':
    case 'nearby_doctor':
      return doctorTurn(ctx, false)
    case 'diagnostic_test':
      return testTurn(ctx, entities.testId)
    case 'medicine_availability':
      return medicineTurn(ctx, entities.medicineId, trimmed)
    case 'vaccine':
      return vaccineTurn(ctx, entities.vaccineId)
    case 'medical_camp':
      return campTurn(ctx)
    case 'health_kiosk':
      return kioskTurn(ctx)
    case 'asha':
      return ashaTurn(ctx)
    case 'referral_status':
      return referralTurn(ctx)
    case 'follow_up':
      return followUpTurn(ctx)
    case 'health_record':
      return recordTurn(ctx)
    case 'preventive_care':
      return preventiveTurn(ctx)
    case 'weather_precaution':
      return weatherTurn(ctx)
    case 'outbreak_alert':
      return outbreakTurn(ctx)
    case 'hospital':
      return facilityTurn(ctx, 'hospital')
    case 'phc':
      return facilityTurn(ctx, 'phc')
    case 'chc':
      return facilityTurn(ctx, 'chc')
    case 'emergency':
    case 'ambulance':
      return emergencyTurn(ctx, intent)
    default:
      return navigationTurn(ctx)
  }
}

// ---------------------------------------------------------------------------
// Turn builders
// ---------------------------------------------------------------------------

function emergencyTurn(ctx: AiContext, kind: 'emergency' | 'ambulance'): AiTurn {
  const { state } = ctx
  const ambulances = availableAmbulances(state)
  const hospital = nearestEmergencyFacility(state.facilities)
  const asha = ashaForPatient(state.ashas, ctx.patient)
  const emergencyDoctors = availableDoctors(state.doctors, state.facilities, {
    emergencyOnly: true,
  }).slice(0, 2)

  const cards: AiCard[] = []
  if (ambulances[0]) cards.push({ kind: 'ambulance', ambulanceId: ambulances[0].id })
  if (hospital) cards.push({ kind: 'facility', facilityId: hospital.id, note: 'Emergency hospital' })
  if (asha) cards.push({ kind: 'asha', ashaId: asha.id })
  for (const { doctor } of emergencyDoctors) {
    cards.push({ kind: 'doctor', doctorId: doctor.id, emergency: true })
  }

  const reply = ambulances.length
    ? say(
        {
          en: 'This sounds like an emergency. Switching to emergency mode and showing the nearest ambulance, emergency hospital and your ASHA worker.',
          hi: 'Yeh emergency lag rahi hai. Emergency mode khol raha hoon - sabse paas ki ambulance, emergency hospital aur aapki ASHA dikha raha hoon.',
          mr: 'ही आपत्कालीन स्थिती वाटते. आपत्कालीन मोड सुरू करत आहे - जवळची रुग्णवाहिका, रुग्णालय व आशा सेविका दाखवत आहे.',
        },
        ctx.language,
      )
    : say(
        {
          en: 'This sounds like an emergency, but no demo ambulance is free right now. Please use the emergency hospital and ASHA contacts below.',
          hi: 'Yeh emergency lag rahi hai, lekin abhi koi demo ambulance khaali nahi hai. Neeche emergency hospital aur ASHA se sampark karein.',
          mr: 'ही आपत्कालीन स्थिती वाटते, पण सध्या कोणतीही डेमो रुग्णवाहिका मोकळी नाही. खालील रुग्णालय व आशा संपर्क वापरा.',
        },
        ctx.language,
      )

  return {
    session: null,
    resolution: {
      intent: kind,
      emergency: true,
      reply,
      cards,
      route: { path: '/emergency', label: 'Open emergency mode', auto: true },
      notice: DEMO_NOTICE[ctx.language],
    },
  }
}

function startSymptomTurn(text: string, ctx: AiContext): AiTurn {
  const session = startSymptomSession(text, ctx.patient)
  const question = nextQuestion(session)
  if (!question) return triageTurn(session, ctx)
  session.pending = question

  const opener = say(
    {
      en: 'I am sorry to hear that. Let me ask a few short questions, one at a time.',
      hi: 'Sunkar dukh hua. Main ek-ek chhota sawaal poochhta hoon.',
      mr: 'ऐकून वाईट वाटले. मी एक-एक छोटा प्रश्न विचारतो.',
    },
    ctx.language,
  )

  const known = ctx.patient
    ? say(
        {
          en: `From your record: age ${ctx.patient.age}${
            ctx.patient.conditions.length ? `, ${ctx.patient.conditions.join(', ')}` : ''
          }.`,
          hi: `Aapke record se: umar ${ctx.patient.age}${
            ctx.patient.conditions.length ? `, ${ctx.patient.conditions.join(', ')}` : ''
          }.`,
          mr: `तुमच्या नोंदीतून: वय ${ctx.patient.age}${
            ctx.patient.conditions.length ? `, ${ctx.patient.conditions.join(', ')}` : ''
          }.`,
        },
        ctx.language,
      )
    : ''

  return {
    session,
    resolution: {
      intent: 'symptoms',
      emergency: false,
      reply: [opener, known, questionText(question, ctx.language)].filter(Boolean).join(' '),
      cards: [],
      question: questionText(question, ctx.language),
      notice: SAFETY_NOTICE[ctx.language],
    },
  }
}

function triageTurn(session: ReturnType<typeof startSymptomSession>, ctx: AiContext): AiTurn {
  const result = buildTriage(session, ctx.patient)
  const done = { ...session, complete: true, pending: undefined }
  const reply = say(
    {
      en: 'Thank you. Based on what you told me, here are the possible causes, the risk level and what you can do now.',
      hi: 'Shukriya. Aapne jo bataya uske aadhar par sambhavit kaaran, risk level aur agla kadam neeche hai.',
      mr: 'धन्यवाद. तुम्ही सांगितलेल्या माहितीवरून संभाव्य कारणे, धोका पातळी व पुढील पाऊल खाली आहे.',
    },
    ctx.language,
  )
  const cards: AiCard[] = [{ kind: 'triage', result }]
  if (result.riskLevel === 'high') {
    const hospital = nearestEmergencyFacility(ctx.state.facilities)
    if (hospital) cards.push({ kind: 'facility', facilityId: hospital.id, note: 'Emergency hospital' })
    const ambulance = availableAmbulances(ctx.state)[0]
    if (ambulance) cards.push({ kind: 'ambulance', ambulanceId: ambulance.id })
  } else {
    for (const { doctor } of availableDoctors(ctx.state.doctors, ctx.state.facilities).slice(0, 2)) {
      cards.push({ kind: 'doctor', doctorId: doctor.id })
    }
  }
  const asha = ashaForPatient(ctx.state.ashas, ctx.patient)
  if (asha) cards.push({ kind: 'asha', ashaId: asha.id })

  return {
    session: done,
    resolution: {
      intent: 'symptoms',
      emergency: result.riskLevel === 'high',
      reply,
      cards,
      notice: SAFETY_NOTICE[ctx.language],
      route:
        result.riskLevel === 'high'
          ? { path: '/emergency', label: 'Open emergency mode' }
          : { path: '/doctors', label: 'See available doctors' },
    },
  }
}

function doctorTurn(ctx: AiContext, emergencyOnly: boolean): AiTurn {
  const list = availableDoctors(ctx.state.doctors, ctx.state.facilities, { emergencyOnly }).slice(
    0,
    4,
  )
  if (!list.length) {
    return {
      session: null,
      resolution: {
        intent: 'doctor_consult',
        emergency: false,
        reply: say(
          {
            en: 'No doctor is marked available in the demo data right now. You can still visit the nearest PHC or contact your ASHA worker.',
            hi: 'Abhi demo data mein koi doctor available nahi hai. Aap paas ke PHC ja sakte hain ya ASHA se sampark karein.',
            mr: 'सध्या डेमो माहितीत कोणताही डॉक्टर उपलब्ध नाही. जवळच्या केंद्रात जा किंवा आशा सेविकेशी संपर्क करा.',
          },
          ctx.language,
        ),
        cards: [
          { kind: 'link', label: 'Nearby healthcare', path: '/nearby' },
          { kind: 'link', label: 'Contact ASHA', path: '/asha-contact' },
        ],
        route: { path: '/doctors', label: 'Open doctors' },
      },
    }
  }
  return {
    session: null,
    resolution: {
      intent: 'doctor_consult',
      emergency: false,
      reply: say(
        {
          en: 'Sure. Here are the doctors available right now.',
          hi: 'Bilkul. Abhi available doctors dekh raha hoon.',
          mr: 'नक्की. सध्या उपलब्ध डॉक्टर दाखवत आहे.',
        },
        ctx.language,
      ),
      cards: list.map(({ doctor }) => ({ kind: 'doctor' as const, doctorId: doctor.id })),
      route: { path: '/doctors', label: 'See all doctors' },
      notice: DEMO_NOTICE[ctx.language],
    },
  }
}

function testTurn(ctx: AiContext, testId?: string): AiTurn {
  const test = TEST_CATALOG.find((t) => t.id === testId)
  const query = test?.shortName ?? ''
  const results = findTestAvailability(ctx.state.facilities, query).slice(0, 4)
  const path = query ? `/tests?q=${encodeURIComponent(query)}` : '/tests'

  if (!results.length) {
    return {
      session: null,
      resolution: {
        intent: 'diagnostic_test',
        emergency: false,
        reply: say(
          {
            en: `${test ? `${test.name} is` : 'That test is'} not shown as available at any nearby demo facility right now.`,
            hi: `${test ? `${test.name}` : 'Yeh test'} abhi paas ki kisi demo facility mein uplabdh nahi dikh raha.`,
            mr: `${test ? `${test.name}` : 'ही तपासणी'} सध्या जवळच्या कोणत्याही डेमो केंद्रात उपलब्ध दिसत नाही.`,
          },
          ctx.language,
        ),
        cards: [{ kind: 'link', label: 'Open test finder', path: '/tests' }],
        route: { path, label: 'Open test finder' },
      },
    }
  }

  return {
    session: null,
    resolution: {
      intent: 'diagnostic_test',
      emergency: false,
      reply: say(
        {
          en: `${test?.name ?? 'This test'} is available at these facilities.`,
          hi: `${test?.name ?? 'Yeh test'} in facilities mein uplabdh hai.`,
          mr: `${test?.name ?? 'ही तपासणी'} या केंद्रांमध्ये उपलब्ध आहे.`,
        },
        ctx.language,
      ),
      cards: results.map((r) => ({
        kind: 'test' as const,
        testId: r.test.id,
        facilityId: r.facility.id,
      })),
      route: { path, label: 'Open test finder', auto: true },
    },
  }
}

function medicineTurn(ctx: AiContext, medicineId: string | undefined, rawText: string): AiTurn {
  const wantsReminder = /reminder|yaad|kab leni|kab lena|kab khani|आठवण|याद/.test(
    normaliseText(rawText),
  )
  if (wantsReminder && ctx.patient) {
    const schedules = ctx.state.medicationSchedules.filter(
      (s) => s.patientId === ctx.patient?.id && s.active,
    )
    return {
      session: null,
      resolution: {
        intent: 'medicine_availability',
        emergency: false,
        reply: say(
          {
            en: 'These are the medicine reminders created from your doctor’s prescription.',
            hi: 'Yeh reminders aapke doctor ki prescription se bane hain.',
            mr: 'ही आठवण तुमच्या डॉक्टरांच्या प्रिस्क्रिप्शनवरून तयार झाली आहे.',
          },
          ctx.language,
        ),
        cards: schedules.slice(0, 4).map((s) => ({ kind: 'medication' as const, scheduleId: s.id })),
        route: { path: '/medications', label: 'Open medicine reminders', auto: true },
        notice: SAFETY_NOTICE[ctx.language],
      },
    }
  }

  const medicine = MEDICINE_CATALOG.find((m) => m.id === medicineId)
  const query = medicine?.name ?? ''
  const results = findMedicineAvailability(ctx.state.facilities, query).slice(0, 5)
  const path = query ? `/medicines?q=${encodeURIComponent(query)}` : '/medicines'

  if (!results.length) {
    return {
      session: null,
      resolution: {
        intent: 'medicine_availability',
        emergency: false,
        reply: say(
          {
            en: 'I could not find that medicine in the demo stock list. Open the medicine finder to search by name.',
            hi: 'Demo stock list mein yeh dawa nahi mili. Medicine finder kholkar naam se dhoondhein.',
            mr: 'डेमो साठ्यात हे औषध सापडले नाही. औषध शोधक उघडून नावाने शोधा.',
          },
          ctx.language,
        ),
        cards: [{ kind: 'link', label: 'Open medicine finder', path: '/medicines' }],
        route: { path, label: 'Open medicine finder' },
      },
    }
  }

  return {
    session: null,
    resolution: {
      intent: 'medicine_availability',
      emergency: false,
      reply: say(
        {
          en: `Here is where ${medicine?.name ?? 'that medicine'} is stocked. This is availability information only.`,
          hi: `${medicine?.name ?? 'Yeh dawa'} kahan milegi, yeh neeche hai. Yeh sirf availability ki jaankari hai.`,
          mr: `${medicine?.name ?? 'हे औषध'} कुठे मिळेल ते खाली आहे. ही केवळ उपलब्धतेची माहिती आहे.`,
        },
        ctx.language,
      ),
      cards: results.map((r) => ({
        kind: 'medicine' as const,
        medicineId: r.medicine.id,
        facilityId: r.facility.id,
      })),
      route: { path, label: 'Open medicine finder', auto: true },
      notice: SAFETY_NOTICE[ctx.language],
    },
  }
}

function vaccineTurn(ctx: AiContext, vaccineId?: string): AiTurn {
  const vaccine = VACCINE_CATALOG.find((v) => v.id === vaccineId)
  const query = vaccine?.name ?? ''
  const results = findVaccineAvailability(ctx.state.facilities, query).slice(0, 4)
  const path = query ? `/vaccines?q=${encodeURIComponent(query)}` : '/vaccines'
  return {
    session: null,
    resolution: {
      intent: 'vaccine',
      emergency: false,
      reply: results.length
        ? say(
            {
              en: `${vaccine?.name ?? 'Vaccination'} centres and next slots are below.`,
              hi: `${vaccine?.name ?? 'Teekakaran'} ke centre aur next slot neeche hain.`,
              mr: `${vaccine?.name ?? 'लसीकरण'} केंद्रे व पुढील वेळ खाली आहे.`,
            },
            ctx.language,
          )
        : say(
            {
              en: 'No vaccine stock is shown nearby right now. Open the vaccine finder for all centres.',
              hi: 'Abhi paas mein vaccine stock nahi dikh raha. Vaccine finder kholein.',
              mr: 'सध्या जवळ लस साठा दिसत नाही. लस शोधक उघडा.',
            },
            ctx.language,
          ),
      cards: results.map((r) => ({
        kind: 'vaccine' as const,
        vaccineId: r.vaccine.id,
        facilityId: r.facility.id,
      })),
      route: { path, label: 'Open vaccine finder', auto: true },
    },
  }
}

function campTurn(ctx: AiContext): AiTurn {
  const village = ctx.patient?.village
  const camps = upcomingCamps(ctx.state.camps)
  const nearby = village ? camps.filter((c) => c.village === village) : camps
  const list = (nearby.length ? nearby : camps).slice(0, 3)
  return {
    session: null,
    resolution: {
      intent: 'medical_camp',
      emergency: false,
      reply: list.length
        ? say(
            {
              en: 'These medical camps are coming up near you.',
              hi: 'Aapke paas ye medical camp aa rahe hain.',
              mr: 'तुमच्या जवळ हे आरोग्य शिबिर येत आहे.',
            },
            ctx.language,
          )
        : say(
            {
              en: 'No upcoming camp is listed in the demo data right now.',
              hi: 'Demo data mein abhi koi camp nahi hai.',
              mr: 'डेमो माहितीत सध्या कोणतेही शिबिर नाही.',
            },
            ctx.language,
          ),
      cards: list.map((c) => ({ kind: 'camp' as const, campId: c.id })),
      route: { path: '/camps', label: 'Open medical camps', auto: true },
    },
  }
}

function kioskTurn(ctx: AiContext): AiTurn {
  const kiosks = ctx.state.facilities
    .filter((f) => f.type === 'kiosk')
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
  return {
    session: null,
    resolution: {
      intent: 'health_kiosk',
      emergency: false,
      reply: say(
        {
          en: 'A village health kiosk can help you even without a smartphone. Here are the nearest ones.',
          hi: 'Health kiosk par bina smartphone bhi madad milti hai. Sabse paas ke kiosk yeh hain.',
          mr: 'स्मार्टफोन नसतानाही आरोग्य कियोस्कवर मदत मिळते. जवळचे कियोस्क खाली आहेत.',
        },
        ctx.language,
      ),
      cards: kiosks.map((f) => ({ kind: 'kiosk' as const, facilityId: f.id })),
      route: { path: '/kiosks', label: 'Open health kiosks', auto: true },
    },
  }
}

function ashaTurn(ctx: AiContext): AiTurn {
  const asha = ashaForPatient(ctx.state.ashas, ctx.patient)
  return {
    session: null,
    resolution: {
      intent: 'asha',
      emergency: false,
      reply: asha
        ? say(
            {
              en: `Your nearest ASHA worker is ${asha.name} from ${asha.village}.`,
              hi: `Aapki sabse paas ki ASHA hain ${asha.name}, ${asha.village}.`,
              mr: `तुमच्या जवळची आशा सेविका ${asha.name}, ${asha.village}.`,
            },
            ctx.language,
          )
        : say(
            {
              en: 'No ASHA worker is mapped to your village in the demo data.',
              hi: 'Demo data mein aapke gaon ke liye ASHA nahi hai.',
              mr: 'डेमो माहितीत तुमच्या गावासाठी आशा सेविका नाही.',
            },
            ctx.language,
          ),
      cards: asha ? [{ kind: 'asha', ashaId: asha.id }] : [],
      route: { path: '/asha-contact', label: 'Open ASHA contact' },
      notice: DEMO_NOTICE[ctx.language],
    },
  }
}

function referralTurn(ctx: AiContext): AiTurn {
  const referrals = referralsForPatient(ctx.state.referrals, ctx.patient?.id).slice(0, 3)
  return {
    session: null,
    resolution: {
      intent: 'referral_status',
      emergency: false,
      reply: referrals.length
        ? say(
            {
              en: 'Here is the current status of your referrals.',
              hi: 'Aapke referral ki sthiti yeh hai.',
              mr: 'तुमच्या संदर्भाची सध्याची स्थिती खाली आहे.',
            },
            ctx.language,
          )
        : say(
            {
              en: 'You have no referrals in the demo record.',
              hi: 'Demo record mein aapka koi referral nahi hai.',
              mr: 'डेमो नोंदीत तुमचा कोणताही संदर्भ नाही.',
            },
            ctx.language,
          ),
      cards: referrals.map((r) => ({ kind: 'referral' as const, referralId: r.id })),
      route: { path: '/referrals', label: 'Open referrals', auto: true },
    },
  }
}

function followUpTurn(ctx: AiContext): AiTurn {
  const mine = ctx.state.followUps
    .filter((f) => f.patientId === ctx.patient?.id && f.status === 'scheduled')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const next = mine.slice(0, 3)
  const bucket = next[0] ? bucketFollowUp(next[0]) : undefined
  return {
    session: null,
    resolution: {
      intent: 'follow_up',
      emergency: false,
      reply: next.length
        ? say(
            {
              en:
                bucket === 'today'
                  ? 'Yes - you have a follow-up due today.'
                  : bucket === 'overdue'
                    ? 'You have an overdue follow-up. Please attend it soon.'
                    : 'Here is your next follow-up.',
              hi:
                bucket === 'today'
                  ? 'Haan - aaj aapka follow-up hai.'
                  : bucket === 'overdue'
                    ? 'Aapka follow-up chhoot gaya hai. Jaldi karwa lein.'
                    : 'Aapka agla follow-up yeh hai.',
              mr:
                bucket === 'today'
                  ? 'हो - आज तुमचा फॉलो-अप आहे.'
                  : bucket === 'overdue'
                    ? 'तुमचा फॉलो-अप राहिला आहे. लवकर करा.'
                    : 'तुमचा पुढील फॉलो-अप खाली आहे.',
            },
            ctx.language,
          )
        : say(
            {
              en: 'You have no upcoming follow-up in the demo record.',
              hi: 'Demo record mein aapka koi follow-up baaki nahi hai.',
              mr: 'डेमो नोंदीत तुमचा कोणताही फॉलो-अप बाकी नाही.',
            },
            ctx.language,
          ),
      cards: next.map((f) => ({ kind: 'followUp' as const, followUpId: f.id })),
      route: { path: '/follow-ups', label: 'Open follow-ups', auto: true },
    },
  }
}

function recordTurn(ctx: AiContext): AiTurn {
  return {
    session: null,
    resolution: {
      intent: 'health_record',
      emergency: false,
      reply: say(
        {
          en: 'Opening your health record - consultations, prescriptions, reports and vaccinations.',
          hi: 'Aapka health record khol raha hoon - consultation, prescription, report aur teeke.',
          mr: 'तुमची आरोग्य नोंद उघडत आहे - सल्ला, प्रिस्क्रिप्शन, अहवाल व लसी.',
        },
        ctx.language,
      ),
      cards: ctx.patient ? [{ kind: 'record', patientId: ctx.patient.id }] : [],
      route: { path: '/records', label: 'Open health record', auto: true },
    },
  }
}

function preventiveTurn(ctx: AiContext): AiTurn {
  return {
    session: null,
    resolution: {
      intent: 'preventive_care',
      emergency: false,
      reply: say(
        {
          en: 'Here are the preventive checks that apply to you.',
          hi: 'Aapke liye ye bachaav ki jaanchein hain.',
          mr: 'तुमच्यासाठी या प्रतिबंधात्मक तपासण्या आहेत.',
        },
        ctx.language,
      ),
      cards: [
        { kind: 'link', label: 'Preventive care checklist', path: '/preventive' },
        { kind: 'link', label: 'Vaccination due list', path: '/vaccines' },
        { kind: 'link', label: 'Follow-ups', path: '/follow-ups' },
      ],
      route: { path: '/preventive', label: 'Open preventive care', auto: true },
    },
  }
}

function weatherTurn(ctx: AiContext): AiTurn {
  const village = ctx.patient?.village ?? 'Kalyanpur'
  const weatherAlerts = ctx.state.alerts.filter(
    (a) => a.kind === 'weather' && a.areas.includes(village),
  )
  const cards: AiCard[] = [{ kind: 'environment', village }]
  for (const alert of weatherAlerts.slice(0, 2)) cards.push({ kind: 'alert', alertId: alert.id })
  return {
    session: null,
    resolution: {
      intent: 'weather_precaution',
      emergency: false,
      reply: say(
        {
          en: `Here are the current demo weather conditions for ${village} and the health precautions to take.`,
          hi: `${village} ke liye demo mausam ki sthiti aur zaroori savdhaniyan yeh hain.`,
          mr: `${village} साठी डेमो हवामान स्थिती व आवश्यक काळजी खाली आहे.`,
        },
        ctx.language,
      ),
      cards,
      route: { path: '/alerts', label: 'Open health alerts' },
    },
  }
}

function outbreakTurn(ctx: AiContext): AiTurn {
  const village = ctx.patient?.village ?? 'Kalyanpur'
  const now = Date.now()
  const active = ctx.state.alerts.filter(
    (a) => a.areas.includes(village) && new Date(a.expiresAt).getTime() > now,
  )
  const outbreaks = active.filter((a) => a.kind === 'outbreak')
  const list = (outbreaks.length ? outbreaks : active).slice(0, 3)
  return {
    session: null,
    resolution: {
      intent: 'outbreak_alert',
      emergency: false,
      reply: list.length
        ? say(
            {
              en: `There is an active demo public-health alert for ${village}. Please read the precautions - there is no need to panic.`,
              hi: `${village} ke liye ek demo public-health alert active hai. Savdhaniyan padhein - ghabrane ki zaroorat nahi.`,
              mr: `${village} साठी एक डेमो सार्वजनिक आरोग्य सूचना सक्रिय आहे. काळजी वाचा - घाबरण्याची गरज नाही.`,
            },
            ctx.language,
          )
        : say(
            {
              en: `No active health alert is listed for ${village} in the demo data.`,
              hi: `Demo data mein ${village} ke liye koi alert nahi hai.`,
              mr: `डेमो माहितीत ${village} साठी कोणतीही सूचना नाही.`,
            },
            ctx.language,
          ),
      cards: list.map((a) => ({ kind: 'alert' as const, alertId: a.id })),
      route: { path: '/alerts', label: 'Open health alerts', auto: true },
    },
  }
}

function facilityTurn(ctx: AiContext, kind: 'hospital' | 'phc' | 'chc'): AiTurn {
  const typeFilter =
    kind === 'phc' ? ['phc'] : kind === 'chc' ? ['chc'] : ['district_hospital', 'medical_college']
  const list = ctx.state.facilities
    .filter((f) => typeFilter.includes(f.type))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
  return {
    session: null,
    resolution: {
      intent: kind,
      emergency: false,
      reply: say(
        {
          en: 'These are the nearest matching facilities.',
          hi: 'Sabse paas ki ye facilities hain.',
          mr: 'सर्वात जवळची ही केंद्रे आहेत.',
        },
        ctx.language,
      ),
      cards: list.map((f) => ({ kind: 'facility' as const, facilityId: f.id })),
      route: { path: `/nearby?type=${typeFilter.join(',')}`, label: 'Open healthcare finder', auto: true },
    },
  }
}

function navigationTurn(ctx: AiContext): AiTurn {
  return {
    session: null,
    resolution: {
      intent: 'navigation',
      emergency: false,
      reply: say(
        {
          en: 'I can help you reach a doctor, call an ambulance, find medicines or tests, check your record, or see health alerts. What do you need?',
          hi: 'Main doctor se milwa sakta hoon, ambulance bula sakta hoon, dawa ya test dhoondh sakta hoon, record dikha sakta hoon, ya health alert bata sakta hoon. Aapko kya chahiye?',
          mr: 'मी डॉक्टर, रुग्णवाहिका, औषध किंवा तपासणी, आरोग्य नोंद व सूचना यात मदत करू शकते. तुम्हाला काय हवे?',
        },
        ctx.language,
      ),
      cards: [
        { kind: 'link', label: 'Available doctors', path: '/doctors' },
        { kind: 'link', label: 'Nearby healthcare', path: '/nearby' },
        { kind: 'link', label: 'Medicine availability', path: '/medicines' },
        { kind: 'link', label: 'Test finder', path: '/tests' },
        { kind: 'link', label: 'Health alerts', path: '/alerts' },
      ],
      suggestions: suggestionsFor(ctx.language),
    },
  }
}

export { suggestionsFor }

/** Exposed so the UI can label the routing mode honestly. */
export function aiModeLabel(): string {
  return hasRemoteRouter()
    ? 'Remote intent router configured (falls back to on-device rules)'
    : 'On-device rule-based routing (no model API configured)'
}
