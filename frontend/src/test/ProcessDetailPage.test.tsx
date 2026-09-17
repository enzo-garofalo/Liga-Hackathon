import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyToProcess, getProcess } from '../api/processes'
import { ProcessDetailPage } from '../pages/ProcessDetailPage'
import type { ProcessDetail } from '../types/process'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/processes', () => ({
  getProcesses: vi.fn(),
  getProcess: vi.fn(),
  applyToProcess: vi.fn(),
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
