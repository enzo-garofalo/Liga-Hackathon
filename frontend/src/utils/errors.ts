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
