export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  course: string
  semester: number
  bio: string
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
