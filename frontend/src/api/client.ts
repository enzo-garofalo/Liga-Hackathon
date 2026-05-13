import axios from 'axios'

// In production, VITE_API_URL is the backend's public Railway URL.
// Accepts with or without https:// — always normalised to absolute.
// In dev, leave it unset and Vite's proxy handles /api requests.
function resolveBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim()
  if (!raw) return '/api/v1'
  const origin = raw.startsWith('http') ? raw : `https://${raw}`
  return `${origin.replace(/\/$/, '')}/api/v1`
}

const client = axios.create({ baseURL: resolveBase() })

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client
