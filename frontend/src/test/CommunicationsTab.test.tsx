import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCommunications, sendCommunication } from '../api/communications'
import { CommunicationsTab } from '../components/CommunicationsTab'
import type { Communication } from '../types/communication'
import { makeStage } from './fixtures'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/communications', () => ({
  listCommunications: vi.fn(),
  getCommunication: vi.fn(),
  sendCommunication: vi.fn(),
}))

const stages = [makeStage(), makeStage({ id: 'stage-2', name: 'Entrevista', order: 2 })]

const auto: Communication = {
  id: 'comm-1',
  type: 'auto',
  subject: 'Convocação para Resolução do Case',
  audience: 'specific',
  audience_stage: null,
  audience_stage_name: null,
  recipient_count: 12,
  status: 'sent',
  sent_at: '2026-09-10T12:00:00Z',
}

function render() {
  return renderWithProviders(<CommunicationsTab processId="proc-1" stages={stages} />)
}

describe('CommunicationsTab', () => {
  beforeEach(() => {
    vi.mocked(listCommunications).mockResolvedValue([auto])
  })

  it('lista o histórico com tipo e destinatários', async () => {
    render()
    expect(await screen.findByText('Convocação para Resolução do Case')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Enviada')).toBeInTheDocument()
  })

  it('o seletor de etapa só aparece para o destinatário "etapa"', async () => {
    render()
    await screen.findByText('Convocação para Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))

    expect(screen.queryByText('Etapa')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Todos de uma etapa'))
    expect(screen.getByText('Etapa')).toBeInTheDocument()
  })

  it('envia o comunicado com o destinatário escolhido', async () => {
    vi.mocked(sendCommunication).mockResolvedValue({
      ...auto,
      type: 'manual',
      message: 'Olá',
      recipients: [],
    })
    render()
    await screen.findByText('Convocação para Resolução do Case')

    await userEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))
    await userEvent.click(screen.getByLabelText('Apenas aprovados'))
    await userEvent.type(screen.getByLabelText(/assunto/i), 'Parabéns')
    await userEvent.type(screen.getByLabelText(/mensagem/i), 'Você passou!')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() =>
      expect(sendCommunication).toHaveBeenCalledWith('proc-1', {
        audience: 'approved',
        audience_stage: null,
        recipients: undefined,
        subject: 'Parabéns',
        message: 'Você passou!',
      }),
    )
  })

  it('não envia sem assunto e mensagem', async () => {
    render()
    await screen.findByText('Convocação para Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('mostra o motivo quando o backend recusa o envio', async () => {
    vi.mocked(sendCommunication).mockRejectedValue(
      httpError(400, ['Nenhum candidato corresponde a esses destinatários.']),
    )
    render()
    await screen.findByText('Convocação para Resolução do Case')

    await userEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))
    await userEvent.type(screen.getByLabelText(/assunto/i), 'Aviso')
    await userEvent.type(screen.getByLabelText(/mensagem/i), 'Texto')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Nenhum candidato corresponde a esses destinatários.'),
    ).toBeInTheDocument()
  })

  it('erro de API mostra aviso em vez de histórico vazio', async () => {
    vi.mocked(listCommunications).mockRejectedValue(httpError(500))
    render()

    expect(
      await screen.findByText('Não foi possível carregar as comunicações'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum comunicado enviado')).not.toBeInTheDocument()
  })
})
