import { describe, expect, it } from 'vitest'
import { runPrototypeSync, useAppStore } from './useAppStore'
import {
  alertsForVillage,
  availableAmbulances,
  availableDoctors,
  bucketFollowUp,
  droppedOffReferrals,
  findMedicineAvailability,
  findTestAvailability,
  notificationsFor,
} from './selectors'
import { buildDayDoses } from '@/services/medications'
import { authorisedPatients, canViewSection } from '@/services/permissions'
import { todayKey } from '@/lib/utils'

const s = () => useAppStore.getState()

describe('Scenario 9 - prescription creates a medication schedule', () => {
  it('builds reminders from the doctor dose verbatim and notifies the patient', () => {
    const before = s().medicationSchedules.length
    const prescriptionId = s().createPrescription({
      patientId: 'p_ramesh',
      doctorId: 'd_arjun',
      advice: 'Drink water',
      items: [
        {
          medicineName: 'Test Medicine 250 mg',
          dose: '2 tablets',
          frequency: 'bd',
          timing: 'after_food',
          durationDays: 4,
          times: ['09:00', '21:00'],
        },
      ],
    })
    const schedules = s().medicationSchedules.filter((x) => x.prescriptionId === prescriptionId)
    expect(s().medicationSchedules.length).toBe(before + 1)
    expect(schedules[0].dose).toBe('2 tablets')
    expect(schedules[0].times).toEqual(['09:00', '21:00'])
    expect(schedules[0].prescribedBy).toBe('Dr. Arjun Mehta')

    const notifications = notificationsFor(s().notifications, 'u_ramesh')
    expect(notifications.some((n) => n.kind === 'medication')).toBe(true)
  })

  it('lets the patient mark a dose taken and skipped, and keeps the history', () => {
    const prescriptionId = s().createPrescription({
      patientId: 'p_ramesh',
      doctorId: 'd_arjun',
      advice: '',
      items: [
        {
          medicineName: 'Demo Tablet',
          dose: '1 tablet',
          frequency: 'bd',
          timing: 'after_food',
          durationDays: 2,
          times: ['08:00', '20:00'],
        },
      ],
    })
    const schedule = s().medicationSchedules.find((x) => x.prescriptionId === prescriptionId)!

    s().logDose(schedule.id, '08:00', 'taken')
    s().logDose(schedule.id, '20:00', 'skipped')

    const doses = buildDayDoses(
      s().medicationSchedules.filter((x) => x.id === schedule.id),
      s().medicationLogs,
    )
    expect(doses.find((d) => d.time === '08:00')?.state).toBe('taken')
    expect(doses.find((d) => d.time === '20:00')?.state).toBe('skipped')

    // Re-logging updates instead of duplicating.
    s().logDose(schedule.id, '20:00', 'taken')
    const logs = s().medicationLogs.filter(
      (l) => l.scheduleId === schedule.id && l.time === '20:00' && l.date === todayKey(),
    )
    expect(logs).toHaveLength(1)
    expect(logs[0].status).toBe('taken')
  })

  it('never creates a schedule for an SOS-only prescription', () => {
    const before = s().medicationSchedules.length
    s().createPrescription({
      patientId: 'p_ramesh',
      doctorId: 'd_arjun',
      advice: '',
      items: [
        {
          medicineName: 'SOS Tablet',
          dose: '1 tablet',
          frequency: 'sos',
          timing: 'anytime',
          durationDays: 5,
          times: [],
        },
      ],
    })
    expect(s().medicationSchedules.length).toBe(before)
  })
})

describe('Scenario 10 - referral status progression', () => {
  it('walks created -> accepted -> reached -> consultation -> treatment -> completed', () => {
    const referralId = s().createReferral({
      patientId: 'p_geeta',
      fromDoctorId: 'd_arjun',
      fromFacilityId: 'f_phc_kalyanpur',
      toFacilityId: 'f_dh_shivpur',
      reason: 'Anaemia workup',
      symptoms: 'Weakness',
      notes: 'Hb 8.9',
      urgency: 'urgent',
      transportRequired: true,
      recommendedFacilityType: 'district_hospital',
    })
    const get = () => s().referrals.find((r) => r.id === referralId)!
    expect(get().status).toBe('created')

    // The receiving facility desk is notified.
    expect(
      notificationsFor(s().notifications, 'u_hospital').some((n) => n.kind === 'referral'),
    ).toBe(true)

    for (const status of [
      'accepted',
      'patient_reached',
      'consultation',
      'treatment',
      'completed',
    ] as const) {
      s().advanceReferral(referralId, status, 'Shivpur District Hospital')
      expect(get().status).toBe(status)
    }
    expect(get().history.map((h) => h.status)).toEqual([
      'created',
      'accepted',
      'patient_reached',
      'consultation',
      'treatment',
      'completed',
    ])
  })

  it('attaches the record to the referral', () => {
    const referralId = s().createReferral({
      patientId: 'p_ramesh',
      fromDoctorId: 'd_arjun',
      fromFacilityId: 'f_phc_kalyanpur',
      toFacilityId: 'f_mc_shivpur',
      reason: 'Cardiology review',
      symptoms: 'Chest heaviness',
      notes: 'ECG attached',
      urgency: 'urgent',
      transportRequired: false,
      recommendedFacilityType: 'medical_college',
      attachments: {
        consultationIds: ['c_ramesh_1'],
        prescriptionIds: ['rx_ramesh_1'],
        labReportIds: ['lab_ramesh_ecg', 'lab_ramesh_lipid'],
      },
    })
    const referral = s().referrals.find((r) => r.id === referralId)!
    expect(referral.attachments.labReportIds).toHaveLength(2)
    expect(referral.attachments.consultationIds).toContain('c_ramesh_1')
  })
})

describe('Scenario 11 - referral drop-off prevention', () => {
  it('flags an unreached referral and alerts the ASHA worker', () => {
    // The seeded Sunil Rathod referral is already past its expected arrival.
    s().detectReferralDropOffs()
    const flagged = droppedOffReferrals(s().referrals)
    expect(flagged.some((r) => r.patientId === 'p_sunil')).toBe(true)

    const ashaNotifications = notificationsFor(s().notifications, 'u_sunita')
    expect(
      ashaNotifications.some((n) => n.title.toLowerCase().includes('referral follow-up')),
    ).toBe(true)
  })

  it('records ASHA contact attempts and escalation', () => {
    const referral = s().referrals.find((r) => r.patientId === 'p_sunil')!
    s().recordReferralContact(referral.id, 'Sunita Kumari', 'call', 'No transport available')
    s().recordReferralContact(referral.id, 'Sunita Kumari', 'message', 'Reminder sent')
    s().escalateReferral(referral.id, 'Sunita Kumari')

    const updated = s().referrals.find((r) => r.id === referral.id)!
    expect(updated.contactAttempts).toHaveLength(2)
    expect(updated.escalated).toBe(true)
    expect(
      notificationsFor(s().notifications, 'u_phc').some((n) =>
        n.title.includes('escalated'),
      ),
    ).toBe(true)
  })

  it('clears the drop-off flag once the patient is marked reached', () => {
    s().detectReferralDropOffs()
    const referral = s().referrals.find((r) => r.patientId === 'p_sunil')!
    expect(referral.dropOffFlagged).toBe(true)
    s().advanceReferral(referral.id, 'patient_reached', 'Sunita Kumari')
    expect(s().referrals.find((r) => r.id === referral.id)!.dropOffFlagged).toBe(false)
  })
})

describe('Scenario 12 - emergency coordination', () => {
  it('assigns an ambulance, alerts the hospital and frees the ambulance on completion', () => {
    const nearest = availableAmbulances(s())[0]
    const result = s().requestEmergency({
      patientId: 'p_ramesh',
      symptoms: 'Severe chest pain',
      riskLevel: 'high',
      requestedByUserId: 'u_ramesh',
    })
    expect(result.requestId).toBeTruthy()

    const request = s().emergencyRequests.find((e) => e.id === result.requestId)!
    expect(request.ambulanceId).toBe(nearest.id)
    expect(request.destinationFacilityId).toBeTruthy()
    expect(request.status).toBe('hospital_alerted')
    expect(request.etaMin).toBe(nearest.etaMin)

    // The ambulance is now busy, so patient-side availability changed.
    expect(s().ambulances.find((a) => a.id === nearest.id)!.status).toBe('busy')
    expect(availableAmbulances(s()).some((a) => a.id === nearest.id)).toBe(false)

    // The destination facility desk got the pre-arrival alert.
    const facilityUser = s().users.find(
      (u) => u.role === 'facility' && u.facilityId === request.destinationFacilityId,
    )
    if (facilityUser) {
      expect(
        notificationsFor(s().notifications, facilityUser.id).some((n) => n.kind === 'emergency'),
      ).toBe(true)
    }

    // Hospital workflow.
    s().prepareEmergency(request.id)
    s().assignEmergencyDoctor(request.id, 'd_arjun')
    s().advanceEmergency(request.id, 'patient_reached')
    s().advanceEmergency(request.id, 'in_treatment')
    s().advanceEmergency(request.id, 'completed')

    const done = s().emergencyRequests.find((e) => e.id === request.id)!
    expect(done.emergencyPrepared).toBe(true)
    expect(done.assignedDoctorId).toBe('d_arjun')
    expect(done.status).toBe('completed')
    expect(s().ambulances.find((a) => a.id === nearest.id)!.status).toBe('available')
  })

  it('reports honestly when no ambulance is free instead of faking a dispatch', () => {
    for (const ambulance of s().ambulances) s().setAmbulanceStatus(ambulance.id, 'busy')
    const result = s().requestEmergency({
      patientId: 'p_ramesh',
      symptoms: 'Breathless',
      riskLevel: 'high',
      requestedByUserId: 'u_ramesh',
    })
    expect(result.reason).toBe('no_ambulance')
    const request = s().emergencyRequests.find((e) => e.id === result.requestId)!
    expect(request.status).toBe('no_ambulance')
    expect(request.ambulanceId).toBeUndefined()
  })
})

describe('Scenario 13 - admin resource change reaches the patient side', () => {
  it('doctor availability', () => {
    expect(availableDoctors(s().doctors, s().facilities).some((d) => d.doctor.id === 'd_arjun')).toBe(
      true,
    )
    s().setDoctorStatus('d_arjun', 'unavailable')
    expect(availableDoctors(s().doctors, s().facilities).some((d) => d.doctor.id === 'd_arjun')).toBe(
      false,
    )
    // Marking a doctor unavailable also removes them from emergency cover.
    expect(s().doctors.find((d) => d.id === 'd_arjun')!.emergencyAvailable).toBe(false)
    s().setDoctorStatus('d_arjun', 'available')
    expect(availableDoctors(s().doctors, s().facilities).some((d) => d.doctor.id === 'd_arjun')).toBe(
      true,
    )
  })

  it('medicine stock', () => {
    const before = findMedicineAvailability(s().facilities, 'Paracetamol').find(
      (r) => r.facility.id === 'f_phc_kalyanpur',
    )
    expect(before?.status).toBe('available')
    s().setFacilityMedicineStatus('f_phc_kalyanpur', 'm_para', 'out')
    const after = findMedicineAvailability(s().facilities, 'Paracetamol').find(
      (r) => r.facility.id === 'f_phc_kalyanpur',
    )
    expect(after?.status).toBe('out')
  })

  it('vaccine stock', () => {
    s().setFacilityVaccineStatus('f_phc_kalyanpur', 'v_mr', 'out')
    const entry = s()
      .facilities.find((f) => f.id === 'f_phc_kalyanpur')!
      .vaccines.find((v) => v.itemId === 'v_mr')!
    expect(entry.status).toBe('out')
  })

  it('test availability', () => {
    expect(
      findTestAvailability(s().facilities, 'MRI').some((r) => r.facility.id === 'f_mc_shivpur'),
    ).toBe(true)
    s().setFacilityTestStatus('f_mc_shivpur', 't_mri', 'unavailable')
    expect(
      findTestAvailability(s().facilities, 'MRI').some((r) => r.facility.id === 'f_mc_shivpur'),
    ).toBe(false)
  })

  it('ambulance availability', () => {
    s().setAmbulanceStatus('amb_108a', 'busy')
    expect(availableAmbulances(s()).some((a) => a.id === 'amb_108a')).toBe(false)
  })

  it('beds and ICU, clamped to capacity', () => {
    s().setBedOccupancy('f_dh_shivpur', 'beds', 5)
    expect(s().facilities.find((f) => f.id === 'f_dh_shivpur')!.beds.occupied).toBe(5)
    s().setBedOccupancy('f_dh_shivpur', 'beds', 99999)
    const facility = s().facilities.find((f) => f.id === 'f_dh_shivpur')!
    expect(facility.beds.occupied).toBe(facility.beds.total)
    s().setBedOccupancy('f_dh_shivpur', 'icu', -5)
    expect(s().facilities.find((f) => f.id === 'f_dh_shivpur')!.icu.occupied).toBe(0)
  })
})

describe('Scenario 14 - public health alert reaches patient and ASHA', () => {
  it('notifies only users in the selected areas', () => {
    s().createAlert({
      kind: 'outbreak',
      severity: 'warning',
      title: 'Health Alert - Kalyanpur test',
      summary: 'Increased reports of a seasonal illness.',
      areas: ['Kalyanpur'],
      precautions: ['Drink safe water'],
      symptomsToWatch: ['Fever'],
      whatToDo: ['Contact ASHA'],
      whatToAvoid: ['Untreated water'],
      expiryDays: 7,
      createdBy: 'District Health Office (demo account)',
    })

    const alert = s().alerts.find((a) => a.title.includes('Kalyanpur test'))!
    expect(alert.demo).toBe(true)

    expect(
      notificationsFor(s().notifications, 'u_ramesh').some((n) =>
        n.title.includes('Kalyanpur test'),
      ),
    ).toBe(true)
    expect(
      notificationsFor(s().notifications, 'u_sunita').some((n) =>
        n.title.includes('Kalyanpur test'),
      ),
    ).toBe(true)
    // Dr Imran is in Shivpur and is not a patient/ASHA, so no alert.
    expect(
      notificationsFor(s().notifications, 'u_imran').some((n) =>
        n.title.includes('Kalyanpur test'),
      ),
    ).toBe(false)

    expect(alertsForVillage(s().alerts, 'Kalyanpur').some((a) => a.id === alert.id)).toBe(true)
    expect(alertsForVillage(s().alerts, 'Shivpur').some((a) => a.id === alert.id)).toBe(false)
  })
})

describe('Scenario 15 - medical camp registration', () => {
  it('registers a patient, prevents duplicates and respects slot limits', () => {
    const campId = 'camp_kalyanpur'
    const first = s().registerForCamp(campId, 'p_ramesh', 'Ramesh Singh', 'patient')
    expect(first).toBeTruthy()
    // Duplicate registration is rejected.
    expect(s().registerForCamp(campId, 'p_ramesh', 'Ramesh Singh', 'patient')).toBeUndefined()

    expect(
      notificationsFor(s().notifications, 'u_ramesh').some((n) => n.kind === 'camp'),
    ).toBe(true)

    // ASHA can register on the patient's behalf, and mark attendance.
    const ashaReg = s().registerForCamp(campId, 'p_mahesh', 'Sunita Kumari (ASHA)', 'asha')!
    s().markCampAttended(ashaReg, true)
    expect(s().campRegistrations.find((r) => r.id === ashaReg)!.attended).toBe(true)

    s().cancelCampRegistration(first!)
    expect(s().campRegistrations.some((r) => r.id === first)).toBe(false)
  })

  it('creates a camp and notifies the village', () => {
    s().createCamp({
      name: 'Bhilwadi Screening Camp',
      village: 'Bhilwadi',
      organiserFacilityId: 'f_phc_kalyanpur',
      date: todayKey(),
      startTime: '10:00',
      endTime: '13:00',
      doctorIds: ['d_arjun'],
      services: ['General consultation'],
      tests: ['t_bp'],
      medicines: ['m_para'],
      slotsTotal: 30,
      mobileUnit: true,
    })
    expect(s().camps.some((c) => c.name === 'Bhilwadi Screening Camp')).toBe(true)
  })
})

describe('Scenario 8 - offline ASHA workflow and prototype sync', () => {
  it('queues offline actions and marks records pending, then syncs', async () => {
    s().setSimulatedOffline(true)

    const patientId = s().registerPatient({
      name: 'Offline Test Patient',
      age: 30,
      gender: 'female',
      phone: '1800-000-9999',
      village: 'Kalyanpur',
      bloodGroup: 'O+',
      allergies: [],
      conditions: [],
      mainIssue: 'Registered during an offline visit',
      ashaId: 'asha_sunita',
      registeredBy: 'asha',
    })
    s().addScreening({
      patientId,
      byAshaId: 'asha_sunita',
      bpSystolic: 168,
      bpDiastolic: 104,
      notes: 'Offline screening',
    })
    s().createFollowUp({
      patientId,
      ashaId: 'asha_sunita',
      program: 'hypertension',
      afterDays: 7,
      reason: 'BP recheck',
    })
    s().addFieldNote('u_sunita', 'Needs transport help', patientId)

    expect(s().patients.find((p) => p.id === patientId)!.pendingSync).toBe(true)
    const queued = s().offlineQueue.filter((q) => q.status === 'queued')
    expect(queued.length).toBeGreaterThanOrEqual(4)
    expect(queued.map((q) => q.kind)).toContain('register_patient')
    expect(queued.map((q) => q.kind)).toContain('add_screening')
    expect(queued.map((q) => q.kind)).toContain('add_follow_up')
    expect(queued.map((q) => q.kind)).toContain('save_note')

    // A high BP screening is banded as high risk (triage aid, not a diagnosis).
    const screening = s().screenings.find((x) => x.patientId === patientId)!
    expect(screening.riskLevel).toBe('high')

    // Reconnect and sync.
    s().setSimulatedOffline(false)
    await runPrototypeSync()

    expect(s().offlineQueue.every((q) => q.status === 'synced')).toBe(true)
    expect(s().patients.find((p) => p.id === patientId)!.pendingSync).toBe(false)
    expect(s().screenings.find((x) => x.patientId === patientId)!.pendingSync).toBe(false)
    expect(s().lastSyncAt).toBeTruthy()
  })

  it('does not queue anything when online', () => {
    s().setSimulatedOffline(false)
    s().registerPatient({
      name: 'Online Test Patient',
      age: 25,
      gender: 'male',
      phone: '1800-000-8888',
      village: 'Kalyanpur',
      bloodGroup: 'A+',
      allergies: [],
      conditions: [],
      mainIssue: 'Online registration',
      ashaId: 'asha_sunita',
      registeredBy: 'asha',
    })
    expect(s().offlineQueue.filter((q) => q.status !== 'synced')).toHaveLength(0)
  })
})

describe('Follow-up system', () => {
  it("shows Sunita's dashboard counts as 2 overdue / 4 due today / 8 completed", () => {
    const mine = s().followUps.filter((f) => f.ashaId === 'asha_sunita')
    const counts = { overdue: 0, today: 0, completed: 0 }
    for (const followUp of mine) {
      const bucket = bucketFollowUp(followUp)
      if (bucket === 'overdue') counts.overdue += 1
      if (bucket === 'today') counts.today += 1
      if (bucket === 'completed') counts.completed += 1
    }
    expect(counts).toEqual({ overdue: 2, today: 4, completed: 8 })
  })

  it('creates a follow-up from a doctor and notifies patient plus ASHA', () => {
    const id = s().createFollowUp({
      patientId: 'p_ramesh',
      doctorId: 'd_imran',
      program: 'chronic',
      afterDays: 7,
      reason: 'Review after echo',
    })
    const followUp = s().followUps.find((f) => f.id === id)!
    expect(followUp.ashaId).toBe('asha_sunita')
    expect(bucketFollowUp(followUp)).toBe('upcoming')
    expect(
      notificationsFor(s().notifications, 'u_ramesh').some((n) => n.kind === 'followup'),
    ).toBe(true)
    expect(
      notificationsFor(s().notifications, 'u_sunita').some((n) => n.kind === 'followup'),
    ).toBe(true)

    s().completeFollowUp(id, 'Attended')
    expect(bucketFollowUp(s().followUps.find((f) => f.id === id)!)).toBe('completed')
  })
})

describe('Role-based access and consent', () => {
  it('lets the treating PHC doctor see notes but not another village doctor', () => {
    const arjun = s().users.find((u) => u.id === 'u_arjun')!
    const ramesh = s().patients.find((p) => p.id === 'p_ramesh')!
    expect(canViewSection(s(), arjun, ramesh, 'doctorNotes').allowed).toBe(true)

    // Dr Anita has no relationship with Ramesh.
    const anita = { ...arjun, id: 'u_anita', doctorId: 'd_anita', facilityId: 'f_phc_devgaon' }
    expect(canViewSection(s(), anita, ramesh, 'doctorNotes').allowed).toBe(false)
  })

  it('hides doctor notes and lab reports from an ASHA worker', () => {
    const sunita = s().users.find((u) => u.id === 'u_sunita')!
    const ramesh = s().patients.find((p) => p.id === 'p_ramesh')!
    expect(canViewSection(s(), sunita, ramesh, 'screenings').allowed).toBe(true)
    expect(canViewSection(s(), sunita, ramesh, 'doctorNotes').allowed).toBe(false)
    expect(canViewSection(s(), sunita, ramesh, 'labReports').allowed).toBe(false)
  })

  it('gives an admin account no access to any identifiable record', () => {
    const admin = s().users.find((u) => u.id === 'u_admin')!
    const ramesh = s().patients.find((p) => p.id === 'p_ramesh')!
    expect(canViewSection(s(), admin, ramesh, 'identity').allowed).toBe(false)
    expect(authorisedPatients(s(), admin)).toHaveLength(0)
  })

  it('respects a withdrawn consent immediately', () => {
    const arjun = s().users.find((u) => u.id === 'u_arjun')!
    s().updateConsent('p_ramesh', { shareWithTreatingDoctors: false })
    const ramesh = s().patients.find((p) => p.id === 'p_ramesh')!
    expect(canViewSection(s(), arjun, ramesh, 'consultations').allowed).toBe(false)
    expect(authorisedPatients(s(), arjun).some((p) => p.id === 'p_ramesh')).toBe(false)
  })

  it('limits the patient account to its own record', () => {
    const rameshUser = s().users.find((u) => u.id === 'u_ramesh')!
    const other = s().patients.find((p) => p.id === 'p_mahesh')!
    expect(canViewSection(s(), rameshUser, other, 'identity').allowed).toBe(false)
    expect(authorisedPatients(s(), rameshUser).map((p) => p.id)).toEqual(['p_ramesh'])
  })
})

describe('Doctor-to-doctor continuity', () => {
  it('lets the receiving cardiologist read the PHC consultation, report and prescription', () => {
    const imran = s().users.find((u) => u.id === 'u_imran')!
    const ramesh = s().patients.find((p) => p.id === 'p_ramesh')!

    expect(canViewSection(s(), imran, ramesh, 'consultations').allowed).toBe(true)
    expect(canViewSection(s(), imran, ramesh, 'doctorNotes').allowed).toBe(true)
    expect(canViewSection(s(), imran, ramesh, 'labReports').allowed).toBe(true)
    expect(canViewSection(s(), imran, ramesh, 'prescriptions').allowed).toBe(true)
    // Household details stay with the ASHA worker.
    expect(canViewSection(s(), imran, ramesh, 'household').allowed).toBe(false)

    const referral = s().referrals.find((r) => r.id === 'ref_ramesh')!
    expect(referral.fromDoctorId).toBe('d_arjun')
    expect(referral.toDoctorId).toBe('d_imran')
    expect(referral.attachments.consultationIds).toContain('c_ramesh_1')
    expect(referral.history.length).toBeGreaterThanOrEqual(5)
  })
})

describe('Consultation from a simulated teleconsultation', () => {
  it('records the consultation on the patient record and notifies the patient', () => {
    const id = s().createConsultation({
      patientId: 'p_ramesh',
      doctorId: 'd_arjun',
      symptoms: 'Fever for 2 days',
      assessment: 'Simulated teleconsultation - doctor notes pending.',
      observations: '',
      testsAdvised: [],
      riskLevel: 'low',
      emergency: false,
      mode: 'video',
    })
    const consultation = s().consultations.find((c) => c.id === id)!
    expect(consultation.mode).toBe('video')
    expect(consultation.facilityName).toBe('Kalyanpur Primary Health Centre')
    expect(s().patients.find((p) => p.id === 'p_ramesh')!.lastVisit).toBe(todayKey())
  })
})

describe('Demo data integrity', () => {
  it('has no dangling references between entities', () => {
    const state = s()
    const facilityIds = new Set(state.facilities.map((f) => f.id))
    const doctorIds = new Set(state.doctors.map((d) => d.id))
    const patientIds = new Set(state.patients.map((p) => p.id))
    const ashaIds = new Set(state.ashas.map((a) => a.id))

    for (const doctor of state.doctors) expect(facilityIds.has(doctor.facilityId)).toBe(true)
    for (const ambulance of state.ambulances)
      expect(facilityIds.has(ambulance.facilityId)).toBe(true)
    for (const patient of state.patients) {
      if (patient.ashaId) expect(ashaIds.has(patient.ashaId)).toBe(true)
    }
    for (const referral of state.referrals) {
      expect(patientIds.has(referral.patientId)).toBe(true)
      expect(facilityIds.has(referral.fromFacilityId)).toBe(true)
      expect(facilityIds.has(referral.toFacilityId)).toBe(true)
      if (referral.toDoctorId) expect(doctorIds.has(referral.toDoctorId)).toBe(true)
    }
    for (const followUp of state.followUps) expect(patientIds.has(followUp.patientId)).toBe(true)
    for (const camp of state.camps)
      expect(facilityIds.has(camp.organiserFacilityId)).toBe(true)
    for (const registration of state.campRegistrations) {
      expect(patientIds.has(registration.patientId)).toBe(true)
      expect(state.camps.some((c) => c.id === registration.campId)).toBe(true)
    }
    for (const village of state.villages) {
      expect(facilityIds.has(village.nearestPhcId)).toBe(true)
      expect(facilityIds.has(village.nearestHospitalId)).toBe(true)
    }
    for (const user of state.users) {
      if (user.patientId) expect(patientIds.has(user.patientId)).toBe(true)
      if (user.doctorId) expect(doctorIds.has(user.doctorId)).toBe(true)
      if (user.facilityId) expect(facilityIds.has(user.facilityId)).toBe(true)
      if (user.ashaId) expect(ashaIds.has(user.ashaId)).toBe(true)
    }
  })

  it('resets cleanly back to the seeded dataset', () => {
    const patientsBefore = s().patients.length
    s().registerPatient({
      name: 'Temp',
      age: 20,
      gender: 'other',
      phone: '-',
      village: 'Kalyanpur',
      bloodGroup: 'Unknown',
      allergies: [],
      conditions: [],
      mainIssue: 'temp',
      registeredBy: 'asha',
    })
    expect(s().patients.length).toBe(patientsBefore + 1)
    s().resetDemoData()
    expect(s().patients.length).toBe(patientsBefore)
    expect(s().currentUserId).toBe('u_ramesh')
  })
})
