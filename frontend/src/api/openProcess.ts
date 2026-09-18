import client from './client'

/** O que a landing pode saber sem ninguem estar logado. */
export interface OpenProcess {
  name: string
  registration_start: string
  registration_end: string
  registration_open: boolean
}

/** `null` quando nao ha processo publicado — a landing omite as datas. */
export const getOpenProcess = () =>
  client.get<OpenProcess | null>('/open-process/').then((r) => r.data ?? null)
