import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listParticipants, listTeams } from '../api/admin'
<<<<<<< HEAD
import { createProcess, listProcesses } from '../api/adminProcesses'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { makeProcess } from './fixtures'
=======
import {
  createProcess,
  getOrganizerProfile,
  listProcesses,
} from '../api/adminProcesses'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { makeOrganizerProfile, makeProcess } from './fixtures'
>>>>>>> feature/v3-processo-seletivo
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/adminProcesses', () => ({
  listProcesses: vi.fn(),
  getProcess: vi.fn(),
  createProcess: vi.fn(),
  updateProcess: vi.fn(),
  deleteProcess: vi.fn(),
  publishProcess: vi.fn(),
  closeProcess: vi.fn(),
  getOrganizerProfile: vi.fn(),
  updateOrganizerProfile: vi.fn(),
}))
// Hackathon: com SHOW_HACKATHON desligado, nenhuma destas pode ser chamada.
vi.mock('../api/admin', () => ({
  listTeams: vi.fn(),
  listParticipants: vi.fn(),
  approveTeam: vi.fn(),
  rejectTeam: vi.fn(),
}))
vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn().mockResolvedValue([]),
  markAsRead: vi.fn(),
}))

const published = makeProcess()
const draft = makeProcess({
  id: 'proc-2',
  name: 'PS Liga 2027.1',
  status: 'draft',
  published_at: null,
  application_count: 0,
  stage_count: 0,
})

describe('AdminDashboardPage', () => {
  beforeEach(() => {
<<<<<<< HEAD
=======
    vi.mocked(getOrganizerProfile).mockResolvedValue(makeOrganizerProfile())
>>>>>>> feature/v3-processo-seletivo
    vi.mocked(listProcesses).mockResolvedValue([published, draft])
  })

  it('lista os processos com inscritos e etapas', async () => {
    renderWithProviders(<AdminDashboardPage />)
    expect(await screen.findByText('PS Liga 2026.2')).toBeInTheDocument()
    expect(screen.getByText('7 inscritos')).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('todo processo leva à tela de gerenciamento, inclusive rascunho', async () => {
    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('PS Liga 2026.2')

    const links = screen.getAllByRole('link', { name: /gerenciar processo/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/admin/processes/proc-1')
    expect(links[1]).toHaveAttribute('href', '/admin/processes/proc-2')
  })

  it('o dashboard não publica: isso acontece dentro do processo', async () => {
    // Publicar exige etapa, e etapa só se configura na tela de gerenciamento.
    // Publicar pelo card deixava o rascunho sem saída.
    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('PS Liga 2027.1')

    expect(
      screen.queryByRole('button', { name: /abrir inscrições/i }),
    ).not.toBeInTheDocument()
  })

  it('cria processo como rascunho por padrão', async () => {
    vi.mocked(createProcess).mockResolvedValue(draft)
    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('PS Liga 2026.2')

    await userEvent.click(screen.getByRole('button', { name: /novo processo/i }))
    await userEvent.type(screen.getByLabelText(/nome do processo/i), 'PS 2027')
    await userEvent.type(screen.getByLabelText(/início das inscrições/i), '2027-08-01T09:00')
    await userEvent.type(screen.getByLabelText(/fim das inscrições/i), '2027-08-15T23:59')
    await userEvent.click(screen.getByRole('button', { name: /criar processo/i }))

    await waitFor(() =>
      expect(createProcess).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'PS 2027', status: 'draft' }),
      ),
    )
  })

  it('estado vazio quando não há processo', async () => {
    vi.mocked(listProcesses).mockResolvedValue([])
    renderWithProviders(<AdminDashboardPage />)
    expect(await screen.findByText('Nenhum processo seletivo ainda')).toBeInTheDocument()
  })

  it('erro de API mostra aviso em vez de estado vazio', async () => {
    vi.mocked(listProcesses).mockRejectedValue(httpError(500))
    renderWithProviders(<AdminDashboardPage />)

    expect(
      await screen.findByText('Não foi possível carregar os processos seletivos'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum processo seletivo ainda')).not.toBeInTheDocument()
  })

  it('hackathon desativado: sem abas de equipe e sem consultá-las', async () => {
    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('PS Liga 2026.2')

    expect(screen.queryByText('Equipes')).not.toBeInTheDocument()
    expect(screen.queryByText('Participantes')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(listTeams).not.toHaveBeenCalled()
      expect(listParticipants).not.toHaveBeenCalled()
    })
  })
})
