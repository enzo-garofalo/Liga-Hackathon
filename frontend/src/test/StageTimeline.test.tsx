import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StageTimeline } from '../components/StageTimeline'
import type { TimelineStage } from '../types/application'

function stage(overrides: Partial<TimelineStage>): TimelineStage {
  return {
    id: overrides.name ?? 'x',
    name: 'Etapa',
    description: '',
    instructions: '',
    order: 1,
    start_at: null,
    end_at: null,
    allows_file_upload: false,
    max_files: null,
    allowed_file_types: [],
    state: 'upcoming',
    deliverables: [],
    ...overrides,
  }
}

const stages = [
  stage({ name: 'Inscrição', order: 1, state: 'done' }),
  stage({ name: 'Case', order: 2, state: 'current', description: 'Entregue o PDF.' }),
  stage({ name: 'Pitch', order: 3, state: 'upcoming' }),
]

describe('StageTimeline', () => {
  it('lista as etapas na ordem', () => {
    render(<StageTimeline stages={stages} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Inscrição',
      'Case',
      'Pitch',
    ])
  })

  it('marca só a etapa atual', () => {
    render(<StageTimeline stages={stages} />)
    expect(screen.getAllByText('Etapa atual')).toHaveLength(1)
    const current = screen.getAllByRole('listitem')[1]
    expect(within(current).getByText('Etapa atual')).toBeInTheDocument()
  })

  it('oferece o conteúdo extra em todas as etapas, não só na atual', () => {
    // O que o candidato entregou precisa continuar na tela depois que a etapa
    // passa; quem decide onde mostrar é quem chama.
    render(<StageTimeline stages={stages} renderStageExtra={(s) => <p>extra de {s.name}</p>} />)

    expect(screen.getAllByText(/extra de/)).toHaveLength(3)
    expect(screen.getByText('extra de Inscrição')).toBeInTheDocument()
    expect(screen.getByText('extra de Pitch')).toBeInTheDocument()
  })

  it('respeita o chamador que só quer o extra na etapa atual', () => {
    render(
      <StageTimeline
        stages={stages}
        renderStageExtra={(s) =>
          s.state === 'current' ? <p>área de entrega de {s.name}</p> : null
        }
      />,
    )
    expect(screen.getAllByText(/área de entrega/)).toHaveLength(1)
    expect(screen.getByText('área de entrega de Case')).toBeInTheDocument()
  })

  it('mostra a descrição da etapa', () => {
    render(<StageTimeline stages={stages} />)
    expect(screen.getByText('Entregue o PDF.')).toBeInTheDocument()
  })
})

describe('instruções da etapa', () => {
  it('a etapa com instruções oferece o botão de ler', async () => {
    render(
      <StageTimeline
        stages={[stage({ name: 'Case', state: 'current', instructions: 'Entregue um PDF de até 3 páginas.' })]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /o que preciso fazer/i }))
    expect(await screen.findByText('Entregue um PDF de até 3 páginas.')).toBeInTheDocument()
  })

  it('etapa que a pessoa ainda não alcançou não tem o botão', () => {
    // O backend manda instructions vazio para etapa futura: o enunciado do case
    // não pode ser lido antes de abrir, nem pela aba de rede.
    render(
      <StageTimeline stages={[stage({ name: 'Entrevista', state: 'upcoming', instructions: '' })]} />,
    )

    expect(
      screen.queryByRole('button', { name: /o que preciso fazer/i }),
    ).not.toBeInTheDocument()
  })

  it('etapa sem instruções escritas não mostra botão vazio', () => {
    render(
      <StageTimeline stages={[stage({ name: 'Pitch', state: 'done', instructions: '' })]} />,
    )
    expect(
      screen.queryByRole('button', { name: /o que preciso fazer/i }),
    ).not.toBeInTheDocument()
  })
})
