import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyToProcess, getProcess, withdrawFromProcess } from '../api/processes'
import { ProcessDetailPage } from '../pages/ProcessDetailPage'
import type { ProcessDetail } from '../types/process'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/processes', () => ({
  getProcesses: vi.fn(),
  getProcess: vi.fn(),
  applyToProcess: vi.fn(),
  withdrawFromProcess: vi.fn(),
}))

const process: ProcessDetail = {
  id: 'proc-1',
  name: 'PS Liga 2026.2',
  short_description: '',
  description: 'Buscamos pessoas comprometidas.',
  highlight_message: '',
  banner: null,
  registration_start: '2026-09-01T12:00:00Z',
  registration_end: '2026-09-30T12:00:00Z',
  registration_open: true,
  stage_count: 2,
  already_applied: false,
  stages: [
    { id: 's1', name: 'Case', description: 'PDF de 3 páginas.', order: 1, start_at: null, end_at: null },
    { id: 's2', name: 'Pitch', description: '', order: 2, start_at: null, end_at: null },
  ],
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/processes/:id" element={<ProcessDetailPage />} />
      <Route path="/applications/:id" element={<p>página da candidatura</p>} />
    </Routes>,
    { route: '/processes/proc-1' },
  )
}

describe('ProcessDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getProcess).mockResolvedValue(process)
  })

  it('mostra descrição e etapas', async () => {
    renderPage()
    expect(await screen.findByText('PS Liga 2026.2')).toBeInTheDocument()
    expect(screen.getByText('Buscamos pessoas comprometidas.')).toBeInTheDocument()
    expect(screen.getByText('Case')).toBeInTheDocument()
    expect(screen.getByText('PDF de 3 páginas.')).toBeInTheDocument()
  })

  it('inscrever-se leva à página da candidatura', async () => {
    vi.mocked(applyToProcess).mockResolvedValue({ id: 'app-9' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Inscrever-se' }))

    expect(await screen.findByText('página da candidatura')).toBeInTheDocument()
    expect(applyToProcess).toHaveBeenCalledWith('proc-1')
  })

  it('mostra o motivo quando a inscrição é recusada', async () => {
    vi.mocked(applyToProcess).mockRejectedValue(
      httpError(400, ['Você já está inscrito neste processo seletivo.']),
    )
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Inscrever-se' }))

    expect(
      await screen.findByText('Você já está inscrito neste processo seletivo.'),
    ).toBeInTheDocument()
  })

  it('já inscrito não vê o botão', async () => {
    vi.mocked(getProcess).mockResolvedValue({ ...process, already_applied: true })
    renderPage()

    expect(await screen.findByText(/já está inscrito/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inscrever-se' })).not.toBeInTheDocument()
  })

  it('inscrições encerradas desabilitam o botão', async () => {
    vi.mocked(getProcess).mockResolvedValue({ ...process, registration_open: false })
    renderPage()

    const button = await screen.findByRole('button', { name: 'Inscrições encerradas' })
    expect(button).toBeDisabled()
  })

  it('404 mostra "não encontrado"', async () => {
    vi.mocked(getProcess).mockRejectedValue(httpError(404))
    renderPage()
    expect(await screen.findByText('Processo não encontrado')).toBeInTheDocument()
  })

  it('erro de servidor NÃO diz "não encontrado"', async () => {
    vi.mocked(getProcess).mockRejectedValue(httpError(500))
    renderPage()

    expect(await screen.findByText('Não foi possível carregar o processo')).toBeInTheDocument()
    expect(screen.queryByText('Processo não encontrado')).not.toBeInTheDocument()
  })

  it('404 não é repetido antes de mostrar a tela', async () => {
    vi.mocked(getProcess).mockRejectedValue(httpError(404))
    renderPage()
    await screen.findByText('Processo não encontrado')
    expect(getProcess).toHaveBeenCalledTimes(1)
  })
})

describe('cancelar a inscrição', () => {
  const inscrito = { ...process, already_applied: true }

  beforeEach(() => {
    vi.mocked(getProcess).mockResolvedValue(inscrito)
    vi.mocked(withdrawFromProcess).mockResolvedValue({ id: 'app-9' })
  })

  it('quem está inscrito e no prazo pode cancelar', async () => {
    renderPage()

    expect(
      await screen.findByRole('button', { name: /cancelar minha inscrição/i }),
    ).toBeInTheDocument()
  })

  it('não pergunta nada antes de abrir a confirmação', async () => {
    // Sair do processo não pode acontecer por um clique só.
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar minha inscrição/i }),
    )

    expect(await screen.findByText(/tem certeza que quer cancelar/i)).toBeInTheDocument()
    expect(withdrawFromProcess).not.toHaveBeenCalled()
  })

  it('confirmar chama a API', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar minha inscrição/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar inscrição' }))

    expect(withdrawFromProcess).toHaveBeenCalledWith('proc-1')
  })

  it('desistir da confirmação não cancela nada', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar minha inscrição/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(withdrawFromProcess).not.toHaveBeenCalled()
    expect(screen.queryByText(/tem certeza que quer cancelar/i)).not.toBeInTheDocument()
  })

  it('fora do prazo a opção some', async () => {
    // Depois das inscrições, cancelar deixa de ser assunto da plataforma.
    vi.mocked(getProcess).mockResolvedValue({ ...inscrito, registration_open: false })
    renderPage()

    await screen.findByText(/já está inscrito/i)
    expect(
      screen.queryByRole('button', { name: /cancelar minha inscrição/i }),
    ).not.toBeInTheDocument()
  })

  it('o motivo da recusa aparece na tela', async () => {
    vi.mocked(withdrawFromProcess).mockRejectedValue(
      httpError(400, ['O período de inscrição deste processo já encerrou.']),
    )
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar minha inscrição/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar inscrição' }))

    expect(
      await screen.findByText(/o período de inscrição deste processo já encerrou/i),
    ).toBeInTheDocument()
  })
})
