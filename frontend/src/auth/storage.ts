export type SessionKind = 'participant' | 'admin'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const ACTIVE_STORE_KEY = 'auth_active_store'

function storageFor(kind: SessionKind): Storage {
  return kind === 'participant' ? localStorage : sessionStorage
}

export function getSessionKind(): SessionKind | null {
  return (localStorage.getItem(ACTIVE_STORE_KEY) as SessionKind | null) ?? null
}

export function setTokens(access: string, refresh: string, kind: SessionKind): void {
  const store = storageFor(kind)
  store.setItem(ACCESS_KEY, access)
  store.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(ACTIVE_STORE_KEY, kind)
}

export function getAccessToken(): string | null {
  const kind = getSessionKind()
  if (!kind) return null
  return storageFor(kind).getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  const kind = getSessionKind()
  if (!kind) return null
  return storageFor(kind).getItem(REFRESH_KEY)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(ACTIVE_STORE_KEY)
}
