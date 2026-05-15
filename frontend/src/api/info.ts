import type { HackathonInfo } from '../types/info'
import client from './client'

export const getInfo = () => client.get<HackathonInfo>('/info/').then((r) => r.data)
