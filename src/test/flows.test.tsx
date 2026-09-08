import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

/** Types into the assistant and submits, the way a patient would. */
async function askAssistant(text: string) {
  const input = await waitFor(() =>
    screen.getByPlaceholderText(/Type karein|Type here|येथे लिहा/i),
  )
  fireEvent.change(input, { target: { value: text } })
  const sendButton = screen.getByRole('button', { name: /Bhejein|Send|पाठवा/i })
  fireEvent.click(sendButton)
}

describe('Scenario 1 - "Mujhe doctor se baat karni hai" through the UI', () => {
  it('shows available doctors with Call and Video Consultation actions', async () => {
    renderAt('/')
    await askAssistant('Mujhe doctor se baat karni hai')

    await waitFor(
      () => {
        expect(screen.getAllByText(/Dr\. Arjun Mehta/).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    expect(screen.getAllByText(/Abhi available doctors dekh raha hoon/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Call karein|^Call$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Video Consultation/i }).length).toBeGreaterThan(0)
  })
})

describe('Scenario 2 - "Ambulance chahiye" through the UI', () => {
  it('switches to emergency mode with ambulance, hospital and ASHA details', async () => {
    renderAt('/')
    await askAssistant('Ambulance chahiye')

    // The assistant navigates the patient straight into emergency mode.
    await waitFor(
      () => {
        expect(screen.getAllByText(/EMERGENCY MODE/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    expect(screen.getAllByText(/Ambulance 108-A1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ETA|Pahunchne ka samay/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kalyanpur Primary Health Centre|Rampur Community/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Sunita Kumari/).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { name: /AMBULANCE MANGWAYEIN|REQUEST AMBULANCE/i }).length,
    ).toBeGreaterThan(0)
  })

  it('runs the full demo dispatch: request -> assigned -> hospital alerted', async () => {
    renderAt('/emergency')
    await waitFor(() => {
      expect(screen.getAllByText(/EMERGENCY MODE/i).length).toBeGreaterThan(0)
    })
    const requestButton = screen.getAllByRole('button', {
      name: /AMBULANCE MANGWAYEIN|REQUEST AMBULANCE/i,
    })[0]
    fireEvent.click(requestButton)

    await waitFor(() => {
      expect(screen.getAllByText(/Hospital pre-arrival alert sent/i).length).toBeGreaterThan(0)
    })
    // Honest labelling of the simulated dispatch.
    expect(screen.getAllByText(/no real ambulance has been dispatched/i).length).toBeGreaterThan(0)

    const request = useAppStore.getState().emergencyRequests[0]
    expect(request.ambulanceId).toBeTruthy()
    expect(request.destinationFacilityId).toBeTruthy()
  })
})

describe('Scenario 3 - symptoms through the UI', () => {
  it('asks questions one at a time then shows possible causes and a risk level', async () => {
    renderAt('/ai')
    await askAssistant('Mujhe 2 din se bukhar aur khansi hai')

    // First a single conversational question, no result yet.
    await waitFor(
      () => {
        expect(screen.getAllByText(/Bukhar kitna hai/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    expect(screen.queryByRole('heading', { name: /Sambhavit Kaaran/i })).toBeNull()

    // Answer each question until the assistant is satisfied.
    for (const answer of ['halka', 'halki', 'nahi']) {
      const input = screen.getByPlaceholderText(/Type karein|Type here|येथे लिहा/i)
      fireEvent.change(input, { target: { value: answer } })
      fireEvent.click(screen.getByRole('button', { name: /Bhejein|Send|पाठवा/i }))
      await waitFor(() => {
        expect(screen.queryByText(/Thinking/i)).toBeNull()
      })
    }

    await waitFor(
      () => {
        expect(screen.getAllByText(/Sambhavit Kaaran/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    // A risk band, next steps and the safety disclaimer - never a diagnosis.
    expect(screen.getAllByText(/Risk Level: (KAM|MADHYAM|ZYADA)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Ab kya karein/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pakki bimari ki pehchaan nahi/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/kabhi dawa nahi likhta/i).length).toBeGreaterThan(0)
  })
})

describe('Scenario 4 - "MRI kahan hoga?" opens a pre-filtered test finder', () => {
  it('lands on the test finder already searching for MRI', async () => {
    renderAt('/')
    await askAssistant('MRI kahan hoga?')

    await waitFor(
      () => {
        expect(screen.getAllByText(/Test finder/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    const search = screen.getByLabelText(/Which test do you need/i) as HTMLInputElement
    expect(search.value).toBe('MRI')
    expect(screen.getAllByText(/MRI Scan/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Government Medical College, Shivpur/).length).toBeGreaterThan(0)
  })
})

describe('Scenario 5 - medicine availability through the UI', () => {
  it('opens the medicine finder with stock status and facility distance', async () => {
    renderAt('/')
    await askAssistant('Paracetamol kahan milegi?')

    await waitFor(
      () => {
        expect(screen.getAllByText(/Medicine availability/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    expect(screen.getAllByText(/Paracetamol 500 mg/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Available|Low stock|Out of stock/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/km/).length).toBeGreaterThan(0)
  })
})

describe('Scenario 6 - follow-up question through the UI', () => {
  it('answers with the patient follow-up list', async () => {
    renderAt('/')
    await askAssistant('Kal follow-up hai kya?')

    await waitFor(
      () => {
        expect(screen.getAllByText(/My follow-ups/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )
    expect(
      screen.getAllByText(/Cardiology review after echo|Household visit and health check/i).length,
    ).toBeGreaterThan(0)
  })
})

describe('Scenario 9 - doctor prescription creates the patient reminder (full round trip)', () => {
  it('writes a prescription as the doctor and shows the reminder to the patient', async () => {
    useAppStore.getState().login('u_arjun')
    const doctorView = renderAt('/doctor/patient/p_ramesh')

    await waitFor(() => {
      expect(screen.getAllByRole('tab', { name: /Prescription/i }).length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('tab', { name: /^Prescription$/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Medicine name/i)).toBeTruthy()
    })
    fireEvent.change(screen.getByLabelText(/Medicine name/i), {
      target: { value: 'Paracetamol 500 mg' },
    })
    fireEvent.change(screen.getByLabelText(/^Dose/i), { target: { value: '1 tablet' } })
    fireEvent.change(screen.getByLabelText(/Frequency/i), { target: { value: 'tds' } })
    fireEvent.change(screen.getByLabelText(/Duration \(days\)/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /Save prescription/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/reminders created/i).length).toBeGreaterThan(0)
    })
    doctorView.unmount()

    // The patient now has a schedule built from exactly that dose.
    useAppStore.getState().login('u_ramesh')
    renderAt('/medications')
    await waitFor(() => {
      expect(screen.getAllByText(/Medicine reminders/i).length).toBeGreaterThan(0)
    })
    const doseCards = screen.getAllByText(/Paracetamol 500 mg/)
    expect(doseCards.length).toBeGreaterThan(0)
    expect(screen.getAllByText(/1 tablet/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2:00 PM/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Le li|Mark as Taken/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Prescription dekhein|View Prescription/i }).length,
    ).toBeGreaterThan(0)
  })
})

describe('Scenario 10 - referral accepted by the facility, visible to the patient', () => {
  it('advances the referral from the facility dashboard', async () => {
    // Sunil's seeded referral is still at "created".
    useAppStore.getState().login('u_hospital')
    const facilityView = renderAt('/facility/referrals')

    const acceptButton = await screen.findByRole(
      'button',
      { name: /Accept referral/i },
      { timeout: 4000 },
    )
    fireEvent.click(acceptButton)

    await waitFor(() => {
      expect(
        useAppStore.getState().referrals.some((r) => r.status === 'accepted'),
      ).toBe(true)
    })
    facilityView.unmount()

    // The patient side reflects the new status.
    useAppStore.getState().login('u_ramesh')
    renderAt('/referrals')
    expect(
      (await screen.findAllByText(/Referral journey/i, undefined, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
  })
})

describe('Scenario 12 - hospital pre-arrival alert is a connected workflow', () => {
  it('lets the facility prepare the emergency and mark the patient reached', async () => {
    const store = useAppStore.getState()
    const result = store.requestEmergency({
      patientId: 'p_ramesh',
      symptoms: 'Severe chest pain',
      riskLevel: 'high',
      requestedByUserId: 'u_ramesh',
    })
    const destination = useAppStore
      .getState()
      .emergencyRequests.find((e) => e.id === result.requestId)!.destinationFacilityId
    const facilityUser = useAppStore
      .getState()
      .users.find((u) => u.role === 'facility' && u.facilityId === destination)!
    useAppStore.getState().login(facilityUser.id)

    renderAt('/facility/emergency')
    await waitFor(() => {
      expect(screen.getAllByText(/INCOMING EMERGENCY/i).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Ramesh Singh/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Risk Level: ZYADA/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Severe chest pain/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ETA \d+ minutes/i).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Prepare Emergency/i }))
    await waitFor(() => {
      expect(screen.getAllByText(/Emergency prepared/i).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /Mark Patient Reached/i }))
    await waitFor(() => {
      expect(
        useAppStore
          .getState()
          .emergencyRequests.find((e) => e.id === result.requestId)!.status,
      ).toBe('patient_reached')
    })
  })
})

describe('Scenario 13 - facility resource toggle changes patient availability', () => {
  it('marks a doctor unavailable from the facility dashboard', async () => {
    useAppStore.getState().login('u_phc')
    const view = renderAt('/facility/resources')

    const markUnavailable = await screen.findByRole(
      'button',
      { name: /Mark unavailable/i },
      { timeout: 4000 },
    )
    fireEvent.click(markUnavailable)
    await waitFor(() => {
      expect(useAppStore.getState().doctors.find((d) => d.id === 'd_arjun')!.status).toBe(
        'unavailable',
      )
    })
    view.unmount()

    useAppStore.getState().login('u_ramesh')
    renderAt('/doctors')
    await waitFor(() => {
      expect(screen.getAllByText(/Available Doctors Now/i).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/Dr\. Arjun Mehta/)).toBeNull()
  })
})

describe('Scenario 14 - admin alert reaches the patient', () => {
  it('publishes a demo alert that appears on the patient alerts page', async () => {
    useAppStore.getState().login('u_admin')
    const adminView = renderAt('/admin/alerts')

    const newAlertButton = await screen.findByRole(
      'button',
      { name: /\+ New alert/i },
      { timeout: 4000 },
    )
    fireEvent.click(newAlertButton)

    const dialog = await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(within(dialog).getByLabelText(/^Title/i), {
      target: { value: 'Health Alert - Kalyanpur UI test' },
    })
    fireEvent.change(within(dialog).getByLabelText(/^Summary/i), {
      target: { value: 'Increased reports of a seasonal illness in this area.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Publish alert/i }))

    await waitFor(() => {
      expect(
        useAppStore.getState().alerts.some((a) => a.title.includes('Kalyanpur UI test')),
      ).toBe(true)
    })
    adminView.unmount()

    useAppStore.getState().login('u_ramesh')
    renderAt('/alerts')
    await waitFor(() => {
      expect(screen.getAllByText(/Kalyanpur UI test/).length).toBeGreaterThan(0)
    })
    // Clearly labelled as a demo alert, never as a verified outbreak.
    expect(screen.getAllByText(/Demo public health alert/i).length).toBeGreaterThan(0)
  })
})

describe('Scenario 15 - patient registers for a medical camp', () => {
  it('registers and shows the registration state', async () => {
    renderAt('/camps')
    const registerButtons = await screen.findAllByRole(
      'button',
      { name: /^Register$/i },
      { timeout: 4000 },
    )
    fireEvent.click(registerButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText(/You are registered/i).length).toBeGreaterThan(0)
    })
    expect(
      useAppStore
        .getState()
        .campRegistrations.some(
          (r) => r.campId === 'camp_kalyanpur' && r.patientId === 'p_ramesh',
        ),
    ).toBe(true)
  })
})

describe('Scenario 8 - ASHA offline mode through the UI', () => {
  it('shows offline status, queues a registration and then syncs', async () => {
    useAppStore.getState().login('u_sunita')
    renderAt('/asha/offline')

    const offlineToggle = await screen.findByRole(
      'button',
      { name: /Simulate offline/i },
      { timeout: 4000 },
    )
    fireEvent.click(offlineToggle)
    await waitFor(() => {
      expect(screen.getAllByText(/🟠 Offline/).length).toBeGreaterThan(0)
    })

    // Save a field note while offline - it must be queued, not lost.
    fireEvent.change(screen.getByLabelText(/^Note$/i), {
      target: { value: 'Family needs transport help' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save note/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/queued/i).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Field note saved offline/i).length).toBeGreaterThan(0)

    // Reconnect: the queue drains through the prototype sync.
    fireEvent.click(screen.getByRole('button', { name: /Go back online/i }))
    await waitFor(
      () => {
        expect(useAppStore.getState().offlineQueue.every((q) => q.status === 'synced')).toBe(true)
      },
      { timeout: 5000 },
    )
    await waitFor(() => {
      expect(screen.getAllByText(/synced/i).length).toBeGreaterThan(0)
    })
  }, 15000)
})

describe('Scenario 7 - ASHA dashboard sections', () => {
  it('shows patients, households, referrals, follow-ups, camps, offline and preventive care', async () => {
    useAppStore.getState().login('u_sunita')
    renderAt('/asha')

    await waitFor(() => {
      expect(screen.getAllByText(/ASHA dashboard/i).length).toBeGreaterThan(0)
    })
    // The nav exposes every required section.
    for (const label of [
      /My patients/i,
      /Households/i,
      /Referrals/i,
      /Follow-ups/i,
      /Preventive care/i,
      /Medical camps/i,
      /Offline data/i,
      /Nearby healthcare/i,
    ]) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0)
    }
    // Today's follow-up counts are surfaced on the overview.
    expect(screen.getAllByText(/Today.s follow-ups/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/🔴 2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/🟡 4/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/🟢 8/).length).toBeGreaterThan(0)
    // And the referral drop-off alert.
    expect(screen.getAllByText(/referral follow-up\(s\) required/i).length).toBeGreaterThan(0)
  })
})

describe('Assisted healthcare mode', () => {
  it('walks a health worker from patient to screening to AI assistance', async () => {
    useAppStore.getState().login('u_sunita')
    renderAt('/assisted')

    // Step 1: choose a patient.
    const patientButtons = await screen.findAllByRole(
      'button',
      { name: /Ramesh Singh/ },
      { timeout: 4000 },
    )
    fireEvent.click(patientButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText(/Basic screening - Ramesh Singh/i).length).toBeGreaterThan(0)
    })
    fireEvent.change(screen.getByLabelText(/BP systolic/i), { target: { value: '166' } })
    fireEvent.change(screen.getByLabelText(/BP diastolic/i), { target: { value: '102' } })
    fireEvent.click(screen.getByRole('button', { name: /Save screening/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/AI assistance/i).length).toBeGreaterThan(0)
    })
    // The screening reached the shared record with a high-risk band.
    const screening = useAppStore
      .getState()
      .screenings.find((x) => x.patientId === 'p_ramesh' && x.bpSystolic === 166)!
    expect(screening.riskLevel).toBe('high')

    fireEvent.change(screen.getByLabelText(/What is the problem/i), {
      target: { value: 'Chakkar aa raha hai' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Get possible causes/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Sambhavit Kaaran|Possible Causes/i).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Suggested care level/i).length).toBeGreaterThan(0)
  })
})

describe('Low connectivity mode', () => {
  it('replaces the dashboard with essentials and keeps the assistant usable', async () => {
    useAppStore.getState().setLowConnectivity(true)
    renderAt('/')

    await waitFor(() => {
      expect(screen.getAllByText(/Low data mode/i).length).toBeGreaterThan(0)
    })
    // Essentials only: emergency, ASHA call, reminders, record, cached facilities.
    expect(screen.getAllByRole('link', { name: /^Emergency$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /Call Sunita Kumari \(ASHA\)/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/Nearest facilities \(cached\)/i).length).toBeGreaterThan(0)
    // The wider "for you today" grid is hidden.
    expect(screen.queryByText(/Village health access/i)).toBeNull()
    // The assistant still works.
    expect(screen.getByPlaceholderText(/Type karein|Type here|येथे लिहा/i)).toBeTruthy()
  })

  it('lightens the healthcare finder', async () => {
    useAppStore.getState().setLowConnectivity(true)
    renderAt('/nearby')
    await waitFor(() => {
      expect(screen.getAllByText(/Showing the five nearest facilities/i).length).toBeGreaterThan(0)
    })
  })
})

describe('Medicine reminder ticker', () => {
  it('raises a notification for a dose that has just fallen due', async () => {
    const store = useAppStore.getState()
    // A dose one minute in the past is "due now".
    const now = new Date()
    const past = new Date(now.getTime() - 60_000)
    const hhmm = `${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`
    store.createPrescription({
      patientId: 'p_ramesh',
      doctorId: 'd_arjun',
      advice: '',
      items: [
        {
          medicineName: 'Reminder Test Tablet',
          dose: '1 tablet',
          frequency: 'od',
          timing: 'after_food',
          durationDays: 1,
          times: [hhmm],
        },
      ],
    })

    renderAt('/medications')
    await waitFor(() => {
      expect(
        useAppStore
          .getState()
          .notifications.some((n) => n.body.includes('Reminder Test Tablet')),
      ).toBe(true)
    })
    expect(screen.getAllByText(/Time to take your prescribed medicine/i).length).toBeGreaterThan(0)
  })
})
