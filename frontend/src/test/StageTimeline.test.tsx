import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StageTimeline } from '../components/StageTimeline'
import type { TimelineStage } from '../types/application'

function stage(overrides: Partial<TimelineStage>): TimelineStage {
  return {
    id: overrides.name ?? 'x',
    name: 'Etapa',
    description: '',
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

  it('renderiza o conteúdo extra apenas dentro da etapa atual', () => {
    render(
      <StageTimeline
        stages={stages}
        renderCurrentExtra={(s) => <p>área de entrega de {s.name}</p>}
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
