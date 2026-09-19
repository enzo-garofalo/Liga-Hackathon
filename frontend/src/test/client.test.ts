import { describe, expect, it } from 'vitest'
import { isAuthEndpoint } from '../api/client'

/**
 * Guarda do interceptor de 401.
 *
 * Um 401 vindo do login é senha errada, não sessão expirada. Antes desta guarda
 * o interceptor tentava renovar, não achava refresh token, e mandava a pessoa
 * para `/login` com `window.location` — o recarregamento apagava a mensagem de
 * erro antes de dar tempo de ler.
 */
describe('isAuthEndpoint', () => {
  it.each([
    '/auth/token/',
    '/auth/admin/token/',
    '/auth/token/refresh/',
  ])('%s não dispara renovação de sessão', (url) => {
    expect(isAuthEndpoint(url)).toBe(true)
  })

  it.each([
    '/me/',
    '/me/applications/',
    '/admin/processes/',
    '/deliverables/abc/download/',
    '/open-process/',
  ])('%s continua renovando a sessão quando expira', (url) => {
    // Contraprova: uma guarda ampla demais quebraria a renovação silenciosa.
    expect(isAuthEndpoint(url)).toBe(false)
  })

  it('não quebra quando a requisição não tem url', () => {
    expect(isAuthEndpoint(undefined)).toBe(false)
  })
})
