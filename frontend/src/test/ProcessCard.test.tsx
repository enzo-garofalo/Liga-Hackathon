import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProcessCard } from '../components/ProcessCard'
import { renderWithProviders } from './render'

describe('ProcessCard', () => {
  it('processo disponível mostra "Ver detalhes" e período de inscrição', () => {
    renderWithProviders(
      <ProcessCard
        name="PS Liga 2026.2"
        registrationStart="2026-08-01T12:00:00Z"
        registrationEnd="2026-08-15T12:00:00Z"
        stageCount={3}
        registrationOpen
        to="/processes/1"
        actionLabel="Ver detalhes"
      />,
    )

    expect(screen.getByText('PS Liga 2026.2')).toBeInTheDocument()
    expect(screen.getByText('Inscrições abertas')).toBeInTheDocument()
    expect(screen.getByText('3 etapas')).toBeInTheDocument()
    expect(screen.getByText(/01\/08 – 15\/08/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver detalhes/i })).toHaveAttribute(
      'href',
      '/processes/1',
    )
  })

  it('inscrições encerradas aparecem como tal', () => {
    renderWithProviders(
      <ProcessCard
        name="PS antigo"
        registrationStart="2026-01-01T12:00:00Z"
        registrationEnd="2026-01-15T12:00:00Z"
        stageCount={1}
        registrationOpen={false}
        to="/processes/2"
        actionLabel="Ver detalhes"
      />,
    )
    expect(screen.getByText('Inscrições encerradas')).toBeInTheDocument()
    expect(screen.getByText('1 etapa')).toBeInTheDocument()
  })

  it('candidatura mostra status, etapa atual e "Ver candidatura"', () => {
    renderWithProviders(
      <ProcessCard
        name="PS Liga 2026.2"
        submittedAt="2026-08-02T12:00:00Z"
        stageCount={4}
        applicationStatus="in_progress"
        currentStageName="Resolução do Case"
        to="/applications/9"
        actionLabel="Ver candidatura"
      />,
    )

    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByText('Resolução do Case')).toBeInTheDocument()
    expect(screen.getByText(/Inscrito em 02\/08/)).toBeInTheDocument()
    expect(screen.queryByText('Inscrições abertas')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver candidatura/i })).toHaveAttribute(
      'href',
      '/applications/9',
    )
  })

  it.each([
    ['approved', 'Aprovado'],
    ['rejected', 'Não aprovado'],
    ['discarded', 'Encerrada'],
  ] as const)('status %s aparece como "%s"', (status, label) => {
    renderWithProviders(
      <ProcessCard
        name="PS"
        stageCount={2}
        applicationStatus={status}
        to="/applications/1"
        actionLabel="Ver candidatura"
      />,
    )
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
