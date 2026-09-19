import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { list, markRead } from '../api/notifications'
import { NotificationBell } from '../components/NotificationBell'
import type { Notification } from '../types/notification'
import { renderWithProviders } from './render'

vi.mock('../api/notifications', () => ({
  list: vi.fn(),
  markRead: vi.fn(),
}))

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    type: 'stage_advanced',
    type_display: 'Convocação para próxima etapa',
    // Primeira linha: o resumo da lista. Depois da linha em branco: o detalhe.
    message: [
      'Você avançou para a etapa Pitch.',
      '',
      'Apresentação de 5 minutos, com 3 de perguntas.',
      '',
      'Prazo desta etapa: até 12/10.',
    ].join('\n'),
    read: false,
    link_to: '/applications/app-1',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function renderBell(notifications: Notification[]) {
  vi.mocked(list).mockResolvedValue(notifications)
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<NotificationBell />} />
      <Route path="/applications/:id" element={<p>Ficha da candidatura</p>} />
    </Routes>,
  )
}

async function openPanel(notifications: Notification[]) {
  renderBell(notifications)
  await userEvent.click(await screen.findByRole('button', { name: 'Notificações' }))
  return screen.getByRole('dialog', { name: 'Central de notificações' })
}

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.setItem('auth_active_store', 'participant')
    localStorage.setItem('access_token', 'token-de-teste')
    localStorage.removeItem('dismissed_read_notifications')
    vi.mocked(markRead).mockResolvedValue(notification({ read: true }))
  })

  it('abre a lista de mensagens ao clicar no sino', async () => {
    const panel = await openPanel([
      notification(),
      notification({ id: 'n-2', message: 'Sua inscrição foi confirmada.' }),
    ])

    expect(within(panel).getByText('Você avançou para a etapa Pitch.')).toBeInTheDocument()
    expect(within(panel).getByText('Sua inscrição foi confirmada.')).toBeInTheDocument()
  })

  it('mostra na lista só o resumo, e não o texto inteiro', async () => {
    // A lista é uma pilha de linhas curtas: o corpo do aviso cabe no pop-up.
    const panel = await openPanel([notification()])

    expect(within(panel).queryByText(/Apresentação de 5 minutos/)).not.toBeInTheDocument()
    expect(within(panel).queryByText(/Prazo desta etapa/)).not.toBeInTheDocument()
  })

  it('abre o pop-up com a mensagem inteira ao clicar nela', async () => {
    await openPanel([notification()])

    await userEvent.click(screen.getByText('Você avançou para a etapa Pitch.'))

    const popup = await screen.findByRole('dialog', {
      name: 'Convocação para próxima etapa',
    })
    expect(within(popup).getByText('Você avançou para a etapa Pitch.')).toBeInTheDocument()
    expect(within(popup).getByText(/Apresentação de 5 minutos/)).toBeInTheDocument()
    expect(within(popup).getByText(/Prazo desta etapa: até 12\/10/)).toBeInTheDocument()
  })

  it('marca como lida ao abrir o pop-up', async () => {
    await openPanel([notification()])

    await userEvent.click(screen.getByText('Você avançou para a etapa Pitch.'))

    await waitFor(() => expect(markRead).toHaveBeenCalledWith('n-1'))
  })

  it('leva ao que a notificação fala, pelo botão do pop-up', async () => {
    await openPanel([notification()])
    await userEvent.click(screen.getByText('Você avançou para a etapa Pitch.'))

    await userEvent.click(
      await screen.findByRole('button', { name: /Ver minha candidatura/ }),
    )

    expect(await screen.findByText('Ficha da candidatura')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre o pop-up também quando a notificação não leva a lugar nenhum', async () => {
    // Antes, clicar numa notificação sem link não fazia absolutamente nada.
    await openPanel([notification({ link_to: '' })])

    await userEvent.click(screen.getByText('Você avançou para a etapa Pitch.'))

    const popup = await screen.findByRole('dialog', {
      name: 'Convocação para próxima etapa',
    })
    expect(within(popup).getByText(/Apresentação de 5 minutos/)).toBeInTheDocument()
    expect(within(popup).queryByRole('button', { name: /Ver/ })).not.toBeInTheDocument()
  })

  it('mostra o comunicado do organizador com o assunto como título da linha', async () => {
    const comunicado = notification({
      type: 'custom_communication',
      type_display: 'Comunicado do processo seletivo',
      message: 'Prazo do case prorrogado\n\nO prazo passou para sexta-feira.',
      link_to: '/processes/proc-1',
    })
    const panel = await openPanel([comunicado])
    expect(within(panel).getByText('Prazo do case prorrogado')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Prazo do case prorrogado'))

    const popup = await screen.findByRole('dialog', {
      name: 'Comunicado do processo seletivo',
    })
    expect(within(popup).getByText('O prazo passou para sexta-feira.')).toBeInTheDocument()
    expect(
      within(popup).getByRole('button', { name: /Ver o processo seletivo/ }),
    ).toBeInTheDocument()
  })
})
