# RuralCare AI

A voice-first **web application** for rural healthcare access and coordination.

A patient does not have to learn a healthcare website. They type or speak one
sentence — in Hindi, English or Marathi — and the assistant takes them straight
to the action: a doctor, an ambulance, a test, a medicine, their record, a
referral, a follow-up or a health alert.

> **This is a prototype with fictional demo data.** It is not connected to real
> emergency services, real facilities, real government datasets or any real
> patient record. Every phone call, ambulance dispatch, video consultation,
> weather reading, public-health alert and data sync is simulated inside the
> browser and labelled as such in the UI.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Dev server with HMR                                 |
| `npm run build`     | Type-check (`tsc -b`) then production build          |
| `npm run preview`   | Serve the production build locally                   |
| `npm run typecheck` | Full TypeScript check                                |
| `npm run lint`      | oxlint                                               |
| `npm test`          | Vitest suite (124 tests: logic, routes, UI journeys) |

No configuration is needed. There is no backend and no API key — see
[Optional configuration](#optional-configuration).

When deploying the production build to static hosting, enable SPA fallback
(rewrite unknown paths to `index.html`) so deep links like `/asha/referrals`
work.

---

## Demo accounts

Switch role from the account button in the header. Each role sees only what it
is authorised to see.

| Account                        | Role                | What to look at                                     |
| ------------------------------ | ------------------- | --------------------------------------------------- |
| **Ramesh Singh**, 42           | Patient             | The assistant, emergency mode, record, reminders    |
| **Dr. Arjun Mehta**            | Doctor (Kalyanpur PHC) | Consultation notes, prescriptions, referrals     |
| **Dr. Imran Sheikh**           | Doctor (Medical College) | The receiving side of a referral                |
| **Sunita Kumari**              | ASHA worker         | Patients, households, offline mode, follow-ups      |
| **Kalyanpur PHC Desk**         | Facility staff      | Resource management                                 |
| **Shivpur District Hospital**  | Facility staff      | Incoming emergencies and referrals                  |
| **District Health Office**     | Admin / government  | Analytics, demand map, public-health alerts         |

Settings (⚙️) has **Reset demo data**, the language switch, **Simulate offline**
and **Low connectivity mode**.

---

## Try these

Type or speak any of these on the home page:

- `Mujhe doctor se baat karni hai` → available doctors with Call / Video
- `Ambulance chahiye` → emergency mode with ambulance, hospital, ASHA
- `Mujhe 2 din se bukhar aur khansi hai` → one question at a time, then
  possible causes + risk level + next steps
- `MRI kahan hoga?` → test finder already filtered to MRI
- `Ye medicine kahan milegi?` → stock by facility, distance, last updated
- `Kal follow-up hai kya?` → the patient's follow-up list
- `Abhi bahut garmi hai, kya precaution lena chahiye?` → heat precautions
- `Mere area mein koi disease fail rahi hai kya?` → demo public-health alert
- `मला डॉक्टरांशी बोलायचे आहे` / `I need an ambulance` → same routing

---

## The connected workflows

Nothing here is a static screen. Each arrow is real state moving between roles.

```
Doctor writes a prescription      → patient's medicine reminder schedule
Doctor/ASHA creates a referral    → facility inbox + ASHA task + patient tracker
Referral not reached by due date  → "Referral follow-up required" alert to ASHA
ASHA marks patient reached        → status advances, drop-off flag clears
Patient requests an ambulance     → ambulance goes busy + hospital pre-arrival alert
Hospital completes the case       → ambulance becomes available again
Facility/admin changes a resource → patient-side availability changes immediately
Admin publishes an alert          → notifications to patients + ASHAs in those villages
Patient/ASHA registers for a camp → visible to ASHA and the organising facility
ASHA acts while offline           → queued → syncing → synced (IndexedDB)
```

---

## Architecture

```
src/
  types/          One domain model for the whole app
  data/           catalog.ts (tests, medicines, vaccines) + seed.ts (the demo dataset)
  store/
    useAppStore   Single zustand store: entities + every workflow action
    selectors     Pure derivations (availability, buckets, filters)
  services/
    ai/
      intents     Multilingual intent catalogue + boundary-aware matcher
      symptomEngine  Conversational triage (possible causes + risk, never a diagnosis)
      router      Intent → reply + action cards + route (with context)
      remote      Optional hosted classifier, falls back to on-device rules
      decisionSupport  Record summary, care level, follow-up risk, demand, pressure
    permissions   Role-based access + patient consent
    medications   Prescription → schedule → dose timeline
    offline/db    IndexedDB wrapper with a localStorage fallback
    connectivity  Online/offline, low-data mode, prototype sync
    reminders     Fires a reminder when a dose falls due
    i18n          en / hi / mr
  components/
    ui/           Design system (buttons, cards, badges, dialog, tabs, forms,
                  tables, timeline, charts, toasts, empty/loading/error states)
    cards/        Doctor, facility, ambulance, medicine, test, vaccine, camp,
                  kiosk, ASHA, referral, follow-up, dose, alert cards
    ai/           Chat surface, action-card renderer, triage card
    record/       One record view, reused by patient, doctor and ASHA
  pages/          patient / doctor / asha / facility / admin
```

### Design decisions worth knowing

**One store, one dataset.** Every dashboard reads the same store, which is why a
resource change by an admin is visible to a patient on the next render. State
persists to `localStorage` so a refresh keeps the demo going.

**The AI layer is deterministic by default.** A rule-based multilingual router
runs entirely on the device, so the demo works with no key, no server and no
network — which is the point in a village with neither. Keywords cover
Devanagari *and* Roman transliteration, because rural users type Hinglish.
Short latin abbreviations are matched on word boundaries; a naive
`includes('ct')` matches "do**ct**or" and hijacks a doctor request into a CT
scan (there is a regression test for exactly this).

**Safety is structural, not cosmetic.**

- The symptom assistant returns *possible causes* and a *risk band*, never a
  diagnosis, and never names a medicine or a dose.
- Medication schedules are built only from a doctor's prescription; the dose
  string is stored and displayed verbatim. Reminder *times* default from the
  frequency and the doctor can override them.
- Emergency red-flag detection and the symptom conversation always run locally
  before any network call, so a remote classifier can never delay them.
- AI features on the doctor and admin screens are labelled *decision support*
  and only summarise or rank data a human then acts on.

**Role-based access is enforced in one place.** `services/permissions.ts` gates
each record section on two conditions: the role may see that kind of
information, *and* the patient's consent covers that viewer. Denied sections say
so out loud rather than quietly disappearing. Admin accounts never see an
identifiable patient record — only aggregates.

**Charts are hand-rolled SVG/CSS.** No chart library, so the initial JS payload
stays around 100 kB gzipped for low-bandwidth users. Role dashboards are
code-split.

**Every simulated action explains itself.** Calls, messages, directions and
video controls open a dialog stating what would happen in a real deployment and
which integration would do it.

---

## Optional configuration

Copy `.env.example` to `.env` only if you want to plug in a hosted intent
classifier. Everything works without it.

```
VITE_AI_ROUTER_URL=https://your-backend.example.com/api/intent
VITE_AI_ROUTER_TIMEOUT_MS=2500
```

Contract: `POST { text, language } → { intent, entities? }`. On timeout, error
or an unknown intent the app falls back to the on-device router. **Never put a
model API key in a `VITE_` variable** — those are bundled into the client. Point
the URL at your own backend and keep the credential there.

---

## Prototype-only integrations

| Area                 | Prototype behaviour                                            | Ready for                        |
| -------------------- | -------------------------------------------------------------- | -------------------------------- |
| Ambulance dispatch   | Nearest free demo ambulance assigned; state machine and ETA    | 108/102 dispatch API             |
| Phone / SMS          | Dialog explaining what would be dialled or sent                | Device dialler, SMS/IVR gateway  |
| Video consultation   | Placeholder room with the real state machine and record output | WebRTC media layer               |
| Directions           | Dialog with the facility address on record                     | Maps deep link                   |
| Weather              | Fixed per-village demo readings                                | Weather service                  |
| Public-health alerts | Admin-authored, badged "Demo public health alert"              | District health authority feed   |
| Sync                 | Queue drains through a labelled in-browser simulation          | Real backend sync                |
| Intent routing       | On-device rules                                                | Hosted classifier (see above)    |

---

## Testing

```bash
npm test
```

124 tests across three layers:

- **`services/ai/router.test.ts`** — intent routing in all three languages,
  emergency pre-emption, entity extraction, the one-question-at-a-time symptom
  conversation, and the safety invariants.
- **`store/workflows.test.ts`** — the connected workflows end to end at the
  state layer: prescription → schedule → dose logs, referral progression,
  drop-off detection and escalation, emergency dispatch and ambulance release,
  every resource propagation, alerts, camps, the offline queue and sync, plus
  role/consent access and demo-data referential integrity.
- **`test/routes.test.tsx`** and **`test/flows.test.tsx`** — every route mounted
  in jsdom asserting no console errors, role guards, and the spec's demo
  scenarios driven through the real UI (typing into the assistant, writing a
  prescription as a doctor and seeing the patient's reminder, accepting a
  referral, preparing an incoming emergency, publishing an alert, registering
  for a camp, going offline and syncing).

---

## Known limitations

- Distances, ETAs, stock levels, bed occupancy and weather are fictional
  constants, not computed from geography or live feeds.
- Voice input uses the browser Web Speech API. Where it is unavailable
  (Firefox, many Android WebViews) the UI says so and text input carries on —
  nothing is faked as "heard".
- Data lives in this browser only. There is no server, no account system and no
  cross-device sync; "Reset demo data" restores the seeded dataset.
- The demand map is a comparative visualisation, not a geographic map.
- Village "healthcare access" is a demo indicator computed from this dataset,
  explicitly not an official government metric.
