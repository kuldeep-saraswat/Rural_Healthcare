import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/States'
import { Toggle } from '@/components/ui/Form'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'
import { runPrototypeSync, useAppStore } from '@/store/useAppStore'
import { currentUser, notificationsFor, unreadCount } from '@/store/selectors'
import { ROLE_HOME, ROLE_LABEL } from '@/services/permissions'
import { LANGUAGES } from '@/services/i18n'
import { connectionLabel, setOfflineSimulation } from '@/services/connectivity'
import { storageBackendName } from '@/services/offline/db'
import { cx, formatDateTime } from '@/lib/utils'

/** Shared chrome button shape, so every header control lines up exactly. */
const CHROME =
  'inline-flex h-10 items-center justify-center rounded-card border border-hairline bg-surface text-ink-600 shadow-xs transition-colors hover:border-hairline-strong hover:bg-canvas hover:text-ink-900'

export function LanguageSwitcher() {
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  return (
    <div
      role="group"
      aria-label="Choose language"
      className="inline-flex items-center gap-0.5 rounded-card border border-hairline bg-canvas p-0.5"
    >
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          aria-pressed={language === option.code}
          onClick={() => {
            setLanguage(option.code)
          }}
          className={cx(
            'min-h-8 rounded-sm px-2.5 text-[13px] font-semibold transition-colors',
            language === option.code
              ? 'bg-surface text-care-700 shadow-xs'
              : 'text-ink-500 hover:text-ink-900',
          )}
        >
          {option.nativeLabel}
        </button>
      ))}
    </div>
  )
}

const CONNECTION: Record<
  'online' | 'offline' | 'syncing' | 'synced',
  { tone: 'ok' | 'warn' | 'info'; text: string; icon: IconName }
> = {
  online: { tone: 'ok', text: 'Online', icon: 'wifi' },
  offline: { tone: 'warn', text: 'Offline', icon: 'wifiOff' },
  syncing: { tone: 'info', text: 'Syncing...', icon: 'sync' },
  synced: { tone: 'ok', text: 'Synced', icon: 'checkCircle' },
}

export function ConnectionStatus({ compact }: { compact?: boolean }) {
  const browserOnline = useAppStore((s) => s.browserOnline)
  const simulatedOffline = useAppStore((s) => s.simulatedOffline)
  const syncState = useAppStore((s) => s.syncState)
  const lowConnectivity = useAppStore((s) => s.lowConnectivity)
  const queue = useAppStore((s) => s.offlineQueue)
  const label = connectionLabel({ browserOnline, simulatedOffline, syncState })
  const pending = queue.filter((q) => q.status !== 'synced').length
  const { tone, text, icon } = CONNECTION[label]

  if (compact) {
    // Phone header: only shown when there is something to say.
    if (label === 'online' && pending === 0 && !lowConnectivity) return null
    return (
      <Badge tone={tone} icon={icon} size="sm">
        {text}
        {pending > 0 && label !== 'syncing' ? ` · ${pending}` : ''}
      </Badge>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <Badge tone={tone} icon={icon}>
        {text}
        {pending > 0 && label !== 'syncing' ? ` · ${pending} queued` : ''}
      </Badge>
      {lowConnectivity ? (
        <Badge tone="neutral" icon="leaf">
          Low data mode
        </Badge>
      ) : null}
    </span>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const store = useAppStore()
  const user = currentUser(store)
  const list = notificationsFor(store.notifications, user.id)
  const unread = unreadCount(store.notifications, user.id)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className={cx(CHROME, 'relative w-10')}
      >
        <Icon name="bell" size={19} />
        {unread > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sos-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {unread}
          </span>
        ) : null}
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Notifications"
        description={`For ${user.name} (${ROLE_LABEL[user.role]})`}
        footer={
          <>
            <Button
              onClick={() => {
                store.markAllNotificationsRead(user.id)
              }}
            >
              Mark all read
            </Button>
            <Button
              tone="primary"
              onClick={() => {
                setOpen(false)
              }}
            >
              Close
            </Button>
          </>
        }
      >
        {list.length === 0 ? (
          <EmptyState
            icon="bell"
            title="No notifications yet"
            body="Alerts, reminders and coordination updates appear here."
            compact
          />
        ) : (
          <ul className="space-y-2">
            {list.map((notification) => (
              <li
                key={notification.id}
                className={cx(
                  'rounded-card border p-3.5 transition-colors',
                  notification.read
                    ? 'border-hairline bg-surface'
                    : 'border-care-200 bg-care-50/70',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                      {notification.body}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-400">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read ? (
                    <Badge tone="info" size="sm">
                      New
                    </Badge>
                  ) : null}
                </div>
                {notification.actionPath ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      tone="subtle"
                      iconAfter={<Icon name="arrowRight" size={14} />}
                      onClick={() => {
                        store.markNotificationRead(notification.id)
                        setOpen(false)
                        navigate(notification.actionPath!)
                      }}
                    >
                      {notification.actionLabel ?? 'Open'}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  )
}

export function RoleSwitcher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const users = useAppStore((s) => s.users)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const login = useAppStore((s) => s.login)
  const active = users.find((u) => u.id === currentUserId) ?? users[0]

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className={cx(CHROME, 'gap-2 pr-2 pl-1.5 sm:pr-2.5')}
        aria-label={`Signed in as ${active.name}. Change demo account`}
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-care-100 text-xs font-bold text-care-800"
        >
          {active.name.slice(0, 1)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[9rem] truncate text-[13px] leading-tight font-semibold text-ink-900">
            {active.name}
          </span>
          <span className="block text-[11px] leading-tight text-ink-500">
            {ROLE_LABEL[active.role]}
          </span>
        </span>
        <Icon name="chevronDown" size={14} className="hidden text-ink-400 sm:block" />
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Switch demo account"
        description="Roles are simulated for the prototype. Each role sees only what it is authorised to see."
      >
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  login(user.id)
                  setOpen(false)
                  navigate(ROLE_HOME[user.role])
                }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-card border p-3 text-left transition-colors',
                  user.id === currentUserId
                    ? 'border-care-300 bg-care-50 ring-1 ring-care-200'
                    : 'border-hairline bg-surface hover:border-care-200 hover:bg-care-50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    user.id === currentUserId
                      ? 'bg-care-600 text-white'
                      : 'bg-ink-100 text-ink-600',
                  )}
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {user.name}
                  </span>
                  <span className="block truncate text-xs text-ink-500">{user.subtitle}</span>
                </span>
                <Badge tone={user.id === currentUserId ? 'care' : 'neutral'} size="sm">
                  {ROLE_LABEL[user.role]}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  )
}

/** Connection + low-data controls, exposed in the header settings dialog. */
export function ConnectivityControls() {
  const simulatedOffline = useAppStore((s) => s.simulatedOffline)
  const lowConnectivity = useAppStore((s) => s.lowConnectivity)
  const setLowConnectivity = useAppStore((s) => s.setLowConnectivity)
  const browserOnline = useAppStore((s) => s.browserOnline)
  const queue = useAppStore((s) => s.offlineQueue)
  const lastSyncAt = useAppStore((s) => s.lastSyncAt)
  const pending = queue.filter((q) => q.status !== 'synced').length

  return (
    <div>
      <Toggle
        label="Simulate offline"
        description="Behave as if there is no network, so the offline ASHA workflow can be demonstrated on a connected machine."
        checked={simulatedOffline}
        onChange={setOfflineSimulation}
      />
      <Toggle
        label="Low connectivity mode"
        description="Show only essential content, use cached facility data and queue actions instead of loading extras."
        checked={lowConnectivity}
        onChange={setLowConnectivity}
      />
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-card border border-hairline bg-canvas p-3.5 text-sm">
        <div>
          <dt className="eyebrow text-ink-400">Storage backend</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{storageBackendName()}</dd>
        </div>
        <div>
          <dt className="eyebrow text-ink-400">Queued actions</dt>
          <dd className="mt-0.5 font-semibold text-ink-900 tabular-nums">{pending}</dd>
        </div>
        {lastSyncAt ? (
          <div className="col-span-2">
            <dt className="eyebrow text-ink-400">Last demo sync</dt>
            <dd className="mt-0.5 text-ink-700">{formatDateTime(lastSyncAt)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        Sync is a prototype simulation inside this browser. Nothing is sent to a server.
      </p>
      {pending > 0 ? (
        <div className="mt-3">
          <Button
            tone="primary"
            icon={<Icon name="sync" size={16} />}
            disabled={!browserOnline || simulatedOffline}
            onClick={() => {
              void runPrototypeSync()
            }}
          >
            Sync now (demo)
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const resetDemoData = useAppStore((s) => s.resetDemoData)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        aria-label="Settings, connection and demo data"
        className={cx(CHROME, 'w-10')}
      >
        <Icon name="settings" size={19} />
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Settings"
        description="Language, connectivity and demo data controls."
        footer={
          <Button
            tone="primary"
            onClick={() => {
              setOpen(false)
            }}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-6">
          <section>
            <h3 className="eyebrow mb-2 text-ink-400">Language</h3>
            <LanguageSwitcher />
          </section>
          <section>
            <h3 className="eyebrow mb-1 text-ink-400">Connection</h3>
            <ConnectivityControls />
          </section>
          <section>
            <h3 className="eyebrow mb-2 text-ink-400">Demo data</h3>
            <p className="mb-3 text-sm leading-relaxed text-ink-500">
              Resets every patient, facility, referral and alert back to the original fictional
              dataset.
            </p>
            <Button
              tone="danger"
              icon={<Icon name="refresh" size={16} />}
              onClick={() => {
                resetDemoData()
                setOpen(false)
              }}
            >
              Reset demo data
            </Button>
          </section>
        </div>
      </Dialog>
    </>
  )
}
