import axios from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, getSessionKind, setTokens } from '../auth/storage'

function resolveBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim()
  if (!raw) return '/api/v1'
  const origin = raw.startsWith('http') ? raw : `https://${raw}`
  return `${origin.replace(/\/$/, '')}/api/v1`
}

const BASE = resolveBase()

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// --- Silent token refresh ---
let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(err: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)))
  pendingQueue = []
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    // Skip non-401s, already-retried requests, and the refresh endpoint itself
    if (
      error.response?.status !== 401 ||
      original._retry ||
      (original.url as string | undefined)?.includes('/auth/token/refresh/')
    ) {
      return Promise.reject(error)
    }

    const refresh = getRefreshToken()
    if (!refresh) {
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return client(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const kind = getSessionKind()!
      // Use raw axios to avoid triggering this interceptor again
      const { data } = await axios.post(`${BASE}/auth/token/refresh/`, { refresh })
      const newAccess: string = data.access
      // simplejwt returns a new refresh token when ROTATE_REFRESH_TOKENS=True
      const newRefresh: string = data.refresh ?? refresh
      setTokens(newAccess, newRefresh, kind)
      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return client(original)
    } catch (err) {
      processQueue(err, null)
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

export default client
