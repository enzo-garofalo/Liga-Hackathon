import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAssignmentBoard,
  inviteOrganizer,
  listProcessOrganizers,
  removeOrganizer,
} from '../api/organizers'
import { OrganizersTab } from '../components/OrganizersTab'
import { makeOrganizer, makeProcessDetail } from './fixtures'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/organizers', () => ({
  listProcessOrganizers: vi.fn(),
  inviteOrganizer: vi.fn(),
  resendOrganizerInvite: vi.fn(),
  removeOrganizer: vi.fn(),
  getStageAssignments: vi.fn(),
  autoDistribute: vi.fn(),
  getAssignmentBoard: vi.fn(),
  setEvaluators: vi.fn(),
}))

const process = makeProcessDetail()
const bruno = makeOrganizer()
const convidada = makeOrganizer({
  id: 'org-2',
  user_id: 8,
  email: 'ana@ligadeti.com.br',
  full_name: 'Ana Souza',
  is_coordinator: false,
  pending: true,
  workload: 0,
})

function render() {
  return renderWithProviders(<OrganizersTab process={process} />)
}

/**
 * A lista de quem está no processo.
 *
 * Escopada de propósito: o nome de cada pessoa aparece duas vezes na tela, na
 * lista e no rodízio da distribuição, e uma busca solta acharia as duas.
 */
async function lista() {
  return within(
    await screen.findByRole('list', { name: /organizadores deste processo/i }),
  )
}

describe('OrganizersTab', () => {
  beforeEach(() => {
    vi.mocked(listProcessOrganizers).mockResolvedValue([bruno, convidada])
    vi.mocked(getAssignmentBoard).mockResolvedValue({ stages: [], workload: {} })
  })

  it('mostra quem coordena, quem avalia e quem ainda não entrou', async () => {
    render()
    const membros = await lista()

    expect(membros.getByText('Bruno Alves')).toBeInTheDocument()
    expect(membros.getByText('Coordenador')).toBeInTheDocument()
    expect(membros.getByText('Ana Souza')).toBeInTheDocument()
    expect(membros.getByText('Avaliador')).toBeInTheDocument()
    expect(membros.getByText('Convite pendente')).toBeInTheDocument()
  })

  it('convida pelo e-mail e avisa que o convite saiu', async () => {
    vi.mocked(inviteOrganizer).mockResolvedValue([bruno, convidada])
    render()
    await lista()

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'nova@exemplo.com')
    await userEvent.click(
      screen.getByRole('button', { name: /adicionar ao processo/i }),
    )

    await waitFor(() =>
      expect(inviteOrganizer).toHaveBeenCalledWith(process.id, {
        email: 'nova@exemplo.com',
        full_name: '',
        role_title: '',
      }),
    )
    expect(
      await screen.findByText(/convite enviado para nova@exemplo\.com/i),
    ).toBeInTheDocument()
  })

  it('mostra o motivo quando a API recusa o convite', async () => {
    vi.mocked(inviteOrganizer).mockRejectedValue(
      httpError(400, { detail: 'Esta pessoa já está neste processo.' }),
    )
    render()
    await lista()

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'ana@ligadeti.com.br')
    await userEvent.click(
      screen.getByRole('button', { name: /adicionar ao processo/i }),
    )

    expect(
      await screen.findByText('Esta pessoa já está neste processo.'),
    ).toBeInTheDocument()
  })

  it('reenviar convite só aparece para quem ainda não criou a senha', async () => {
    render()
    const membros = await lista()

    // Só a Ana está pendente; o Bruno já entra na plataforma.
    expect(membros.getAllByRole('button', { name: /reenviar convite/i })).toHaveLength(1)
  })

  it('tirar do processo pergunta antes', async () => {
    vi.mocked(removeOrganizer).mockResolvedValue(undefined as never)
    render()
    const membros = await lista()

    await userEvent.click(membros.getByRole('button', { name: /tirar do processo/i }))

    expect(await screen.findByText(/tirar ana souza deste processo\?/i)).toBeInTheDocument()
    expect(removeOrganizer).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Tirar' }))
    await waitFor(() => expect(removeOrganizer).toHaveBeenCalledWith(process.id, 8))
  })

  it('não oferece tirar o coordenador do próprio processo', async () => {
    render()
    const membros = await lista()

    // Uma linha só tem o botão: a da Ana.
    expect(membros.getAllByRole('button', { name: /tirar do processo/i })).toHaveLength(1)
  })

})
