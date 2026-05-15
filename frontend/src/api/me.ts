import type { MeProfile, UpdateMePayload } from '../types/participant'
import client from './client'

export const getMe = () => client.get<MeProfile>('/me/').then((r) => r.data)

export const updateMe = (payload: UpdateMePayload) =>
  client.patch<MeProfile>('/me/', payload).then((r) => r.data)
