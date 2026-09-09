import { useEffect, useState } from 'react'
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
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { useAppStore } from '@/store/useAppStore'
import { currentUser } from '@/store/selectors'
import { ROLE_HOME, ROLE_LABEL } from '@/services/permissions'
import { useT } from '@/services/i18n'
import { cx } from '@/lib/utils'

/* ---------------------------------------------------------------------------
   Application shell.

   One shell, two skins:
     - staff roles (doctor / ASHA / facility / admin) get the deep navy
       operational sidebar of a clinical console
     - patients get the same structure in a light, roomier skin, because a
       patient screen must not read as an admin panel

   Layout: sidebar + top bar on desktop; drawer + bottom bar on phones. The
   emergency action is always reachable in one tap, on every breakpoint.
--------------------------------------------------------------------------- */

interface NavItem {
  to: string
  labelKey: string
  fallback: string
  icon: IconName
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const PATIENT_PRIMARY: NavItem[] = [
  { to: '/', labelKey: 'nav.home', fallback: 'Home', icon: 'home', end: true },
  { to: '/ai', labelKey: 'nav.ai', fallback: 'AI Health', icon: 'sparkle' },
  { to: '/nearby', labelKey: 'nav.nearby', fallback: 'Nearby', icon: 'pin' },
  { to: '/doctors', labelKey: 'nav.doctors', fallback: 'Doctors', icon: 'doctor' },
  { to: '/records', labelKey: 'nav.records', fallback: 'Records', icon: 'record' },
  { to: '/referrals', labelKey: 'nav.referrals', fallback: 'Referrals', icon: 'route' },
]

const PATIENT_MORE: NavItem[] = [
  { to: '/asha-contact', labelKey: 'nav.asha', fallback: 'ASHA', icon: 'users' },
  { to: '/camps', labelKey: 'nav.camps', fallback: 'Medical Camps', icon: 'tent' },
  { to: '/kiosks', labelKey: 'nav.kiosks', fallback: 'Health Kiosks', icon: 'kiosk' },
  { to: '/medicines', labelKey: 'nav.medicines', fallback: 'Medicines', icon: 'pill' },
  { to: '/tests', labelKey: 'nav.tests', fallback: 'Tests', icon: 'flask' },
  { to: '/vaccines', labelKey: 'nav.vaccines', fallback: 'Vaccines', icon: 'syringe' },
  { to: '/follow-ups', labelKey: 'nav.followups', fallback: 'Follow-ups', icon: 'calendarCheck' },
  { to: '/medications', labelKey: 'nav.medications', fallback: 'Medicine Reminders', icon: 'alarm' },
  { to: '/preventive', labelKey: 'nav.preventive', fallback: 'Preventive Care', icon: 'shieldCheck' },
  { to: '/alerts', labelKey: 'nav.alerts', fallback: 'Health Alerts', icon: 'megaphone' },
  { to: '/village', labelKey: 'nav.village', fallback: 'Village Health Access', icon: 'household' },
  { to: '/profile', labelKey: 'nav.profile', fallback: 'Profile', icon: 'user' },
]

const byPath = (path: string) =>
  [...PATIENT_PRIMARY, ...PATIENT_MORE].find((item) => item.to === path)!

const PATIENT_GROUPS: NavGroup[] = [
  {
    label: 'Everyday care',
    items: [byPath('/'), byPath('/ai'), byPath('/nearby'), byPath('/doctors')],
  },
  {
    label: 'My health',
    items: [
      byPath('/records'),
      byPath('/referrals'),
      byPath('/follow-ups'),
      byPath('/medications'),
      byPath('/preventive'),
    ],
  },
  {
    label: 'Find services',
    items: [
      byPath('/medicines'),
      byPath('/tests'),
      byPath('/vaccines'),
      byPath('/camps'),
      byPath('/kiosks'),
    ],
  },
  {
    label: 'My community',
    items: [byPath('/asha-contact'), byPath('/alerts'), byPath('/village')],
  },
]

const ROLE_GROUPS: Record<Exclude<Role, 'patient'>, NavGroup[]> = {
  doctor: [
    {
      label: 'Clinical work',
      items: [
        { to: '/doctor', labelKey: '', fallback: 'My patients', icon: 'users', end: true },
        { to: '/doctor/emergencies', labelKey: '', fallback: 'Emergency cases', icon: 'siren' },
        { to: '/doctor/referrals', labelKey: '', fallback: 'Referrals', icon: 'route' },
      ],
    },
  ],
  asha: [
    {
      label: 'My work',
      items: [
        { to: '/asha', labelKey: '', fallback: 'Overview', icon: 'dashboard', end: true },
        { to: '/asha/patients', labelKey: '', fallback: 'My patients', icon: 'users' },
        { to: '/asha/households', labelKey: '', fallback: 'Households', icon: 'household' },
      ],
    },
    {
      label: 'Care coordination',
      items: [
        { to: '/asha/referrals', labelKey: '', fallback: 'Referrals', icon: 'route' },
        { to: '/asha/follow-ups', labelKey: '', fallback: 'Follow-ups', icon: 'calendarCheck' },
        { to: '/asha/preventive', labelKey: '', fallback: 'Preventive care', icon: 'shieldCheck' },
        { to: '/assisted', labelKey: '', fallback: 'Assisted mode', icon: 'stethoscope' },
      ],
    },
    {
      label: 'Field & community',
      items: [
        { to: '/asha/camps', labelKey: '', fallback: 'Medical camps', icon: 'tent' },
        { to: '/asha/nearby', labelKey: '', fallback: 'Nearby healthcare', icon: 'pin' },
        { to: '/asha/alerts', labelKey: '', fallback: 'Alerts', icon: 'megaphone' },
        { to: '/asha/offline', labelKey: '', fallback: 'Offline data', icon: 'cloudOff' },
      ],
    },
  ],
  facility: [
    {
      label: 'Operations',
      items: [
        { to: '/facility', labelKey: '', fallback: 'Overview', icon: 'dashboard', end: true },
        { to: '/facility/resources', labelKey: '', fallback: 'Resources', icon: 'toolbox' },
      ],
    },
    {
      label: 'Patient flow',
      items: [
        { to: '/facility/referrals', labelKey: '', fallback: 'Incoming referrals', icon: 'route' },
        { to: '/facility/emergency', labelKey: '', fallback: 'Emergency alerts', icon: 'siren' },
        { to: '/facility/camps', labelKey: '', fallback: 'Medical camps', icon: 'tent' },
      ],
    },
  ],
  admin: [
    {
      label: 'District overview',
      items: [
        { to: '/admin', labelKey: '', fallback: 'Overview', icon: 'dashboard', end: true },
        { to: '/admin/demand', labelKey: '', fallback: 'Demand map', icon: 'map' },
      ],
    },
    {
      label: 'Planning & response',
      items: [
        { to: '/admin/resources', labelKey: '', fallback: 'Resources', icon: 'toolbox' },
        { to: '/admin/referrals', labelKey: '', fallback: 'Referral analytics', icon: 'chart' },
        { to: '/admin/alerts', labelKey: '', fallback: 'Public health alerts', icon: 'megaphone' },
        { to: '/admin/camps', labelKey: '', fallback: 'Camps', icon: 'tent' },
      ],
    },
  ],
}

/** Extra routes that have no nav entry but still need a top-bar title. */
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/emergency$/, title: 'Emergency' },
  { match: /^\/consult\//, title: 'Video consultation' },
  { match: /^\/assisted$/, title: 'Assisted healthcare mode' },
  { match: /^\/doctor\/patient\//, title: 'Patient record' },
  { match: /^\/profile$/, title: 'Profile' },
]

function flatten(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items)
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT()
  const location = useLocation()
  const store = useAppStore()
  const user = currentUser(store)
  const [moreOpen, setMoreOpen] = useState(false)
  // The drawer is a navigation overlay, so it is scoped to the route it was
  // opened on: any navigation (including browser back) closes it, and that is
  // derived during render rather than patched up in an effect.
  const [drawer, setDrawer] = useState({ open: false, at: location.pathname })
  const drawerOpen = drawer.open && drawer.at === location.pathname
  const openDrawer = () => {
    setDrawer({ open: true, at: location.pathname })
  }
  const closeDrawer = () => {
    setDrawer({ open: false, at: location.pathname })
  }

  const isPatient = user.role === 'patient'
  const groups: NavGroup[] =
    user.role === 'patient' ? PATIENT_GROUPS : ROLE_GROUPS[user.role]
  const flatNav = flatten(groups)
  const dark = !isPatient
  // Doctors, facilities and the district office have their own emergency
  // screens in the nav; only the people who actually raise a request for a
  // patient get the standing red action.
  const raisesEmergency = user.role === 'patient' || user.role === 'asha'

  // Escape closes the drawer, and the page behind it must not scroll.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer((current) => ({ ...current, open: false }))
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [drawerOpen])

  // Page title for the top bar. Longest matching nav path wins, so
  // /asha/patients beats /asha.
  const matched = [...flatNav]
    .filter((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  const extra = EXTRA_TITLES.find((entry) => entry.match.test(location.pathname))
  const pageTitle = extra?.title ?? (matched ? (matched.labelKey ? t(matched.labelKey) : matched.fallback) : 'RuralCare AI')

  return (
    <div className={cx('min-h-screen bg-canvas', dark && 'shell-dark')}>
      {/* Prototype honesty banner - always visible, never dismissible. */}
      <div className="bg-ink-950 px-3 py-1.5 text-center text-2xs leading-snug font-medium tracking-wide text-white/85">
        {t('app.demoBanner')}
      </div>

      <div className="flex">
        {/* ---------- Desktop sidebar ---------- */}
        <div className="sticky top-0 hidden h-screen w-[16.5rem] shrink-0 lg:block">
          <SidebarPanel
            groups={groups}
            dark={dark}
            isPatient={isPatient}
            roleLabel={ROLE_LABEL[user.role]}
            homePath={ROLE_HOME[user.role]}
            showEmergency={raisesEmergency}
          />
        </div>

        {/* ---------- Main column ---------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-hairline bg-surface/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[86rem] items-center gap-2 px-3 sm:px-5 lg:px-8">
              <button
                type="button"
                onClick={openDrawer}
                aria-label="Open navigation menu"
                className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card text-ink-700 transition-colors hover:bg-canvas lg:hidden"
              >
                <Icon name="menu" size={20} />
              </button>

              {/* Brand shows on phones where the sidebar is hidden. */}
              <Link to={isPatient ? '/' : `/${user.role}`} className="flex items-center gap-2 lg:hidden">
                <BrandMark size="sm" />
                <span className="text-[15px] font-bold tracking-tight text-ink-900">
                  RuralCare<span className="text-care-600"> AI</span>
                </span>
              </Link>

              <div className="hidden min-w-0 lg:block">
                <p className="eyebrow text-ink-400">{ROLE_LABEL[user.role]}</p>
                <h2 className="truncate text-[15px] leading-tight font-semibold text-ink-900">
                  {pageTitle}
                </h2>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <span className="xl:hidden">
                  <ConnectionStatus compact />
                </span>
                <span className="hidden xl:block">
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
          </header>

          <main className="mx-auto w-full max-w-[86rem] flex-1 px-3 pt-5 pb-28 sm:px-5 sm:pt-6 lg:px-8 lg:pt-8 lg:pb-12">
            <div key={location.pathname} className="rc-fade-in">
              {children}
            </div>
          </main>

          <footer className="hidden border-t border-hairline bg-surface px-8 py-5 md:block">
            <div className="mx-auto flex max-w-[86rem] flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
              <p>
                <span className="font-semibold text-ink-700">RuralCare AI</span> · rural healthcare
                accessibility &amp; coordination prototype
              </p>
              <p>
                All patients, facilities, alerts and dispatches shown are fictional demo data · not
                connected to real emergency or government services
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="flex items-stretch">
          {(isPatient
            ? [PATIENT_PRIMARY[0], PATIENT_PRIMARY[1], PATIENT_PRIMARY[2], PATIENT_PRIMARY[4]]
            : flatNav.slice(0, 4)
          ).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-care-700' : 'text-ink-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-care-600"
                    />
                  ) : null}
                  <Icon name={item.icon} size={21} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="text-center leading-tight">
                    {item.labelKey ? t(item.labelKey) : item.fallback}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              setMoreOpen(true)
            }}
            className="flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[10px] font-semibold text-ink-500"
          >
            <Icon name="grid" size={21} />
            <span>{t('nav.more')}</span>
          </button>
          {raisesEmergency ? (
            <Link
              to="/emergency"
              className={cx(
                'flex flex-1 flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[10px] font-bold text-white transition-colors',
                location.pathname === '/emergency' ? 'bg-sos-700' : 'bg-sos-600',
              )}
            >
              <Icon name="siren" size={21} strokeWidth={2} />
              <span>{t('nav.emergency')}</span>
            </Link>
          ) : null}
        </div>
      </nav>

      {/* ---------- Mobile navigation drawer ---------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="rc-fade-in absolute inset-0 h-full w-full cursor-default bg-ink-950/50 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />
          <div className="rc-slide-in absolute inset-y-0 left-0 w-[18rem] max-w-[86vw] shadow-xl">
            <SidebarPanel
              groups={groups}
              dark={dark}
              isPatient={isPatient}
              roleLabel={ROLE_LABEL[user.role]}
              homePath={ROLE_HOME[user.role]}
              showEmergency={raisesEmergency}
              onNavigate={closeDrawer}
              onClose={closeDrawer}
            />
          </div>
        </div>
      ) : null}

      <MoreMenu
        open={moreOpen}
        onClose={() => {
          setMoreOpen(false)
        }}
        items={isPatient ? PATIENT_MORE : flatNav}
      />
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Sidebar
--------------------------------------------------------------------------- */

function BrandMark({ size = 'md', onDark }: { size?: 'sm' | 'md'; onDark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-card',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        onDark ? 'bg-care-500 text-white' : 'bg-care-600 text-white shadow-xs',
      )}
    >
      <Icon name="heartPulse" size={size === 'sm' ? 18 : 22} strokeWidth={1.9} />
    </span>
  )
}

function SidebarPanel({
  groups,
  dark,
  isPatient,
  roleLabel,
  homePath,
  showEmergency,
  onNavigate,
  onClose,
}: {
  groups: NavGroup[]
  dark: boolean
  isPatient: boolean
  roleLabel: string
  homePath: string
  showEmergency: boolean
  onNavigate?: () => void
  onClose?: () => void
}) {
  const t = useT()
  return (
    <div
      className={cx(
        'flex h-full flex-col border-r',
        dark ? 'rc-wash-shell border-shell-line bg-shell' : 'border-hairline bg-surface',
      )}
    >
      {/* Brand */}
      <div
        className={cx(
          'flex shrink-0 items-center gap-2.5 border-b px-4 py-4',
          dark ? 'border-shell-line' : 'border-hairline',
        )}
      >
        <Link to={homePath} onClick={onNavigate} className="flex min-w-0 items-center gap-2.5">
          <BrandMark onDark={dark} />
          <span className="min-w-0 leading-tight">
            <span
              className={cx(
                'block truncate text-[15px] font-bold tracking-tight',
                dark ? 'text-white' : 'text-ink-900',
              )}
            >
              RuralCare<span className={dark ? 'text-care-300' : 'text-care-600'}> AI</span>
            </span>
            <span
              className={cx('block truncate text-[11px]', dark ? 'text-white/55' : 'text-ink-500')}
            >
              {roleLabel}
            </span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className={cx(
              'ml-auto inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors',
              dark ? 'text-white/60 hover:bg-white/10' : 'text-ink-400 hover:bg-canvas',
            )}
          >
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3.5">
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p
              className={cx(
                'eyebrow mb-1.5 px-2.5',
                dark ? 'text-white/40' : 'text-ink-400',
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'group relative flex min-h-9 items-center gap-2.5 rounded-card px-2.5 text-[13.5px] font-medium transition-colors duration-[var(--duration-fast)]',
                        isActive
                          ? dark
                            ? 'bg-white/10 font-semibold text-white'
                            : 'bg-care-50 font-semibold text-care-800'
                          : dark
                            ? 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                            : 'text-ink-600 hover:bg-canvas hover:text-ink-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden="true"
                          className={cx(
                            'absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-colors',
                            isActive ? (dark ? 'bg-care-400' : 'bg-care-600') : 'bg-transparent',
                          )}
                        />
                        <Icon
                          name={item.icon}
                          size={18}
                          strokeWidth={isActive ? 2 : 1.7}
                          className={
                            isActive
                              ? dark
                                ? 'text-care-300'
                                : 'text-care-600'
                              : dark
                                ? 'text-white/45'
                                : 'text-ink-400'
                          }
                        />
                        <span className="truncate">
                          {item.labelKey ? t(item.labelKey) : item.fallback}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Emergency + profile */}
      <div
        className={cx(
          'shrink-0 space-y-2 border-t px-3 py-3',
          dark ? 'border-shell-line' : 'border-hairline',
        )}
      >
        {showEmergency ? (
          <Link
            to="/emergency"
            onClick={onNavigate}
            className="flex min-h-11 items-center justify-center gap-2 rounded-card bg-sos-600 px-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-sos-700"
          >
            <Icon name="siren" size={18} strokeWidth={2} />
            {t('nav.emergency')}
          </Link>
        ) : null}
        {isPatient ? (
          <NavLink
            to="/profile"
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex min-h-10 items-center gap-2.5 rounded-card px-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-care-50 text-care-800' : 'text-ink-600 hover:bg-canvas',
              )
            }
          >
            <Icon name="user" size={18} className="text-ink-400" />
            {t('nav.profile')}
          </NavLink>
        ) : null}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   "More" sheet - the full menu on phones.
--------------------------------------------------------------------------- */

function MoreMenu({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: NavItem[]
}) {
  const t = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('nav.more')} width="md">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  'flex min-h-13 items-center gap-3 rounded-card border px-3.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-care-200 bg-care-50 text-care-800'
                    : 'border-hairline bg-surface text-ink-800 hover:border-care-200 hover:bg-care-50',
                )
              }
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-care-50 text-care-700 ring-1 ring-care-100 ring-inset">
                <Icon name={item.icon} size={17} />
              </span>
              <span className="min-w-0 truncate">
                {item.labelKey ? t(item.labelKey) : item.fallback}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-3 border-t border-hairline pt-4">
        <div>
          <h3 className="eyebrow mb-2 text-ink-400">Language</h3>
          <LanguageSwitcher />
        </div>
        <div>
          <h3 className="eyebrow mb-2 text-ink-400">Connection</h3>
          <ConnectionStatus />
        </div>
      </div>
    </Dialog>
  )
}
