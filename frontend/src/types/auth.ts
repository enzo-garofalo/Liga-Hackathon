export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  course: string
  semester: number
  bio: string
  phone?: string
  github?: string
  linkedin?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface PasswordResetRequestPayload {
  email: string
}

export interface PasswordResetConfirmPayload {
  uid: string
  token: string
  password: string
}

export interface PasswordResetResult {
  detail: string
  /** De qual porta é a conta, para a tela oferecer a entrada certa depois. */
  area: 'candidato' | 'organizador'
}
