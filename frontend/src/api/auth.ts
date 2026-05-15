import type { LoginPayload, RegisterPayload, TokenPair } from '../types/auth'
import type { MeProfile } from '../types/participant'
import client from './client'

export const register = (payload: RegisterPayload) =>
  client.post<MeProfile>('/auth/register/', payload).then((r) => r.data)

export const login = (payload: LoginPayload) =>
  client.post<TokenPair>('/auth/token/', payload).then((r) => r.data)

export const adminLogin = (payload: LoginPayload) =>
  client.post<TokenPair>('/auth/admin/token/', payload).then((r) => r.data)

export const refreshToken = (refresh: string) =>
  client.post<{ access: string }>('/auth/token/refresh/', { refresh }).then((r) => r.data)
