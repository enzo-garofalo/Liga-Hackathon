import type {
  LoginPayload,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  PasswordResetResult,
  RegisterPayload,
  TokenPair,
} from '../types/auth'
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

export const requestPasswordReset = (payload: PasswordResetRequestPayload) =>
  client
    .post<{ detail: string }>('/auth/password-reset/', payload)
    .then((r) => r.data)

export const confirmPasswordReset = (payload: PasswordResetConfirmPayload) =>
  client
    .post<PasswordResetResult>('/auth/password-reset/confirm/', payload)
    .then((r) => r.data)
