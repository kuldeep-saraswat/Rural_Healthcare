import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { useAppStore } from '@/store/useAppStore'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

/** Renders a route and fails if React logged an error or the screen is blank. */
async function expectRouteRenders(path: string, expectedText: RegExp) {
  const errors: unknown[][] = []
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args)
  })
  renderAt(path)
  await waitFor(
    () => {
      expect(screen.getAllByText(expectedText).length).toBeGreaterThan(0)
    },
    { timeout: 4000 },
  )
  spy.mockRestore()
  const realErrors = errors.filter(
    (args) => !String(args[0] ?? '').includes('Not implemented'),
  )
  expect(realErrors, `console.error while rendering ${path}`).toHaveLength(0)
}

const PATIENT_ROUTES: [string, RegExp][] = [
  ['/', /Namaste/i],
  ['/ai', /What you can ask/i],
  ['/emergency', /EMERGENCY MODE/i],
  ['/nearby', /Nearby Healthcare/i],
  ['/doctors', /Available Doctors Now/i],
  ['/consult/d_arjun', /Consultation with Dr\. Arjun Mehta/i],
  ['/records', /Digital Health Record/i],
  ['/referrals', /My referrals/i],
  ['/follow-ups', /My follow-ups/i],
  ['/medications', /Medicine reminders/i],
  ['/medicines', /Medicine availability/i],
  ['/tests', /Test finder/i],
  ['/vaccines', /Vaccination/i],
  ['/camps', /Medical camps/i],
  ['/kiosks', /Village health kiosk/i],
  ['/asha-contact', /ASHA worker/i],
  ['/preventive', /Preventive care/i],
  ['/alerts', /Health .{0,3}environment alerts/i],
  ['/village', /village health access/i],
  ['/profile', /Profile/i],
  ['/assisted', /Assisted healthcare mode/i],
  ['/no-such-page', /Page not found/i],
]

describe('Every patient route renders', () => {
  for (const [path, text] of PATIENT_ROUTES) {
    it(`renders ${path}`, async () => {
      await expectRouteRenders(path, text)
    })
  }
})

describe('Every role dashboard renders for its own role', () => {
  const cases: [string, string, RegExp][] = [
    ['u_arjun', '/doctor', /Doctor dashboard/i],
    ['u_arjun', '/doctor/emergencies', /Emergency cases/i],
    ['u_arjun', '/doctor/referrals', /Referrals/i],
    ['u_arjun', '/doctor/patient/p_ramesh', /Ramesh Singh/i],
    ['u_sunita', '/asha', /ASHA dashboard/i],
    ['u_sunita', '/asha/patients', /My patients/i],
    ['u_sunita', '/asha/households', /My households/i],
    ['u_sunita', '/asha/referrals', /Referrals/i],
    ['u_sunita', '/asha/follow-ups', /Follow-ups/i],
    ['u_sunita', '/asha/preventive', /Preventive care/i],
    ['u_sunita', '/asha/camps', /Medical camps/i],
    ['u_sunita', '/asha/nearby', /Nearby healthcare/i],
    ['u_sunita', '/asha/offline', /Offline data/i],
    ['u_sunita', '/asha/alerts', /Health alerts/i],
    ['u_hospital', '/facility', /Facility dashboard/i],
    ['u_hospital', '/facility/resources', /Resource management/i],
    ['u_hospital', '/facility/referrals', /Incoming referrals/i],
    ['u_hospital', '/facility/emergency', /Emergency alerts/i],
    ['u_hospital', '/facility/camps', /Medical camps/i],
    ['u_admin', '/admin', /admin dashboard/i],
    ['u_admin', '/admin/demand', /Healthcare demand map/i],
    ['u_admin', '/admin/resources', /Resource controls/i],
    ['u_admin', '/admin/referrals', /Referral analytics/i],
    ['u_admin', '/admin/alerts', /Public health alerts/i],
    ['u_admin', '/admin/camps', /Medical camps/i],
  ]

  for (const [userId, path, text] of cases) {
    it(`renders ${path} as ${userId}`, async () => {
      useAppStore.getState().login(userId)
      await expectRouteRenders(path, text)
    })
  }
})

describe('Role guards', () => {
  it('blocks the admin dashboard for a patient account', async () => {
    renderAt('/admin')
    await waitFor(() => {
      expect(screen.getByText(/Not available for this role/i)).toBeTruthy()
    })
    // No analytics leaked onto the page.
    expect(screen.queryByText(/Healthcare demand/i)).toBeNull()
  })

  it('blocks the ASHA dashboard for a doctor account', async () => {
    useAppStore.getState().login('u_arjun')
    renderAt('/asha')
    await waitFor(() => {
      expect(screen.getByText(/Not available for this role/i)).toBeTruthy()
    })
  })
})

describe('Patient home page', () => {
  it('leads with the assistant and carries no marketing sections', async () => {
    renderAt('/')
    await waitFor(() => {
      expect(screen.getByText(/Namaste Ramesh/i)).toBeTruthy()
    })
    // The assistant is present and prominent.
    expect(screen.getByRole('region', { name: /health assistant/i })).toBeTruthy()
    expect(screen.getByPlaceholderText(/Type karein|Type here|येथे लिहा/i)).toBeTruthy()

    // No marketing furniture anywhere on the page.
    for (const banned of [
      /why choose us/i,
      /pricing/i,
      /testimonial/i,
      /sign up free/i,
      /trusted by/i,
      /get started for free/i,
    ]) {
      expect(screen.queryByText(banned)).toBeNull()
    }
  })

  it('shows the standing prototype disclaimer and a visible emergency action', async () => {
    renderAt('/')
    await waitFor(() => {
      expect(screen.getAllByText(/prototype/i).length).toBeGreaterThan(0)
    })
    const emergencyLinks = screen.getAllByRole('link', { name: /emergency|आपत्काल/i })
    expect(emergencyLinks.length).toBeGreaterThan(0)
  })
})

describe('Voice input fallback', () => {
  it('keeps text input working and says voice is unavailable in this browser', async () => {
    const { getByRole } = renderAt('/ai')
    await waitFor(() => {
      expect(screen.getByText(/What you can ask/i)).toBeTruthy()
    })
    // jsdom has no SpeechRecognition, so the button must explain, not crash.
    const speakButton = getByRole('button', { name: /Bolkar batayein|Speak|बोलून/i })
    speakButton.click()
    await waitFor(() => {
      expect(screen.getAllByText(/voice input|Voice/i).length).toBeGreaterThan(0)
    })
    // Text input is still usable.
    expect(screen.getByPlaceholderText(/Type karein|Type here|येथे लिहा/i)).toBeTruthy()
  })
})

describe('Emergency page reflects live ambulance state', () => {
  it('shows the empty state when every demo ambulance is busy', async () => {
    const store = useAppStore.getState()
    for (const ambulance of store.ambulances) store.setAmbulanceStatus(ambulance.id, 'busy')
    renderAt('/emergency')
    await waitFor(() => {
      expect(screen.getByText(/koi demo ambulance khaali nahi|No demo ambulance/i)).toBeTruthy()
    })
  })

  it('offers the request-ambulance action when one is free', async () => {
    renderAt('/emergency')
    await waitFor(() => {
      expect(screen.getByText(/EMERGENCY MODE/i)).toBeTruthy()
    })
    expect(
      screen.getAllByRole('button', { name: /AMBULANCE MANGWAYEIN|REQUEST AMBULANCE|रुग्णवाहिका मागवा/i })
        .length,
    ).toBeGreaterThan(0)
  })
})

describe('Language switching', () => {
  it('re-renders the patient home page in Marathi and English', async () => {
    renderAt('/')
    await waitFor(() => {
      expect(screen.getAllByText(/Aapko kis cheez mein madad chahiye/i).length).toBeGreaterThan(0)
    })

    useAppStore.getState().setLanguage('mr')
    await waitFor(() => {
      expect(screen.getAllByText(/तुम्हाला कशात मदत हवी आहे/).length).toBeGreaterThan(0)
    })

    useAppStore.getState().setLanguage('en')
    await waitFor(() => {
      expect(screen.getAllByText(/What do you need help with/i).length).toBeGreaterThan(0)
    })
  })
})

describe('Facility resource change is visible to the patient side', () => {
  it('removes a doctor from the patient list when the facility marks them unavailable', async () => {
    renderAt('/doctors')
    await waitFor(() => {
      expect(screen.getByText(/Dr\. Arjun Mehta/)).toBeTruthy()
    })

    useAppStore.getState().setDoctorStatus('d_arjun', 'unavailable')
    await waitFor(() => {
      expect(screen.queryByText(/Dr\. Arjun Mehta/)).toBeNull()
    })
  })
})

describe('Health record respects role', () => {
  it('shows doctor notes to the treating doctor and hides them from the ASHA worker', async () => {
    useAppStore.getState().login('u_arjun')
    const doctorView = renderAt('/doctor/patient/p_ramesh')
    await waitFor(() => {
      expect(screen.getAllByText(/Consultation notes/i).length).toBeGreaterThan(0)
    })
    doctorView.unmount()

    useAppStore.getState().login('u_sunita')
    renderAt('/asha/patients')
    await waitFor(() => {
      expect(screen.getAllByText(/My patients/i).length).toBeGreaterThan(0)
    })
    const row = screen.getByText('Ramesh Singh').closest('td')
    expect(row).toBeTruthy()
    within(row!.parentElement as HTMLElement)
      .getByRole('button', { name: /^Record$/ })
      .click()
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    const dialog = screen.getByRole('dialog')
    // The ASHA record view offers screenings but not the doctor-notes tab content.
    expect(within(dialog).getByRole('tab', { name: /Consultations/i })).toBeTruthy()
    within(dialog).getByRole('tab', { name: /Consultations/i }).click()
    await waitFor(() => {
      expect(within(dialog).queryByText(/Doctor assessment/i)).toBeNull()
    })
  })
})

describe('Admin dashboard sections', () => {
  it('surfaces demand, shortages, referral analytics and actionable alerts', async () => {
    useAppStore.getState().login('u_admin')
    // Create a shortage the alerts section must pick up.
    useAppStore.getState().setFacilityMedicineStatus('f_phc_kalyanpur', 'm_para', 'out')
    useAppStore.getState().setDoctorStatus('d_anita', 'unavailable')

    renderAt('/admin')
    await waitFor(
      () => {
        expect(screen.getAllByText(/Healthcare demand/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    for (const section of [
      /Resource availability/i,
      /Referral analytics/i,
      /Hospital analytics/i,
      /Medical camp analytics/i,
      /Preventive healthcare/i,
      /Village accessibility/i,
      /^Alerts$/,
    ]) {
      expect(screen.getAllByText(section).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText(/Doctor shortage/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Medicine shortage/i).length).toBeGreaterThan(0)
    // Privacy: aggregates only, no identifiable patient record.
    expect(screen.getAllByText(/never see an identifiable patient record/i).length).toBeGreaterThan(
      0,
    )
  })
})
