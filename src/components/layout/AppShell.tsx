import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Role } from '@/types'
import {
  ConnectionStatus,
  LanguageSwitcher,
  NotificationBell,
  RoleSwitcher,
  SettingsButton,
} from './HeaderWidgets'
import { Dialog } from '@/components/ui/Dialog'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

interface NavItem {
  to: string
  labelKey: string
  fallback: string
  icon: string
  end?: boolean
}

const PATIENT_PRIMARY: NavItem[] = [
  { to: '/', labelKey: 'nav.home', fallback: 'Home', icon: '🏠', end: true },
  { to: '/ai', labelKey: 'nav.ai', fallback: 'AI Health', icon: '🩺' },
  { to: '/nearby', labelKey: 'nav.nearby', fallback: 'Nearby', icon: '📍' },
  { to: '/doctors', labelKey: 'nav.doctors', fallback: 'Doctors', icon: '👨‍⚕️' },
  { to: '/records', labelKey: 'nav.records', fallback: 'Records', icon: '📋' },
  { to: '/referrals', labelKey: 'nav.referrals', fallback: 'Referrals', icon: '🔁' },
]

const PATIENT_MORE: NavItem[] = [
  { to: '/asha-contact', labelKey: 'nav.asha', fallback: 'ASHA', icon: '🧑‍🤝‍🧑' },
  { to: '/camps', labelKey: 'nav.camps', fallback: 'Medical Camps', icon: '⛺' },
  { to: '/kiosks', labelKey: 'nav.kiosks', fallback: 'Health Kiosks', icon: '🖥️' },
  { to: '/medicines', labelKey: 'nav.medicines', fallback: 'Medicines', icon: '💊' },
  { to: '/tests', labelKey: 'nav.tests', fallback: 'Tests', icon: '🔬' },
  { to: '/vaccines', labelKey: 'nav.vaccines', fallback: 'Vaccines', icon: '💉' },
  { to: '/follow-ups', labelKey: 'nav.followups', fallback: 'Follow-ups', icon: '📅' },
  { to: '/medications', labelKey: 'nav.medications', fallback: 'Medicine Reminders', icon: '⏰' },
  { to: '/preventive', labelKey: 'nav.preventive', fallback: 'Preventive Care', icon: '🛡️' },
  { to: '/alerts', labelKey: 'nav.alerts', fallback: 'Health Alerts', icon: '📢' },
  { to: '/village', labelKey: 'nav.village', fallback: 'Village Health Access', icon: '🏡' },
  { to: '/profile', labelKey: 'nav.profile', fallback: 'Profile', icon: '👤' },
]

const ROLE_NAV: Record<Exclude<Role, 'patient'>, NavItem[]> = {
  doctor: [
    { to: '/doctor', labelKey: '', fallback: 'My patients', icon: '🧑‍⚕️', end: true },
    { to: '/doctor/emergencies', labelKey: '', fallback: 'Emergency cases', icon: '🚑' },
    { to: '/doctor/referrals', labelKey: '', fallback: 'Referrals', icon: '🔁' },
  ],
  asha: [
    { to: '/asha', labelKey: '', fallback: 'Overview', icon: '📊', end: true },
    { to: '/asha/patients', labelKey: '', fallback: 'My patients', icon: '🧑‍🤝‍🧑' },
    { to: '/asha/households', labelKey: '', fallback: 'Households', icon: '🏡' },
    { to: '/asha/referrals', labelKey: '', fallback: 'Referrals', icon: '🔁' },
    { to: '/asha/follow-ups', labelKey: '', fallback: 'Follow-ups', icon: '📅' },
    { to: '/asha/preventive', labelKey: '', fallback: 'Preventive care', icon: '🛡️' },
    { to: '/asha/camps', labelKey: '', fallback: 'Medical camps', icon: '⛺' },
    { to: '/asha/nearby', labelKey: '', fallback: 'Nearby healthcare', icon: '📍' },
    { to: '/asha/offline', labelKey: '', fallback: 'Offline data', icon: '📴' },
    { to: '/asha/alerts', labelKey: '', fallback: 'Alerts', icon: '📢' },
  ],
  facility: [
    { to: '/facility', labelKey: '', fallback: 'Overview', icon: '📊', end: true },
    { to: '/facility/resources', labelKey: '', fallback: 'Resources', icon: '🧰' },
    { to: '/facility/referrals', labelKey: '', fallback: 'Incoming referrals', icon: '🔁' },
    { to: '/facility/emergency', labelKey: '', fallback: 'Emergency alerts', icon: '🚑' },
    { to: '/facility/camps', labelKey: '', fallback: 'Medical camps', icon: '⛺' },
  ],
  admin: [
    { to: '/admin', labelKey: '', fallback: 'Overview', icon: '📊', end: true },
    { to: '/admin/demand', labelKey: '', fallback: 'Demand map', icon: '🗺️' },
    { to: '/admin/resources', labelKey: '', fallback: 'Resources', icon: '🧰' },
    { to: '/admin/referrals', labelKey: '', fallback: 'Referral analytics', icon: '🔁' },
    { to: '/admin/alerts', labelKey: '', fallback: 'Public health alerts', icon: '📢' },
    { to: '/admin/camps', labelKey: '', fallback: 'Camps', icon: '⛺' },
  ],
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT()
  const location = useLocation()
  const store = useAppStore()
  const user = currentUser(store)
  const [moreOpen, setMoreOpen] = useState(false)
  const isPatient = user.role === 'patient'
  const roleNav: NavItem[] = user.role === 'patient' ? [] : ROLE_NAV[user.role]

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Prototype honesty banner - always visible, never dismissible. */}
      <div className="bg-ink-900 px-3 py-1.5 text-center text-xs text-white">
        {t('app.demoBanner')}
      </div>

      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-4">
          <Link to={isPatient ? '/' : `/${user.role}`} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-card bg-care-600 text-lg text-white"
            >
              ✚
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-ink-900">RuralCare AI</span>
              <span className="hidden text-xs text-ink-500 sm:block">
                Rural healthcare access & coordination
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:block">
              <ConnectionStatus />
            </span>
            <span className="hidden lg:block">
              <LanguageSwitcher />
            </span>
            <NotificationBell />
            <SettingsButton />
            <RoleSwitcher />
          </div>
        </div>

        {/* Desktop primary navigation */}
        <nav
          aria-label="Main navigation"
          className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-4 md:flex"
        >
          {(isPatient ? PATIENT_PRIMARY : roleNav).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-card px-3 text-sm font-medium',
                  isActive
                    ? 'bg-care-600 text-white'
                    : 'text-ink-700 hover:bg-care-50 hover:text-care-700',
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.labelKey ? t(item.labelKey) : item.fallback}
            </NavLink>
          ))}
          {isPatient ? (
            <button
              type="button"
              onClick={() => {
                setMoreOpen(true)
              }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-card px-3 text-sm font-medium text-ink-700 hover:bg-care-50"
            >
              <span aria-hidden="true">➕</span>
              {t('nav.more')}
            </button>
          ) : null}
          <Link
            to="/emergency"
            className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-card bg-sos-600 px-4 text-sm font-bold text-white hover:bg-sos-700"
          >
            <span aria-hidden="true">🚨</span>
            {t('nav.emergency')}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-28 sm:px-4 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 backdrop-blur md:hidden"
      >
        <div className="flex items-stretch">
          {(isPatient
            ? [PATIENT_PRIMARY[0], PATIENT_PRIMARY[1], PATIENT_PRIMARY[2], PATIENT_PRIMARY[4]]
            : roleNav.slice(0, 4)
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium',
                  isActive ? 'text-care-700' : 'text-ink-500',
                )
              }
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span className="text-center leading-tight">
                {item.labelKey ? t(item.labelKey) : item.fallback}
              </span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              setMoreOpen(true)
            }}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium text-ink-500"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ☰
            </span>
            <span>{t('nav.more')}</span>
          </button>
          <Link
            to="/emergency"
            className={cx(
              'flex flex-1 flex-col items-center gap-0.5 bg-sos-600 px-1 py-2 text-[11px] font-bold text-white',
              location.pathname === '/emergency' && 'bg-sos-700',
            )}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              🚨
            </span>
            <span>{t('nav.emergency')}</span>
          </Link>
        </div>
      </nav>

      <MoreMenu
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false)
        }}
        items={isPatient ? PATIENT_MORE : roleNav}
        extraItems={isPatient ? [] : []}
      />

      <footer className="hidden border-t border-hairline bg-surface px-4 py-4 text-center text-xs text-ink-500 md:block">
        RuralCare AI prototype · all patients, facilities, alerts and dispatches shown are
        fictional demo data · not connected to real emergency or government services
      </footer>
    </div>
  )
}

function MoreMenu({
  open,
  onClose,
  items,
  extraItems,
}: {
  open: boolean
  onClose: () => void
  items: NavItem[]
  extraItems: NavItem[]
}) {
  const t = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('nav.more')} width="md">
      <ul className="grid gap-2 sm:grid-cols-2">
        {[...items, ...extraItems].map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onClose}
              className="flex min-h-14 items-center gap-3 rounded-card border border-hairline bg-surface px-4 text-[15px] font-medium text-ink-900 hover:bg-care-50"
            >
              <span aria-hidden="true" className="text-xl">
                {item.icon}
              </span>
              {item.labelKey ? t(item.labelKey) : item.fallback}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-hairline pt-4">
        <h3 className="mb-2 text-sm font-semibold text-ink-700">Language</h3>
        <LanguageSwitcher />
        <div className="mt-3">
          <ConnectionStatus />
        </div>
      </div>
    </Dialog>
  )
}
