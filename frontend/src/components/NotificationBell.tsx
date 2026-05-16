import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead, useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../types/notification'

const MAX_VISIBLE = 10

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

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()

  const notifications = (query.data ?? []).slice(0, MAX_VISIBLE)
  const unreadCount = (query.data ?? []).filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id)
    setOpen(false)
    if (n.link_to) navigate(n.link_to)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl hover:bg-brand/5 text-near-black"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-ui font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-[#dedee5] rounded-2xl shadow-whisper overflow-hidden z-10">
          <div className="px-4 py-3 border-b border-[#dedee5]">
            <p className="font-display font-semibold text-near-black">Notificações</p>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 font-ui text-sm text-silver-blue text-center">
              Nada por aqui ainda.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-[#dedee5]">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={[
                      'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                      n.read ? 'bg-white' : 'bg-brand/5',
                    ].join(' ')}
                  >
                    <p
                      className={[
                        'text-sm font-ui leading-snug',
                        n.read ? 'text-silver-blue' : 'text-near-black font-medium',
                      ].join(' ')}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-silver-blue font-ui mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
