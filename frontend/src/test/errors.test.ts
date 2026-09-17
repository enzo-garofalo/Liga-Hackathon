import { describe, expect, it } from 'vitest'
import { getApiError, isNotFound, retryUnlessClientError } from '../utils/errors'
import { httpError } from './http'

describe('getApiError', () => {
  it('lê o detail do DRF', () => {
    expect(getApiError(httpError(403, { detail: 'Sem permissão.' }))).toBe('Sem permissão.')
  })

  it('lê a lista que o ValidationError do DRF devolve', () => {
    expect(getApiError(httpError(400, ['Inscrições encerradas.']))).toBe('Inscrições encerradas.')
  })

  it('cai na mensagem genérica sem resposta do servidor', () => {
    expect(getApiError(new Error('network'))).toBe('Ocorreu um erro. Tente novamente.')
  })
})

describe('isNotFound', () => {
  it('reconhece 404', () => {
    expect(isNotFound(httpError(404))).toBe(true)
  })

  it('não confunde 500 com 404', () => {
    expect(isNotFound(httpError(500))).toBe(false)
  })
})

describe('retryUnlessClientError', () => {
  it('não repete erro 4xx', () => {
    expect(retryUnlessClientError(0, httpError(404))).toBe(false)
    expect(retryUnlessClientError(0, httpError(403))).toBe(false)
  })

  it('repete erro 5xx até duas vezes', () => {
    expect(retryUnlessClientError(0, httpError(500))).toBe(true)
    expect(retryUnlessClientError(1, httpError(500))).toBe(true)
    expect(retryUnlessClientError(2, httpError(500))).toBe(false)
  })

  it('repete falha de rede', () => {
    expect(retryUnlessClientError(0, new Error('network'))).toBe(true)
  })
})
