import type { Language } from '@/types'
import { useAppStore } from '@/store/useAppStore'

/**
 * Lightweight i18n. Adding a language means adding one more column here plus
 * one entry in LANGUAGES - no other file needs to change.
 */

export const LANGUAGES: { code: Language; label: string; nativeLabel: string; speechTag: string }[] =
  [
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechTag: 'hi-IN' },
    { code: 'en', label: 'English', nativeLabel: 'English', speechTag: 'en-IN' },
    { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechTag: 'mr-IN' },
  ]

type Dict = Record<string, string>

const en: Dict = {
  'app.name': 'RuralCare AI',
  'app.tagline': 'Say what you need. We will find the care.',
  'app.demoBanner': 'Prototype with demo data. Not connected to real emergency services.',

  'greeting.hello': 'Hello {name}',
  'greeting.namaste': 'Namaste {name}',
  'home.question': 'What do you need help with?',
  'home.speak': 'Speak to tell us',
  'home.type': 'Type here...',
  'home.send': 'Send',
  'home.listening': 'Listening...',
  'home.voiceUnavailable': 'Voice input is not available in this browser. Please type instead.',
  'home.voiceSimulated': 'Voice input simulated - your browser does not support speech recognition.',
  'home.orChoose': 'Or choose a common need',

  'suggest.doctor': 'I want to consult a doctor',
  'suggest.ambulance': 'I need an ambulance',
  'suggest.medicine': 'Where will I get medicine?',
  'suggest.test': 'Where can I get a test done?',
  'suggest.unwell': 'I am feeling unwell',
  'suggest.followup': 'Do I have a follow-up?',
  'suggest.asha': 'Who is my nearest ASHA worker?',
  'suggest.alert': 'Is any illness spreading in my area?',

  'nav.home': 'Home',
  'nav.ai': 'AI Health',
  'nav.nearby': 'Nearby Healthcare',
  'nav.doctors': 'Doctors',
  'nav.records': 'Health Records',
  'nav.referrals': 'Referrals',
  'nav.more': 'More',
  'nav.asha': 'ASHA',
  'nav.camps': 'Medical Camps',
  'nav.kiosks': 'Health Kiosks',
  'nav.medicines': 'Medicines',
  'nav.tests': 'Tests',
  'nav.vaccines': 'Vaccines',
  'nav.followups': 'Follow-ups',
  'nav.medications': 'Medicine Reminders',
  'nav.preventive': 'Preventive Care',
  'nav.alerts': 'Health Alerts',
  'nav.village': 'Village Health Access',
  'nav.profile': 'Profile',
  'nav.emergency': 'Emergency',

  'status.available': 'Available',
  'status.unavailable': 'Not available',
  'status.low': 'Low stock',
  'status.out': 'Out of stock',
  'status.online': 'Online',
  'status.offline': 'Offline',
  'status.syncing': 'Syncing...',
  'status.synced': 'Synced',

  'action.call': 'Call',
  'action.video': 'Video Consultation',
  'action.directions': 'Get Directions',
  'action.requestAmbulance': 'Request Ambulance',
  'action.message': 'Message',
  'action.register': 'Register',
  'action.viewRecord': 'View Record',
  'action.track': 'Track Referral',
  'action.findNearby': 'Find Nearby',
  'action.viewFollowUp': 'View Follow-up',
  'action.markTaken': 'Mark as Taken',
  'action.skip': 'Skip',
  'action.viewPrescription': 'View Prescription',
  'action.retry': 'Try again',

  'emergency.title': 'EMERGENCY MODE',
  'emergency.subtitle': 'Demo emergency workflow - no real ambulance is dispatched.',
  'emergency.nearestAmbulance': 'Nearest available ambulance',
  'emergency.nearestHospital': 'Nearest Emergency Hospital',
  'emergency.ashaWorker': 'ASHA Worker',
  'emergency.eta': 'ETA',
  'emergency.away': 'away',
  'emergency.none': 'No demo ambulance is free right now.',

  'risk.low': 'LOW',
  'risk.medium': 'MEDIUM',
  'risk.high': 'HIGH',
  'risk.level': 'Risk Level',
  'symptom.possibleCauses': 'Possible Causes',
  'symptom.notDiagnosis': 'These are possible causes only - not a confirmed diagnosis.',
  'symptom.whatToDo': 'What to do now',
  'symptom.noPrescription': 'RuralCare AI never prescribes medicines. Only a doctor can do that.',

  'empty.noDoctors': 'No doctors are available right now.',
  'empty.noAmbulance': 'No ambulance is available right now.',
  'empty.noMedicine': 'This medicine is not in stock at any nearby facility.',
  'empty.noTest': 'This test is not available at any nearby facility.',
  'empty.noReferral': 'You have no referrals yet.',
  'empty.noFollowUp': 'You have no upcoming follow-up.',
  'empty.generic': 'Nothing to show yet.',

  'error.title': 'Something went wrong',
  'error.body': 'This part of the prototype could not load. You can try again.',
}

const hi: Dict = {
  'app.name': 'RuralCare AI',
  'app.tagline': 'Jo chahiye bol dein. Ilaaj hum dhoondh denge.',
  'app.demoBanner': 'Yeh ek prototype hai, demo data ke saath. Asli emergency seva se juda nahi hai.',

  'greeting.hello': 'Namaste {name}',
  'greeting.namaste': 'Namaste {name}',
  'home.question': 'Aapko kis cheez mein madad chahiye?',
  'home.speak': 'Bolkar batayein',
  'home.type': 'Type karein...',
  'home.send': 'Bhejein',
  'home.listening': 'Sun rahe hain...',
  'home.voiceUnavailable': 'Is browser mein voice input uplabdh nahi hai. Kripya type karein.',
  'home.voiceSimulated': 'Voice input simulated hai - aapka browser speech recognition support nahi karta.',
  'home.orChoose': 'Ya neeche se chunein',

  'suggest.doctor': 'Doctor se consult karna hai',
  'suggest.ambulance': 'Ambulance chahiye',
  'suggest.medicine': 'Medicine kahan milegi?',
  'suggest.test': 'Test kahan hoga?',
  'suggest.unwell': 'Tabiyat kharab hai',
  'suggest.followup': 'Kal follow-up hai kya?',
  'suggest.asha': 'Nearest ASHA kaun hai?',
  'suggest.alert': 'Mere area mein koi bimari fail rahi hai kya?',

  'nav.home': 'Home',
  'nav.ai': 'AI Sehat',
  'nav.nearby': 'Paas ka Ilaaj',
  'nav.doctors': 'Doctor',
  'nav.records': 'Health Record',
  'nav.referrals': 'Referral',
  'nav.more': 'Aur',
  'nav.asha': 'ASHA',
  'nav.camps': 'Medical Camp',
  'nav.kiosks': 'Health Kiosk',
  'nav.medicines': 'Dawaiyan',
  'nav.tests': 'Test',
  'nav.vaccines': 'Teeka',
  'nav.followups': 'Follow-up',
  'nav.medications': 'Dawa Reminder',
  'nav.preventive': 'Bachaav',
  'nav.alerts': 'Health Alert',
  'nav.village': 'Gaon ki Swasthya Suvidha',
  'nav.profile': 'Profile',
  'nav.emergency': 'Emergency',

  'status.available': 'Uplabdh',
  'status.unavailable': 'Uplabdh nahi',
  'status.low': 'Kam stock',
  'status.out': 'Stock khatam',
  'status.online': 'Online',
  'status.offline': 'Offline',
  'status.syncing': 'Sync ho raha hai...',
  'status.synced': 'Sync ho gaya',

  'action.call': 'Call karein',
  'action.video': 'Video Consultation',
  'action.directions': 'Raasta dekhein',
  'action.requestAmbulance': 'AMBULANCE MANGWAYEIN',
  'action.message': 'Message',
  'action.register': 'Register karein',
  'action.viewRecord': 'Record dekhein',
  'action.track': 'Referral track karein',
  'action.findNearby': 'Paas mein dhoondhein',
  'action.viewFollowUp': 'Follow-up dekhein',
  'action.markTaken': 'Le li',
  'action.skip': 'Chhod dein',
  'action.viewPrescription': 'Prescription dekhein',
  'action.retry': 'Dobara koshish karein',

  'emergency.title': 'EMERGENCY MODE',
  'emergency.subtitle': 'Demo emergency workflow - asli ambulance nahi bheji jaati.',
  'emergency.nearestAmbulance': 'Sabse paas uplabdh ambulance',
  'emergency.nearestHospital': 'Sabse paas ka Emergency Hospital',
  'emergency.ashaWorker': 'ASHA Karyakarta',
  'emergency.eta': 'Pahunchne ka samay',
  'emergency.away': 'door',
  'emergency.none': 'Abhi koi demo ambulance khaali nahi hai.',

  'risk.low': 'KAM',
  'risk.medium': 'MADHYAM',
  'risk.high': 'ZYADA',
  'risk.level': 'Risk Level',
  'symptom.possibleCauses': 'Sambhavit Kaaran',
  'symptom.notDiagnosis': 'Yeh sirf sambhavit kaaran hain - pakki bimari ki pehchaan nahi.',
  'symptom.whatToDo': 'Ab kya karein',
  'symptom.noPrescription': 'RuralCare AI kabhi dawa nahi likhta. Yeh sirf doctor kar sakte hain.',

  'empty.noDoctors': 'Abhi koi doctor uplabdh nahi hai.',
  'empty.noAmbulance': 'Abhi koi ambulance uplabdh nahi hai.',
  'empty.noMedicine': 'Yeh dawa paas ki kisi facility mein stock mein nahi hai.',
  'empty.noTest': 'Yeh test paas ki kisi facility mein uplabdh nahi hai.',
  'empty.noReferral': 'Aapka koi referral nahi hai.',
  'empty.noFollowUp': 'Aapka koi follow-up baaki nahi hai.',
  'empty.generic': 'Abhi dikhane ke liye kuch nahi hai.',

  'error.title': 'Kuch galat ho gaya',
  'error.body': 'Yeh hissa load nahi ho paya. Dobara koshish karein.',
}

const mr: Dict = {
  'app.name': 'RuralCare AI',
  'app.tagline': 'तुम्हाला काय हवे ते सांगा. उपचार आम्ही शोधतो.',
  'app.demoBanner': 'हे एक प्रोटोटाइप आहे, डेमो माहितीसह. खऱ्या आपत्कालीन सेवेशी जोडलेले नाही.',

  'greeting.hello': 'नमस्कार {name}',
  'greeting.namaste': 'नमस्कार {name}',
  'home.question': 'तुम्हाला कशात मदत हवी आहे?',
  'home.speak': 'बोलून सांगा',
  'home.type': 'येथे लिहा...',
  'home.send': 'पाठवा',
  'home.listening': 'ऐकत आहे...',
  'home.voiceUnavailable': 'या ब्राउझरमध्ये आवाज सुविधा उपलब्ध नाही. कृपया लिहा.',
  'home.voiceSimulated': 'आवाज इनपुट सिम्युलेटेड आहे - ब्राउझर स्पीच ओळखत नाही.',
  'home.orChoose': 'किंवा खालील पर्याय निवडा',

  'suggest.doctor': 'डॉक्टरांशी बोलायचे आहे',
  'suggest.ambulance': 'रुग्णवाहिका हवी आहे',
  'suggest.medicine': 'औषध कुठे मिळेल?',
  'suggest.test': 'तपासणी कुठे होईल?',
  'suggest.unwell': 'तब्येत बरी नाही',
  'suggest.followup': 'उद्या फॉलो-अप आहे का?',
  'suggest.asha': 'जवळची आशा सेविका कोण?',
  'suggest.alert': 'माझ्या भागात काही आजार पसरत आहे का?',

  'nav.home': 'मुख्यपृष्ठ',
  'nav.ai': 'AI आरोग्य',
  'nav.nearby': 'जवळचे उपचार',
  'nav.doctors': 'डॉक्टर',
  'nav.records': 'आरोग्य नोंद',
  'nav.referrals': 'संदर्भ',
  'nav.more': 'अधिक',
  'nav.asha': 'आशा',
  'nav.camps': 'आरोग्य शिबिर',
  'nav.kiosks': 'आरोग्य कियोस्क',
  'nav.medicines': 'औषधे',
  'nav.tests': 'तपासणी',
  'nav.vaccines': 'लस',
  'nav.followups': 'फॉलो-अप',
  'nav.medications': 'औषध आठवण',
  'nav.preventive': 'प्रतिबंधात्मक काळजी',
  'nav.alerts': 'आरोग्य सूचना',
  'nav.village': 'गावातील आरोग्य सुविधा',
  'nav.profile': 'प्रोफाइल',
  'nav.emergency': 'आपत्काल',

  'status.available': 'उपलब्ध',
  'status.unavailable': 'उपलब्ध नाही',
  'status.low': 'कमी साठा',
  'status.out': 'साठा संपला',
  'status.online': 'ऑनलाइन',
  'status.offline': 'ऑफलाइन',
  'status.syncing': 'सिंक होत आहे...',
  'status.synced': 'सिंक झाले',

  'action.call': 'फोन करा',
  'action.video': 'व्हिडिओ सल्ला',
  'action.directions': 'रस्ता दाखवा',
  'action.requestAmbulance': 'रुग्णवाहिका मागवा',
  'action.message': 'संदेश',
  'action.register': 'नोंदणी करा',
  'action.viewRecord': 'नोंद पहा',
  'action.track': 'संदर्भ पहा',
  'action.findNearby': 'जवळ शोधा',
  'action.viewFollowUp': 'फॉलो-अप पहा',
  'action.markTaken': 'घेतले',
  'action.skip': 'वगळा',
  'action.viewPrescription': 'प्रिस्क्रिप्शन पहा',
  'action.retry': 'पुन्हा प्रयत्न करा',

  'emergency.title': 'आपत्कालीन स्थिती',
  'emergency.subtitle': 'डेमो आपत्कालीन प्रक्रिया - खरी रुग्णवाहिका पाठवली जात नाही.',
  'emergency.nearestAmbulance': 'सर्वात जवळची उपलब्ध रुग्णवाहिका',
  'emergency.nearestHospital': 'सर्वात जवळचे आपत्कालीन रुग्णालय',
  'emergency.ashaWorker': 'आशा सेविका',
  'emergency.eta': 'पोहोचण्याची वेळ',
  'emergency.away': 'अंतरावर',
  'emergency.none': 'सध्या कोणतीही डेमो रुग्णवाहिका मोकळी नाही.',

  'risk.low': 'कमी',
  'risk.medium': 'मध्यम',
  'risk.high': 'जास्त',
  'risk.level': 'धोका पातळी',
  'symptom.possibleCauses': 'संभाव्य कारणे',
  'symptom.notDiagnosis': 'ही फक्त संभाव्य कारणे आहेत - निश्चित निदान नाही.',
  'symptom.whatToDo': 'आता काय करावे',
  'symptom.noPrescription': 'RuralCare AI कधीही औषध लिहून देत नाही. ते फक्त डॉक्टर करू शकतात.',

  'empty.noDoctors': 'सध्या कोणताही डॉक्टर उपलब्ध नाही.',
  'empty.noAmbulance': 'सध्या रुग्णवाहिका उपलब्ध नाही.',
  'empty.noMedicine': 'हे औषध जवळच्या कोणत्याही केंद्रात साठ्यात नाही.',
  'empty.noTest': 'ही तपासणी जवळच्या कोणत्याही केंद्रात उपलब्ध नाही.',
  'empty.noReferral': 'तुमचा कोणताही संदर्भ नाही.',
  'empty.noFollowUp': 'तुमचा कोणताही फॉलो-अप बाकी नाही.',
  'empty.generic': 'दाखवण्यासाठी काहीही नाही.',

  'error.title': 'काहीतरी चूक झाली',
  'error.body': 'हा भाग लोड होऊ शकला नाही. पुन्हा प्रयत्न करा.',
}

const DICTS: Record<Language, Dict> = { en, hi, mr }

export function translate(
  language: Language,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = DICTS[language][key] ?? DICTS.en[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
}

/** Hook form: `const t = useT(); t('home.question')`. */
export function useT() {
  const language = useAppStore((s) => s.language)
  return (key: string, vars?: Record<string, string | number>) => translate(language, key, vars)
}

export function useLanguage(): Language {
  return useAppStore((s) => s.language)
}

export function speechTagFor(language: Language): string {
  return LANGUAGES.find((l) => l.code === language)?.speechTag ?? 'en-IN'
}
