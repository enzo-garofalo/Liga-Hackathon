import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  adminLogin,
  confirmPasswordReset,
  login,
  register,
  requestPasswordReset,
} from '../api/auth'
import { getMe } from '../api/me'
import {
  clearTokens,
  getAccessToken,
  getSessionKind,
  setTokens,
} from '../auth/storage'
import type {
  LoginPayload,
  PasswordResetConfirmPayload,
  PasswordResetRequestPayload,
  RegisterPayload,
} from '../types/auth'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: getSessionKind() === 'participant' && !!getAccessToken(),
    retry: false,
  })
}

export function useRegister() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      await register(payload)
      const tokens = await login({ email: payload.email, password: payload.password })
      setTokens(tokens.access, tokens.refresh, 'participant')
    },
    onSuccess: () => {
      navigate('/dashboard')
    },
  })
}

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const tokens = await login(payload)
      setTokens(tokens.access, tokens.refresh, 'participant')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      navigate('/dashboard')
    },
  })
}

export function useAdminLogin() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const tokens = await adminLogin(payload)
      setTokens(tokens.access, tokens.refresh, 'admin')
    },
    onSuccess: () => {
      navigate('/admin/dashboard')
    },
  })
}

/**
 * Pede o link de redefinição.
 *
 * Sem navegação no sucesso: a pessoa precisa ficar na tela para ler que o
 * e-mail saiu, e o próximo passo dela é na caixa de entrada, não aqui.
 */
export function usePasswordResetRequest() {
  return useMutation({
    mutationFn: (payload: PasswordResetRequestPayload) => requestPasswordReset(payload),
  })
}

/** Usa o link do e-mail para gravar a senha nova. */
export function usePasswordResetConfirm() {
  return useMutation({
    mutationFn: (payload: PasswordResetConfirmPayload) => confirmPasswordReset(payload),
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return () => {
    const wasAdmin = getSessionKind() === 'admin'
    clearTokens()
    queryClient.clear()
    navigate(wasAdmin ? '/admin/login' : '/')
  }
}
