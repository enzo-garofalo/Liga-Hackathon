import type { Notification } from '../types/notification'
import client from './client'

export const list = (unreadOnly = false) =>
  client
    .get<Notification[]>('/me/notifications/', {
      params: unreadOnly ? { unread: 'true' } : undefined,
    })
    .then((r) => r.data)

export const markRead = (id: string) =>
  client.patch<Notification>(`/me/notifications/${id}/read/`).then((r) => r.data)
