import { AxiosError, AxiosHeaders } from 'axios'

/** Erro no formato que o axios produz quando o backend responde `status`. */
export function httpError(status: number, data: unknown = {}) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('erro', String(status), config, null, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  })
}
