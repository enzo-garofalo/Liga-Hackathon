import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listApplications } from '../api/adminApplications'
import { getProcess, publishProcess, updateProcess } from '../api/adminProcesses'
import { listCommunications } from '../api/communications'
import { listStages } from '../api/stages'
import { ManageProcessPage } from '../pages/ManageProcessPage'
import { makeProcessDetail } from './fixtures'
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
vi.mock('../api/adminApplications', () => ({
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  getEvaluations: vi.fn(),
  saveEvaluation: vi.fn(),
  runBulkAction: vi.fn(),
}))
vi.mock('../api/communications', () => ({
  listCommunications: vi.fn(),
  getCommunication: vi.fn(),
  sendCommunication: vi.fn(),
}))
vi.mock('../api/stages', () => ({
  listStages: vi.fn(),
  createStage: vi.fn(),
  updateStage: vi.fn(),
  deleteStage: vi.fn(),
  reorderStages: vi.fn(),
}))
vi.mock('../api/notifications', () => ({
  listNotifications: vi.fn(),
  markAsRead: vi.fn(),
}))

const published = makeProcessDetail()
const emptyDraft = makeProcessDetail({
  id: 'proc-2',
  name: 'Teste',
  status: 'draft',
  published_at: null,
  stage_count: 0,
  stages: [],
  application_count: 0,
})

function render(id = 'proc-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/processes/:id" element={<ManageProcessPage />} />
    </Routes>,
    { route: `/admin/processes/${id}` },
  )
}

describe('ManageProcessPage', () => {
  beforeEach(() => {
    vi.mocked(getProcess).mockResolvedValue(published)
    vi.mocked(listStages).mockResolvedValue(published.stages)
    vi.mocked(listCommunications).mockResolvedValue([])
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('mostra nome, estatísticas e as três abas', async () => {
    render()
    expect(await screen.findByText('PS Liga 2026.2')).toBeInTheDocument()
    expect(screen.getByText('Inscritos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Candidatos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Etapas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comunicações' })).toBeInTheDocument()
  })

  it('rascunho pode publicar por aqui — senão fica sem saída', async () => {
    // Publicar exige etapa, e etapa só se configura nesta tela.
    vi.mocked(getProcess).mockResolvedValue(emptyDraft)
    render('proc-2')

    expect(await screen.findByText('Teste')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /abrir inscrições/i })).toBeInTheDocument()
  })

  it('rascunho sem etapa avisa o que falta', async () => {
    vi.mocked(getProcess).mockResolvedValue(emptyDraft)
    render('proc-2')

    expect(
      await screen.findByText(/Configure ao menos uma etapa na aba "Etapas"/),
    ).toBeInTheDocument()
  })

  it('edita nome e datas do processo', async () => {
    vi.mocked(updateProcess).mockResolvedValue(published)
    render()
    await screen.findByText('PS Liga 2026.2')

    await userEvent.click(screen.getByRole('button', { name: /editar processo/i }))
    const dialog = await screen.findByRole('dialog')

    const endField = within(dialog).getByLabelText(/fim das inscrições/i)
    await userEvent.clear(endField)
    await userEvent.type(endField, '2026-09-30T23:59')
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(updateProcess).toHaveBeenCalled())
    const [id, payload] = vi.mocked(updateProcess).mock.calls[0]
    expect(id).toBe('proc-1')
    expect(payload.name).toBe('PS Liga 2026.2')
    // O campo do formulário é local e o payload viaja em UTC: comparar de volta no fuso.
    const sent = new Date(payload.registration_end as string)
    expect(sent.getFullYear()).toBe(2026)
    expect(sent.getMonth()).toBe(8)
    expect(sent.getDate()).toBe(30)
    expect(sent.getHours()).toBe(23)
    expect(sent.getMinutes()).toBe(59)
  })

  it('publicar pela tela do processo confirma antes', async () => {
    vi.mocked(getProcess).mockResolvedValue({
      ...emptyDraft,
      stage_count: 1,
      stages: published.stages.slice(0, 1),
    })
    vi.mocked(publishProcess).mockResolvedValue(published)
    render('proc-2')
    await screen.findByText('Teste')

    await userEvent.click(screen.getByRole('button', { name: /abrir inscrições/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Abrir inscrições' }),
    )

    await waitFor(() => expect(publishProcess).toHaveBeenCalled())
  })

  it('processo encerrado não oferece edição', async () => {
    vi.mocked(getProcess).mockResolvedValue({ ...published, status: 'closed' })
    render()
    await screen.findByText('PS Liga 2026.2')

    expect(screen.queryByRole('button', { name: /editar processo/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Processo encerrado/)).toBeInTheDocument()
  })

  it('trocar de aba troca o conteúdo', async () => {
    render()
    await screen.findByText('PS Liga 2026.2')

    await userEvent.click(screen.getByRole('button', { name: 'Etapas' }))
    expect(await screen.findByRole('button', { name: /nova etapa/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Comunicações' }))
    expect(
      await screen.findByRole('button', { name: /enviar comunicado/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /nova etapa/i })).not.toBeInTheDocument()
  })
})
