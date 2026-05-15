import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminLogin, login, register } from '../api/auth'
import { getMe } from '../api/me'
import {
  clearTokens,
  getAccessToken,
  getSessionKind,
  setTokens,
} from '../auth/storage'
import type { LoginPayload, RegisterPayload } from '../types/auth'

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
