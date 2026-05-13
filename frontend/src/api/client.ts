import axios from 'axios'

// In production, VITE_API_URL is the backend's public Railway URL
// (e.g. https://liga-hackathon-backend.up.railway.app).
// In dev, it is empty and Vite's proxy handles /api requests.
const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
})

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client
