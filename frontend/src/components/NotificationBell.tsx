import { Bell, CheckCircle2, Circle, Inbox, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead, useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../types/notification'

const MAX_VISIBLE = 10
const DISMISSED_READ_STORAGE_KEY = 'dismissed_read_notifications'

function loadDismissedReadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_READ_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveDismissedReadIds(ids: string[]) {
  localStorage.setItem(DISMISSED_READ_STORAGE_KEY, JSON.stringify(ids))
}

function relativeTime(iso: string): string {
  const created = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - created) / 1000))
  if (diffSec < 60) return 'agora'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? '1 dia' : `${diffD} dias`
}

const TONE_BRAND = [
  'team_invite',
  'join_request',
  'application_confirmed',
  'custom_communication',
]
const TONE_GREEN = [
  'invite_accepted',
  'join_accepted',
  'team_approved',
  'stage_advanced',
  'application_approved',
]
const TONE_RED = [
  'invite_declined',
  'join_declined',
  'team_rejected',
  'team_removed',
  'team_disbanded',
  'application_rejected',
]

function notificationTone(type: Notification['type']) {
  if (TONE_BRAND.includes(type)) return 'bg-brand'
  if (TONE_GREEN.includes(type)) return 'bg-brand-green'
  if (TONE_RED.includes(type)) return 'bg-red-500'
  return 'bg-ink/30'
}

interface NotificationBellProps {
  tone?: 'light' | 'dark'
  panelAlign?: 'left' | 'right'
}

export function NotificationBell({ tone = 'light', panelAlign = 'right' }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [dismissedReadIds, setDismissedReadIds] = useState<string[]>(loadDismissedReadIds)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()

  const notifications = useMemo(
    () =>
      [...(query.data ?? [])]
        .filter((notification) => !dismissedReadIds.includes(notification.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, MAX_VISIBLE),
    [dismissedReadIds, query.data],
  )
  const unreadCount = (query.data ?? []).filter((notification) => !notification.read).length
  const visibleReadCount = notifications.filter((notification) => notification.read).length

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id)
    if (notification.link_to) {
      setOpen(false)
      navigate(notification.link_to)
    }
  }

  const handleMarkRead = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id)
  }

  const handleClearRead = () => {
    const readIds = (query.data ?? [])
      .filter((notification) => notification.read)
      .map((notification) => notification.id)
    const nextDismissed = Array.from(new Set([...dismissedReadIds, ...readIds]))
    setDismissedReadIds(nextDismissed)
    saveDismissedReadIds(nextDismissed)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notificações"
        aria-expanded={open}
        className={[
          'relative inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          tone === 'dark'
            ? 'text-white/72 hover:bg-white/[0.08] hover:text-white'
            : 'text-near-black hover:bg-brand/5',
        ].join(' ')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-ui text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={[
            'notification-panel-enter fixed inset-x-4 top-16 z-[120] overflow-hidden rounded-2xl border border-ink/15 bg-white shadow-[0_24px_80px_rgba(7,13,25,0.22)]',
            'md:absolute md:inset-auto md:top-full md:mt-3 md:w-[24rem]',
            panelAlign === 'left' ? 'md:left-0' : 'md:right-0',
          ].join(' ')}
          role="dialog"
          aria-label="Central de notificações"
        >
          <div className="flex items-start justify-between gap-3 border-b border-ink/12 bg-white px-4 py-3.5">
            <div>
              <p className="font-display text-base font-semibold text-near-black">Notificações</p>
              <p className="mt-0.5 text-xs font-medium text-ink/70">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo lido'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearRead}
                disabled={visibleReadCount === 0}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpar lidas
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink/62 transition-colors hover:bg-ink/10 hover:text-ink"
                aria-label="Fechar notificações"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(28rem,calc(100vh-7rem))] overflow-y-auto">
            {query.isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/[0.06]" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <Inbox className="mb-3 h-9 w-9 text-ink/35" />
                <p className="font-ui text-sm font-semibold text-ink/75">Nada por aqui ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink/10">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={notification.read ? 'bg-white text-ink' : 'border-l-4 border-brand bg-brand/[0.09] text-ink'}
                  >
                    <div className="group flex gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.04]">
                      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${notificationTone(notification.type)}`} />
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-ui text-sm font-semibold leading-snug text-ink">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-ink/70">{relativeTime(notification.created_at)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification)}
                        disabled={notification.read || markRead.isPending}
                        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ink/55 transition-colors hover:bg-white hover:text-brand disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ink/55"
                        aria-label={notification.read ? 'Notificação lida' : 'Marcar como lida'}
                        title={notification.read ? 'Lida' : 'Marcar como lida'}
                      >
                        {notification.read ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
