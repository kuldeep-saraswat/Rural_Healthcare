import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Role } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { AiChatProvider } from '@/components/ai/AiChatContext'
import { DemoActionProvider } from '@/components/DemoAction'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary, Loading } from '@/components/ui/States'
import { EmptyState } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { SectionHeading } from '@/components/ui/Card'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { ROLE_HOME, ROLE_LABEL } from '@/services/permissions'
import { useConnectivityWatcher, useOfflineCache } from '@/services/connectivity'
import { useMedicationReminders } from '@/services/reminders'

// Patient surfaces load eagerly - they are the core experience.
import { HomePage } from '@/pages/patient/Home'
import { AiHealthPage } from '@/pages/patient/AiHealth'
import { EmergencyPage } from '@/pages/patient/Emergency'
import { NearbyPage } from '@/pages/patient/Nearby'
import { DoctorsPage } from '@/pages/patient/Doctors'
import { MedicinesPage, TestsPage, VaccinesPage } from '@/pages/patient/Finders'
import { FollowUpsPage, MedicationsPage, ReferralsPage } from '@/pages/patient/CarePages'
import { RecordsPage } from '@/pages/patient/Records'

// Everything else is code-split to keep the first load small on 2G/3G.
const ConsultPage = lazy(() =>
  import('@/pages/patient/Consult').then((m) => ({ default: m.ConsultPage })),
)
const CampsPage = lazy(() =>
  import('@/pages/patient/AccessPages').then((m) => ({ default: m.CampsPage })),
)
const KiosksPage = lazy(() =>
  import('@/pages/patient/AccessPages').then((m) => ({ default: m.KiosksPage })),
)
const AshaContactPage = lazy(() =>
  import('@/pages/patient/AccessPages').then((m) => ({ default: m.AshaContactPage })),
)
const AlertsPage = lazy(() =>
  import('@/pages/patient/PublicHealthPages').then((m) => ({ default: m.AlertsPage })),
)
const PreventivePage = lazy(() =>
  import('@/pages/patient/PublicHealthPages').then((m) => ({ default: m.PreventivePage })),
)
const VillagePage = lazy(() =>
  import('@/pages/patient/PublicHealthPages').then((m) => ({ default: m.VillagePage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/patient/Profile').then((m) => ({ default: m.ProfilePage })),
)
const AssistedPage = lazy(() =>
  import('@/pages/Assisted').then((m) => ({ default: m.AssistedPage })),
)

const DoctorDashboardPage = lazy(() =>
  import('@/pages/doctor/DoctorPages').then((m) => ({ default: m.DoctorDashboardPage })),
)
const DoctorEmergenciesPage = lazy(() =>
  import('@/pages/doctor/DoctorPages').then((m) => ({ default: m.DoctorEmergenciesPage })),
)
const DoctorReferralsPage = lazy(() =>
  import('@/pages/doctor/DoctorPages').then((m) => ({ default: m.DoctorReferralsPage })),
)
const DoctorPatientPage = lazy(() =>
  import('@/pages/doctor/DoctorPatient').then((m) => ({ default: m.DoctorPatientPage })),
)

const AshaOverviewPage = lazy(() =>
  import('@/pages/asha/AshaOverview').then((m) => ({ default: m.AshaOverviewPage })),
)
const AshaPatientsPage = lazy(() =>
  import('@/pages/asha/AshaPatients').then((m) => ({ default: m.AshaPatientsPage })),
)
const AshaReferralsPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaReferralsPage })),
)
const AshaFollowUpsPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaFollowUpsPage })),
)
const AshaHouseholdsPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaHouseholdsPage })),
)
const AshaPreventivePage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaPreventivePage })),
)
const AshaCampsPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaCampsPage })),
)
const AshaNearbyPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaNearbyPage })),
)
const AshaOfflinePage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaOfflinePage })),
)
const AshaAlertsPage = lazy(() =>
  import('@/pages/asha/AshaWorkPages').then((m) => ({ default: m.AshaAlertsPage })),
)

const FacilityOverviewPage = lazy(() =>
  import('@/pages/facility/FacilityPages').then((m) => ({ default: m.FacilityOverviewPage })),
)
const FacilityResourcesPage = lazy(() =>
  import('@/pages/facility/FacilityPages').then((m) => ({ default: m.FacilityResourcesPage })),
)
const FacilityReferralsPage = lazy(() =>
  import('@/pages/facility/FacilityPages').then((m) => ({ default: m.FacilityReferralsPage })),
)
const FacilityEmergencyPage = lazy(() =>
  import('@/pages/facility/FacilityPages').then((m) => ({ default: m.FacilityEmergencyPage })),
)
const FacilityCampsPage = lazy(() =>
  import('@/pages/facility/FacilityPages').then((m) => ({ default: m.FacilityCampsPage })),
)

const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminOverviewPage })),
)
const AdminDemandPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminDemandPage })),
)
const AdminResourcesPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminResourcesPage })),
)
const AdminReferralsPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminReferralsPage })),
)
const AdminAlertsPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminAlertsPage })),
)
const AdminCampsPage = lazy(() =>
  import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminCampsPage })),
)

/** Blocks a role dashboard for the wrong role instead of leaking data. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const store = useAppStore()
  const user = currentUser(store)
  if (roles.includes(user.role)) return <>{children}</>
  return (
    <div className="space-y-4">
      <SectionHeading>Not available for this role</SectionHeading>
      <Callout tone="warn" icon="🔒" title={`You are signed in as ${ROLE_LABEL[user.role]}`}>
        This dashboard is only for: {roles.map((role) => ROLE_LABEL[role]).join(', ')}. Use the
        account switcher in the header to change demo role.
      </Callout>
      <LinkButton to={ROLE_HOME[user.role]} tone="primary">
        Go to my dashboard
      </LinkButton>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function NotFoundPage() {
  return (
    <EmptyState
      icon="🧭"
      title="Page not found"
      body="This link does not exist in the prototype."
      action={
        <>
          <LinkButton to="/" tone="primary">
            Go home
          </LinkButton>
          <LinkButton to="/ai">Ask the assistant</LinkButton>
        </>
      }
    />
  )
}

export default function App() {
  useConnectivityWatcher()
  useOfflineCache()
  useMedicationReminders()
  const detectReferralDropOffs = useAppStore((s) => s.detectReferralDropOffs)

  // Referral drop-off detection runs once on load and then hourly, which is
  // what raises the ASHA "referral follow-up required" alert.
  useEffect(() => {
    detectReferralDropOffs()
    const timer = setInterval(detectReferralDropOffs, 60 * 60 * 1000)
    return () => {
      clearInterval(timer)
    }
  }, [detectReferralDropOffs])

  return (
    <ToastProvider>
      <DemoActionProvider>
        <AiChatProvider>
          <ScrollToTop />
          <AppShell>
            <ErrorBoundary label="RuralCare AI screen">
              <Suspense fallback={<Loading label="Loading this screen..." />}>
                <Routes>
                  {/* Patient */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/ai" element={<AiHealthPage />} />
                  <Route path="/emergency" element={<EmergencyPage />} />
                  <Route path="/nearby" element={<NearbyPage />} />
                  <Route path="/doctors" element={<DoctorsPage />} />
                  <Route path="/consult/:doctorId" element={<ConsultPage />} />
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/referrals" element={<ReferralsPage />} />
                  <Route path="/follow-ups" element={<FollowUpsPage />} />
                  <Route path="/medications" element={<MedicationsPage />} />
                  <Route path="/medicines" element={<MedicinesPage />} />
                  <Route path="/tests" element={<TestsPage />} />
                  <Route path="/vaccines" element={<VaccinesPage />} />
                  <Route path="/camps" element={<CampsPage />} />
                  <Route path="/kiosks" element={<KiosksPage />} />
                  <Route path="/asha-contact" element={<AshaContactPage />} />
                  <Route path="/preventive" element={<PreventivePage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/village" element={<VillagePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/assisted" element={<AssistedPage />} />

                  {/* Doctor */}
                  <Route
                    path="/doctor"
                    element={
                      <RequireRole roles={['doctor']}>
                        <DoctorDashboardPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/doctor/emergencies"
                    element={
                      <RequireRole roles={['doctor']}>
                        <DoctorEmergenciesPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/doctor/referrals"
                    element={
                      <RequireRole roles={['doctor']}>
                        <DoctorReferralsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/doctor/patient/:patientId"
                    element={
                      <RequireRole roles={['doctor']}>
                        <DoctorPatientPage />
                      </RequireRole>
                    }
                  />

                  {/* ASHA */}
                  <Route
                    path="/asha"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaOverviewPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/patients"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaPatientsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/households"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaHouseholdsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/referrals"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaReferralsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/follow-ups"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaFollowUpsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/preventive"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaPreventivePage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/camps"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaCampsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/nearby"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaNearbyPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/offline"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaOfflinePage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/asha/alerts"
                    element={
                      <RequireRole roles={['asha']}>
                        <AshaAlertsPage />
                      </RequireRole>
                    }
                  />

                  {/* Facility */}
                  <Route
                    path="/facility"
                    element={
                      <RequireRole roles={['facility']}>
                        <FacilityOverviewPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/facility/resources"
                    element={
                      <RequireRole roles={['facility']}>
                        <FacilityResourcesPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/facility/referrals"
                    element={
                      <RequireRole roles={['facility']}>
                        <FacilityReferralsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/facility/emergency"
                    element={
                      <RequireRole roles={['facility']}>
                        <FacilityEmergencyPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/facility/camps"
                    element={
                      <RequireRole roles={['facility']}>
                        <FacilityCampsPage />
                      </RequireRole>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminOverviewPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/demand"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminDemandPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/resources"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminResourcesPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/referrals"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminReferralsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/alerts"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminAlertsPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/camps"
                    element={
                      <RequireRole roles={['admin']}>
                        <AdminCampsPage />
                      </RequireRole>
                    }
                  />

                  <Route path="/home" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AppShell>
        </AiChatProvider>
      </DemoActionProvider>
    </ToastProvider>
  )
}
