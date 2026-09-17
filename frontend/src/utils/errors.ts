import { AxiosError } from 'axios'

export function getApiError(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as Record<string, unknown>
    if (data.detail) return String(data.detail)
    const values = Object.values(data)
    if (values.length > 0) {
      const first = values[0]
      return Array.isArray(first) ? String(first[0]) : String(first)
    }
  }
  return 'Ocorreu um erro. Tente novamente.'
}

/** True quando o backend respondeu 404 — o recurso não existe ou não é visível. */
export function isNotFound(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404
}

/**
 * Política de nova tentativa para consultas.
 *
 * Erro 4xx não se resolve tentando de novo — repetir só atrasa a tela de
 * "não encontrado" em alguns segundos. Falha de rede e 5xx merecem outra chance.
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  if (error instanceof AxiosError && error.response && error.response.status < 500) {
    return false
  }
  return failureCount < 2
}
