/**
 * O hackathon com a chave ligada.
 *
 * `CLAUDE.md` manda conferir o fluxo antigo com `SHOW_HACKATHON = true` sempre que
 * mexemos em arquivo compartilhado, e mexemos em vários ao longo da v3. Em vez de
 * uma conferência manual que ninguém repete, o flag é simulado aqui: a suíte roda
 * os dois estados a cada commit.
 */
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyApplications } from '../api/applications'
import { getInfo } from '../api/info'
import { listMyInvites } from '../api/invites'
import { getMe } from '../api/me'
import { getProcesses } from '../api/processes'
import { getOpenTeams } from '../api/teams'
import App from '../App'
import { DashboardPage } from '../pages/DashboardPage'
import { ProfilePage } from '../pages/ProfilePage'
import type { MeProfile } from '../types/participant'
import { renderWithProviders } from './render'

vi.mock('../featureFlags', () => ({ SHOW_HACKATHON: true }))

vi.mock('../api/me', () => ({ getMe: vi.fn(), updateMe: vi.fn() }))
vi.mock('../api/processes', () => ({
  getProcesses: vi.fn(),
  getProcess: vi.fn(),
  applyToProcess: vi.fn(),
}))
vi.mock('../api/applications', () => ({
  getMyApplications: vi.fn(),
  getMyApplication: vi.fn(),
  uploadDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  downloadDeliverable: vi.fn(),
}))
vi.mock('../api/info', () => ({ getInfo: vi.fn() }))
vi.mock('../api/invites', () => ({
  listMyInvites: vi.fn(),
  createInvite: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
}))
vi.mock('../api/teams', () => ({ getOpenTeams: vi.fn() }))
vi.mock('../api/openProcess', () => ({ getOpenProcess: vi.fn() }))

const me: MeProfile = {
  id: 'p-1',
  full_name: 'Paula Dias',
  phone: null,
  course: 'Engenharia de Software',
  semester: 2,
  bio: 'Curiosa por produto.',
  github: null,
  linkedin: null,
  email: 'paula@aluno.dev',
  has_team: false,
  team: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

describe('com SHOW_HACKATHON ligado', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue(me)
    vi.mocked(getMyApplications).mockResolvedValue([])
    vi.mocked(getProcesses).mockResolvedValue([])
    vi.mocked(listMyInvites).mockResolvedValue([])
    vi.mocked(getOpenTeams).mockResolvedValue([])
    vi.mocked(getInfo).mockResolvedValue({
      id: 'i-1',
      title: 'Hackathon',
      description: '',
      rules: '',
      schedule: '',
      prizes: '',
directions: '',
    } as never)
  })

  it('o dashboard do candidato volta a mostrar o bloco de equipes', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Sem equipe')).toBeInTheDocument()
    expect(screen.getByText('Equipes abertas')).toBeInTheDocument()
  })

  it('o dashboard volta a consultar os endpoints do hackathon', async () => {
    // Com a chave desligada nenhuma destas pode ser chamada; ligada, todas devem.
    renderWithProviders(<DashboardPage />)

    await waitFor(() => expect(listMyInvites).toHaveBeenCalled())
    expect(getOpenTeams).toHaveBeenCalled()
  })

  it('o perfil volta a mostrar o selo de equipe', async () => {
    renderWithProviders(<ProfilePage />)
    expect(await screen.findByText('Sem equipe')).toBeInTheDocument()
  })

  it('a rota / passa a servir a landing do hackathon', () => {
    // Renderiza o App de verdade: é ele que escolhe entre as duas landings.
    renderWithProviders(<App />, { route: '/' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hackathon #01')
  })
})
