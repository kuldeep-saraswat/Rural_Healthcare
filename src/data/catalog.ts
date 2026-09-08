import type { MedicineCatalogItem, TestCatalogItem, VaccineCatalogItem } from '@/types'

/**
 * Catalogues of tests, medicines and vaccines the demo facilities can stock.
 * `aliases` feed the AI intent router so "sugar test", "shugar jaanch" and
 * "रक्तातील साखर" all resolve to the same catalogue entry.
 */

export const TEST_CATALOG: TestCatalogItem[] = [
  {
    id: 't_mri',
    name: 'MRI Scan',
    shortName: 'MRI',
    category: 'imaging',
    aliases: ['mri', 'mri scan', 'em aar aai', 'एमआरआई', 'एम आर आई'],
    typicalPriceInr: 3500,
  },
  {
    id: 't_ct',
    name: 'CT Scan',
    shortName: 'CT',
    category: 'imaging',
    aliases: ['ct', 'ct scan', 'cat scan', 'सीटी', 'सिटी स्कॅन'],
    typicalPriceInr: 2200,
  },
  {
    id: 't_xray',
    name: 'X-Ray (Chest)',
    shortName: 'X-Ray',
    category: 'imaging',
    aliases: ['x ray', 'xray', 'x-ray', 'chest xray', 'एक्स रे', 'छाती का एक्स रे'],
    typicalPriceInr: 250,
  },
  {
    id: 't_usg',
    name: 'Ultrasound (Sonography)',
    shortName: 'USG',
    category: 'imaging',
    aliases: ['ultrasound', 'sonography', 'usg', 'sonografi', 'सोनोग्राफी', 'अल्ट्रासाउंड'],
    typicalPriceInr: 700,
  },
  {
    id: 't_cbc',
    name: 'CBC (Complete Blood Count)',
    shortName: 'CBC',
    category: 'pathology',
    aliases: ['cbc', 'complete blood count', 'blood count', 'khoon ki jaanch', 'सीबीसी'],
    typicalPriceInr: 200,
  },
  {
    id: 't_sugar',
    name: 'Blood Sugar (Fasting)',
    shortName: 'Blood Sugar',
    category: 'pathology',
    aliases: ['blood sugar', 'sugar test', 'shugar', 'sugar ki jaanch', 'शुगर', 'रक्तातील साखर'],
    typicalPriceInr: 80,
  },
  {
    id: 't_lipid',
    name: 'Lipid Profile',
    shortName: 'Lipid Profile',
    category: 'pathology',
    aliases: ['lipid', 'lipid profile', 'cholesterol', 'कोलेस्ट्रॉल'],
    typicalPriceInr: 450,
  },
  {
    id: 't_hb',
    name: 'Haemoglobin (Hb)',
    shortName: 'Hb',
    category: 'pathology',
    aliases: ['hb', 'haemoglobin', 'hemoglobin', 'khoon kami', 'हीमोग्लोबिन'],
    typicalPriceInr: 60,
  },
  {
    id: 't_dengue',
    name: 'Dengue NS1 / Malaria Smear',
    shortName: 'Dengue / Malaria',
    category: 'pathology',
    aliases: ['dengue', 'malaria', 'dengu', 'डेंगू', 'मलेरिया'],
    typicalPriceInr: 400,
  },
  {
    id: 't_sputum',
    name: 'Sputum Test (TB)',
    shortName: 'Sputum TB',
    category: 'pathology',
    aliases: ['sputum', 'tb test', 'balgam', 'टीबी जांच', 'थुंकी तपासणी'],
    typicalPriceInr: 0,
  },
  {
    id: 't_ecg',
    name: 'ECG',
    shortName: 'ECG',
    category: 'cardiology',
    aliases: ['ecg', 'ekg', 'heart test', 'dil ki jaanch', 'ईसीजी'],
    typicalPriceInr: 150,
  },
  {
    id: 't_echo',
    name: 'Echocardiography',
    shortName: 'Echo',
    category: 'cardiology',
    aliases: ['echo', 'echocardiography', '2d echo', 'इको'],
    typicalPriceInr: 1400,
  },
  {
    id: 't_bp',
    name: 'Blood Pressure Screening',
    shortName: 'BP Check',
    category: 'screening',
    aliases: ['bp', 'blood pressure', 'bp check', 'बीपी', 'रक्तदाब'],
    typicalPriceInr: 0,
  },
]

export const MEDICINE_CATALOG: MedicineCatalogItem[] = [
  {
    id: 'm_para',
    name: 'Paracetamol 500 mg',
    generic: 'Paracetamol',
    form: 'tablet',
    aliases: ['paracetamol', 'pcm', 'crocin', 'bukhar ki dawa', 'पैरासिटामोल', 'पॅरासिटामॉल'],
  },
  {
    id: 'm_amlo',
    name: 'Amlodipine 5 mg',
    generic: 'Amlodipine',
    form: 'tablet',
    aliases: ['amlodipine', 'amlo', 'bp ki dawa', 'एम्लोडिपिन'],
  },
  {
    id: 'm_metf',
    name: 'Metformin 500 mg',
    generic: 'Metformin',
    form: 'tablet',
    aliases: ['metformin', 'sugar ki dawa', 'मेटफॉर्मिन'],
  },
  {
    id: 'm_ors',
    name: 'ORS Sachet',
    generic: 'Oral Rehydration Salts',
    form: 'syrup',
    aliases: ['ors', 'oral rehydration', 'nimbu pani powder', 'ओआरएस'],
  },
  {
    id: 'm_iron',
    name: 'Iron & Folic Acid',
    generic: 'Ferrous sulphate + Folic acid',
    form: 'tablet',
    aliases: ['iron', 'ifa', 'folic acid', 'iron tablet', 'आयरन', 'लोह गोळी'],
  },
  {
    id: 'm_amox',
    name: 'Amoxicillin 500 mg',
    generic: 'Amoxicillin',
    form: 'capsule',
    aliases: ['amoxicillin', 'amoxy', 'एमोक्सिसिलिन'],
  },
  {
    id: 'm_atorva',
    name: 'Atorvastatin 10 mg',
    generic: 'Atorvastatin',
    form: 'tablet',
    aliases: ['atorvastatin', 'statin', 'एटोरवास्टेटिन'],
  },
  {
    id: 'm_salb',
    name: 'Salbutamol Inhaler',
    generic: 'Salbutamol',
    form: 'ointment',
    aliases: ['salbutamol', 'inhaler', 'pump', 'इनहेलर'],
  },
  {
    id: 'm_cetriz',
    name: 'Cetirizine 10 mg',
    generic: 'Cetirizine',
    form: 'tablet',
    aliases: ['cetirizine', 'allergy tablet', 'सिट्रीजिन'],
  },
  {
    id: 'm_ranit',
    name: 'Pantoprazole 40 mg',
    generic: 'Pantoprazole',
    form: 'tablet',
    aliases: ['pantoprazole', 'acidity ki dawa', 'gas ki goli', 'पैंटोप्राजोल'],
  },
]

export const VACCINE_CATALOG: VaccineCatalogItem[] = [
  {
    id: 'v_mr',
    name: 'Measles-Rubella (MR)',
    eligibility: 'Children: 9-12 months (dose 1), 16-24 months (dose 2)',
    doses: 2,
    aliases: ['mr', 'measles', 'rubella', 'khasra', 'खसरा', 'गोवर'],
  },
  {
    id: 'v_penta',
    name: 'Pentavalent',
    eligibility: 'Infants: 6, 10 and 14 weeks',
    doses: 3,
    aliases: ['pentavalent', 'penta', 'पेंटावेलेंट'],
  },
  {
    id: 'v_opv',
    name: 'Oral Polio Vaccine (OPV)',
    eligibility: 'Birth, 6, 10, 14 weeks',
    doses: 4,
    aliases: ['polio', 'opv', 'पोलियो'],
  },
  {
    id: 'v_bcg',
    name: 'BCG',
    eligibility: 'At birth',
    doses: 1,
    aliases: ['bcg', 'बीसीजी'],
  },
  {
    id: 'v_td',
    name: 'Td (Tetanus-Diphtheria)',
    eligibility: 'Pregnant women, adolescents 10 & 16 years',
    doses: 2,
    aliases: ['td', 'tt', 'tetanus', 'टिटनेस', 'धनुर्वात'],
  },
  {
    id: 'v_flu',
    name: 'Seasonal Influenza',
    eligibility: 'Elderly 60+, pregnant women, chronic illness',
    doses: 1,
    aliases: ['flu', 'influenza', 'फ्लू'],
  },
  {
    id: 'v_rabies',
    name: 'Anti-Rabies Vaccine',
    eligibility: 'After animal bite - as advised',
    doses: 4,
    aliases: ['rabies', 'dog bite', 'kutta katna', 'रेबीज'],
  },
]

export const testById = (id: string) => TEST_CATALOG.find((t) => t.id === id)
export const medicineById = (id: string) => MEDICINE_CATALOG.find((m) => m.id === id)
export const vaccineById = (id: string) => VACCINE_CATALOG.find((v) => v.id === id)
