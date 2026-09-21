import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/applications'
import { DeliverableUpload } from '../components/DeliverableUpload'
import type { TimelineStage } from '../types/application'
import * as download from '../utils/download'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/applications', () => ({
  uploadDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  downloadDeliverable: vi.fn(),
  getMyApplication: vi.fn(),
  getMyApplications: vi.fn(),
}))

vi.mock('../utils/download', () => ({ saveBlob: vi.fn() }))

function caseStage(overrides: Partial<TimelineStage> = {}): TimelineStage {
  return {
    id: 'stage-1',
    name: 'Resolução do Case',
    description: '',
    instructions: '',
<<<<<<< HEAD
=======
    instructions_file: null,
>>>>>>> feature/v3-processo-seletivo
    order: 2,
    start_at: null,
    end_at: null,
    allows_file_upload: true,
    max_files: 1,
    allowed_file_types: ['pdf'],
    state: 'current',
    deliverables: [],
    ...overrides,
  }
}

const sentFile = {
  id: 'd-1',
  filename: 'meu-case.pdf',
  download_url: '/api/v1/deliverables/d-1/download/',
  uploaded_at: '2026-09-16T20:47:00Z',
}

function pdf(name = 'case.pdf') {
  return new File(['%PDF-1.4'], name, { type: 'application/pdf' })
}

function chooseFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  return userEvent.upload(input, file)
}

describe('DeliverableUpload', () => {
  beforeEach(() => {
    vi.mocked(api.uploadDeliverable).mockResolvedValue(sentFile)
  })

  it('mostra formatos aceitos e limite de arquivos', () => {
    renderWithProviders(<DeliverableUpload applicationId="app-1" stage={caseStage()} />)
    expect(screen.getByText(/Formatos aceitos: pdf/)).toBeInTheDocument()
    expect(screen.getByText(/até 1 arquivo/)).toBeInTheDocument()
  })

  it('escolher o arquivo não envia nada', async () => {
    renderWithProviders(<DeliverableUpload applicationId="app-1" stage={caseStage()} />)
    await chooseFile(pdf())

    expect(api.uploadDeliverable).not.toHaveBeenCalled()
    expect(screen.getByText('case.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })

  it('só envia ao clicar em "Enviar"', async () => {
    renderWithProviders(<DeliverableUpload applicationId="app-1" stage={caseStage()} />)
    const file = pdf()
    await chooseFile(file)
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => expect(api.uploadDeliverable).toHaveBeenCalledWith('app-1', file))
  })

  it('o × troca o arquivo sem enviar', async () => {
    renderWithProviders(<DeliverableUpload applicationId="app-1" stage={caseStage()} />)
    await chooseFile(pdf('errado.pdf'))
    await userEvent.click(screen.getByTitle('Trocar arquivo'))

    expect(screen.queryByText('errado.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /escolher arquivo/i })).toBeInTheDocument()
    expect(api.uploadDeliverable).not.toHaveBeenCalled()
  })

  it('mostra o erro devolvido pela API', async () => {
    vi.mocked(api.uploadDeliverable).mockRejectedValue(
      httpError(400, ['Formato .docx não aceito. Envie: pdf.']),
    )

    renderWithProviders(<DeliverableUpload applicationId="app-1" stage={caseStage()} />)
    await chooseFile(pdf())
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    expect(await screen.findByText('Formato .docx não aceito. Envie: pdf.')).toBeInTheDocument()
  })

  it('com o limite atingido, esconde a escolha de arquivo', () => {
    renderWithProviders(
      <DeliverableUpload
        applicationId="app-1"
        stage={caseStage({ deliverables: [sentFile] })}
      />,
    )

    expect(screen.getByText('meu-case.pdf')).toBeInTheDocument()
    expect(screen.getByText('Enviado')).toBeInTheDocument()
    expect(screen.getByText(/Limite de arquivos atingido/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /escolher arquivo/i })).not.toBeInTheDocument()
  })

  it('baixa pelo client autenticado, não por link direto', async () => {
    const blob = new Blob(['%PDF'])
    vi.mocked(api.downloadDeliverable).mockResolvedValue(blob)

    renderWithProviders(
      <DeliverableUpload
        applicationId="app-1"
        stage={caseStage({ deliverables: [sentFile] })}
      />,
    )

    // Um <a href> não enviaria o token e o backend responderia 401.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Baixar'))
    await waitFor(() => expect(api.downloadDeliverable).toHaveBeenCalledWith('d-1'))
    expect(download.saveBlob).toHaveBeenCalledWith(blob, 'meu-case.pdf')
  })

  it('remove um arquivo enviado', async () => {
    vi.mocked(api.deleteDeliverable).mockResolvedValue(undefined)

    renderWithProviders(
      <DeliverableUpload
        applicationId="app-1"
        stage={caseStage({ deliverables: [sentFile] })}
      />,
    )
    await userEvent.click(screen.getByTitle('Remover'))

    await waitFor(() => expect(api.deleteDeliverable).toHaveBeenCalledWith('app-1', 'd-1'))
  })
})
