import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryError } from '../components/QueryError'

describe('QueryError', () => {
  it('mostra título e mensagem', () => {
    render(<QueryError title="Falhou" error={new Error('x')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Falhou')).toBeInTheDocument()
    expect(screen.getByText('Ocorreu um erro. Tente novamente.')).toBeInTheDocument()
  })

  it('chama onRetry ao clicar em tentar novamente', async () => {
    const onRetry = vi.fn()
    render(<QueryError error={new Error('x')} onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('sem onRetry não mostra botão', () => {
    render(<QueryError error={new Error('x')} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
