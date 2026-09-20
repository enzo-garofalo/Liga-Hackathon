import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyApplications } from '../api/applications'
import { getInfo } from '../api/info'
import { listMyInvites } from '../api/invites'
import { getMe } from '../api/me'
import { getProcesses } from '../api/processes'
import { getOpenTeams } from '../api/teams'
import { DashboardPage } from '../pages/DashboardPage'
import type { ApplicationSummary } from '../types/application'
import type { MeProfile } from '../types/participant'
import type { ProcessSummary } from '../types/process'
import { WHATSAPP_LINK } from '../links'
import { httpError } from './http'
import { renderWithProviders } from './render'

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
// Hackathon: com SHOW_HACKATHON desligado, nenhuma destas pode ser chamada.
vi.mock('../api/info', () => ({ getInfo: vi.fn() }))
vi.mock('../api/invites', () => ({
  listMyInvites: vi.fn(),
  createInvite: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
}))
vi.mock('../api/teams', () => ({ getOpenTeams: vi.fn() }))

const me: MeProfile = {
  id: 'p-1',
  full_name: 'Paula Dias',
  phone: null,
  course: 'Engenharia de Software',
  semester: 2,
  bio: '',
  github: null,
  linkedin: null,
  email: 'paula@aluno.dev',
  has_team: false,
  team: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

const application: ApplicationSummary = {
  id: 'app-1',
  process_id: 'proc-1',
  process_name: 'PS Liga 2026.2',
  status: 'in_progress',
  current_stage: 'stage-2',
  current_stage_name: 'Resolução do Case',
  stage_count: 4,
  submitted_at: '2026-08-02T12:00:00Z',
  updated_at: '2026-08-10T12:00:00Z',
}

const openProcess: ProcessSummary = {
  id: 'proc-2',
  name: 'PS Liga 2027.1',
  short_description: 'Venha para a Liga.',
  banner: null,
  registration_start: '2026-09-01T12:00:00Z',
  registration_end: '2026-09-30T12:00:00Z',
  registration_open: true,
  stage_count: 3,
  already_applied: false,
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue(me)
    vi.mocked(getMyApplications).mockResolvedValue([application])
    vi.mocked(getProcesses).mockResolvedValue([
      { ...openProcess, id: 'proc-1', name: 'PS Liga 2026.2', already_applied: true },
      openProcess,
    ])
  })

  it('cumprimenta pelo primeiro nome', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Paula.')).toBeInTheDocument()
  })

  it('mostra "Meus processos" com a candidatura', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Meus processos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver candidatura/i })).toHaveAttribute(
      'href',
      '/applications/app-1',
    )
  })

  it('"Processos disponíveis" não repete processo em que já se inscreveu', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Processos disponíveis')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /ver detalhes/i })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/processes/proc-2')
  })

  it('pílulas refletem a candidatura ativa', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Meus processos')

    const pill = (label: string) =>
      screen.getByText(label).closest('div') as HTMLElement

    expect(within(pill('Minha candidatura')).getByText('Em andamento')).toBeInTheDocument()
    expect(within(pill('Etapa atual')).getByText('Resolução do Case')).toBeInTheDocument()
    expect(within(pill('Processos abertos')).getByText('1 disponível')).toBeInTheDocument()
  })

  it('estado vazio quando não há candidatura nem processo aberto', async () => {
    vi.mocked(getMyApplications).mockResolvedValue([])
    vi.mocked(getProcesses).mockResolvedValue([])

    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Nenhum processo aberto no momento')).toBeInTheDocument()
    expect(screen.getByText('Sem inscrição')).toBeInTheDocument()
  })

  it('erro da API mostra aviso — e não o estado vazio', async () => {
    // Sem candidatura: sem a protecao contra erro, a tela cairia exatamente no
    // estado vazio. Com candidatura, o estado vazio nunca apareceria e o teste
    // passaria mesmo com o bug.
    vi.mocked(getMyApplications).mockResolvedValue([])
    vi.mocked(getProcesses).mockRejectedValue(httpError(500))

    renderWithProviders(<DashboardPage />)

    expect(
      await screen.findByText('Não foi possível carregar os processos seletivos'),
    ).toBeInTheDocument()
    // Afirmar "nenhum processo aberto" aqui seria mentir para o candidato.
    expect(screen.queryByText('Nenhum processo aberto no momento')).not.toBeInTheDocument()
    expect(screen.queryByText('Sem inscrição')).not.toBeInTheDocument()
  })

  it('"Tentar novamente" refaz as consultas', async () => {
    vi.mocked(getProcesses).mockRejectedValueOnce(httpError(500))
    vi.mocked(getProcesses).mockRejectedValueOnce(httpError(500))
    vi.mocked(getProcesses).mockRejectedValueOnce(httpError(500))

    renderWithProviders(<DashboardPage />)
    await userEvent.click(await screen.findByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Processos disponíveis')).toBeInTheDocument()
  })

  it('hackathon desativado: nada de equipe na tela', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Meus processos')

    expect(screen.queryByText('Equipes abertas')).not.toBeInTheDocument()
    expect(screen.queryByText('Convites')).not.toBeInTheDocument()
    expect(screen.queryByText(/não está em uma equipe/i)).not.toBeInTheDocument()
  })

  it('hackathon desativado: nenhuma consulta de equipe, convite ou prazo', async () => {
    renderWithProviders(<DashboardPage />)
    await screen.findByText('Meus processos')

    await waitFor(() => {
      expect(getOpenTeams).not.toHaveBeenCalled()
      expect(listMyInvites).not.toHaveBeenCalled()
      expect(getInfo).not.toHaveBeenCalled()
    })
  })
})

// ── Quem criou conta mas não se inscreveu ─────────────────────────
//
// Criar conta não é se inscrever, e é fácil achar que sim: a pessoa preencheu
// um formulário, recebeu e-mail e caiu aqui. Antes, o único sinal era uma
// pílula cinza dizendo "Sem inscrição".

describe('DashboardPage: ainda não se inscreveu', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue(me)
    vi.mocked(getMyApplications).mockResolvedValue([])
    vi.mocked(getProcesses).mockResolvedValue([openProcess])
  })

  it('avisa em destaque que falta se inscrever', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Você ainda não se inscreveu')).toBeInTheDocument()
    expect(
      screen.getByText(/Criar a conta não inscreve ninguém no processo seletivo/),
    ).toBeInTheDocument()
  })

  it('diz até quando dá para se inscrever', async () => {
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText(/As inscrições vão até 30\/09/)).toBeInTheDocument()
  })

  it('leva direto ao processo quando só há um aberto', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('link', { name: /quero me inscrever/i })).toHaveAttribute(
      'href',
      '/processes/proc-2',
    )
  })

  it('com mais de um processo aberto, leva à lista', async () => {
    vi.mocked(getProcesses).mockResolvedValue([
      openProcess,
      { ...openProcess, id: 'proc-3', name: 'PS Liga 2027.2' },
    ])
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('link', { name: /quero me inscrever/i })).toHaveAttribute(
      'href',
      '#processos-disponiveis',
    )
  })

  it('quem já se inscreveu não vê o aviso', async () => {
    vi.mocked(getMyApplications).mockResolvedValue([application])
    renderWithProviders(<DashboardPage />)

    await screen.findByText('Meus processos')
    expect(screen.queryByText('Você ainda não se inscreveu')).not.toBeInTheDocument()
  })

  it('quem cancelou a inscrição volta a ver o aviso', async () => {
    // Cancelar devolve a pessoa à condição de quem não se inscreveu, e é
    // justamente quando ela pode achar que ainda está no processo. A
    // candidatura cancelada continua na lista, então sem tratar o status o
    // aviso ficaria escondido por ela.
    vi.mocked(getMyApplications).mockResolvedValue([
      { ...application, status: 'withdrawn' },
    ])
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('Você ainda não se inscreveu')).toBeInTheDocument()
  })

  it('sem inscrição aberta, não cobra o que não dá para fazer', async () => {
    vi.mocked(getProcesses).mockResolvedValue([
      { ...openProcess, registration_open: false },
    ])
    renderWithProviders(<DashboardPage />)

    await screen.findByText('Processos disponíveis')
    expect(screen.queryByText('Você ainda não se inscreveu')).not.toBeInTheDocument()
  })

  it('não acusa "não inscrito" enquanto ainda está carregando', async () => {
    // Um flash de "você não se inscreveu" para quem está inscrito é pior que
    // não avisar nada.
    let liberar: (v: ApplicationSummary[]) => void = () => {}
    vi.mocked(getMyApplications).mockReturnValue(
      new Promise((resolve) => {
        liberar = resolve
      }),
    )
    renderWithProviders(<DashboardPage />)

    expect(screen.queryByText('Você ainda não se inscreveu')).not.toBeInTheDocument()

    liberar([application])
    await screen.findByText('Meus processos')
    expect(screen.queryByText('Você ainda não se inscreveu')).not.toBeInTheDocument()
  })

  it('com falha na API, não afirma que a pessoa não se inscreveu', async () => {
    vi.mocked(getMyApplications).mockRejectedValue(httpError(500))
    renderWithProviders(<DashboardPage />)

    await waitFor(() =>
      expect(screen.queryByText('Você ainda não se inscreveu')).not.toBeInTheDocument(),
    )
  })
})

describe('DashboardPage: grupo no WhatsApp', () => {
  beforeEach(() => {
    vi.mocked(getMe).mockResolvedValue(me)
    vi.mocked(getMyApplications).mockResolvedValue([application])
    vi.mocked(getProcesses).mockResolvedValue([openProcess])
  })

  it('o convite fica no topo, à vista', async () => {
    renderWithProviders(<DashboardPage />)

    const link = await screen.findByRole('link', { name: /acesse o grupo da liga/i })
    expect(link).toHaveAttribute('href', WHATSAPP_LINK)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('aparece também para quem ainda não se inscreveu', async () => {
    // Antes o convite só existia no estado "nenhum processo aberto", que quase
    // ninguém chega a ver.
    vi.mocked(getMyApplications).mockResolvedValue([])
    renderWithProviders(<DashboardPage />)

    expect(
      await screen.findByRole('link', { name: /acesse o grupo da liga/i }),
    ).toBeInTheDocument()
  })
})
