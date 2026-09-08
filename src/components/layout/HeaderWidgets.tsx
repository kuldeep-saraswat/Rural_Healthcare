import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/States'
import { Toggle } from '@/components/ui/Form'
import { runPrototypeSync, useAppStore } from '@/store/useAppStore'
import { currentUser, notificationsFor, unreadCount } from '@/store/selectors'
import { ROLE_HOME, ROLE_LABEL } from '@/services/permissions'
import { LANGUAGES } from '@/services/i18n'
import { connectionLabel, setOfflineSimulation } from '@/services/connectivity'
import { storageBackendName } from '@/services/offline/db'
import { cx, formatDateTime } from '@/lib/utils'

export function LanguageSwitcher() {
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  return (
    <div
      role="group"
      aria-label="Choose language"
      className="flex items-center gap-1 rounded-card border border-hairline bg-surface p-0.5"
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
            'min-h-9 rounded-[10px] px-2.5 text-sm font-semibold',
            language === option.code
              ? 'bg-care-600 text-white'
              : 'text-ink-700 hover:bg-care-50',
          )}
        >
          {option.nativeLabel}
        </button>
      ))}
    </div>
  )
}

export function ConnectionStatus() {
  const browserOnline = useAppStore((s) => s.browserOnline)
  const simulatedOffline = useAppStore((s) => s.simulatedOffline)
  const syncState = useAppStore((s) => s.syncState)
  const lowConnectivity = useAppStore((s) => s.lowConnectivity)
  const queue = useAppStore((s) => s.offlineQueue)
  const label = connectionLabel({ browserOnline, simulatedOffline, syncState })
  const pending = queue.filter((q) => q.status !== 'synced').length

  const map = {
    online: { tone: 'ok' as const, text: 'Online' },
    offline: { tone: 'warn' as const, text: 'Offline' },
    syncing: { tone: 'info' as const, text: 'Syncing...' },
    synced: { tone: 'ok' as const, text: 'Synced' },
  }
  const { tone, text } = map[label]

  return (
    <span className="flex items-center gap-1.5">
      <Badge tone={tone}>
        {text}
        {pending > 0 && label !== 'syncing' ? ` · ${pending} queued` : ''}
      </Badge>
      {lowConnectivity ? <Badge tone="neutral">Low data mode</Badge> : null}
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
        className="relative min-h-11 min-w-11 rounded-card border border-hairline bg-surface px-3 text-lg hover:bg-care-50"
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sos-600 px-1 text-xs font-bold text-white">
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
          <EmptyState icon="🔔" title="No notifications yet" body="Alerts and reminders appear here." />
        ) : (
          <ul className="space-y-2">
            {list.map((notification) => (
              <li
                key={notification.id}
                className={cx(
                  'rounded-card border p-3',
                  notification.read ? 'border-hairline bg-surface' : 'border-care-200 bg-care-50',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-ink-700">{notification.body}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read ? <Badge tone="info">New</Badge> : null}
                </div>
                {notification.actionPath ? (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      tone="primary"
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
        className="flex min-h-11 items-center gap-2 rounded-card border border-hairline bg-surface px-3 text-left hover:bg-care-50"
        aria-label={`Signed in as ${active.name}. Change demo account`}
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-care-100 text-sm font-bold text-care-700"
        >
          {active.name.slice(0, 1)}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold text-ink-900">{active.name}</span>
          <span className="block text-xs text-ink-500">{ROLE_LABEL[active.role]}</span>
        </span>
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
                  'flex w-full items-center justify-between gap-3 rounded-card border p-3 text-left',
                  user.id === currentUserId
                    ? 'border-care-600 bg-care-50'
                    : 'border-hairline bg-surface hover:bg-care-50',
                )}
              >
                <span>
                  <span className="block font-semibold text-ink-900">{user.name}</span>
                  <span className="block text-sm text-ink-500">{user.subtitle}</span>
                </span>
                <Badge tone={user.id === currentUserId ? 'ok' : 'neutral'}>
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
      <div className="mt-3 rounded-card border border-hairline bg-canvas p-3 text-sm text-ink-700">
        <p>
          Offline storage backend: <strong>{storageBackendName()}</strong>
        </p>
        <p className="mt-1">
          Queued actions: <strong>{pending}</strong>
          {lastSyncAt ? ` · last demo sync ${formatDateTime(lastSyncAt)}` : ''}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Sync is a prototype simulation inside this browser. Nothing is sent to a server.
        </p>
      </div>
      {pending > 0 ? (
        <div className="mt-3">
          <Button
            tone="primary"
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
        className="min-h-11 min-w-11 rounded-card border border-hairline bg-surface px-3 text-lg hover:bg-care-50"
      >
        <span aria-hidden="true">⚙️</span>
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
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Language</h3>
            <LanguageSwitcher />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-ink-700">Connection</h3>
            <ConnectivityControls />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">Demo data</h3>
            <p className="mb-2 text-sm text-ink-500">
              Resets every patient, facility, referral and alert back to the original fictional
              dataset.
            </p>
            <Button
              tone="danger"
              onClick={() => {
                resetDemoData()
                setOpen(false)
              }}
            >
              Reset demo data
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
