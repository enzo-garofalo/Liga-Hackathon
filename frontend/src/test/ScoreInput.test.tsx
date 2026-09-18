import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { isValidScore, parseScore, ScoreInput } from '../components/ui/ScoreInput'

describe('parseScore', () => {
  it('aceita vírgula como separador decimal', () => {
    expect(parseScore('4,5')).toBe(4.5)
    expect(parseScore('4.5')).toBe(4.5)
  })

  it('devolve null para vazio e para texto', () => {
    expect(parseScore('')).toBeNull()
    expect(parseScore('abc')).toBeNull()
  })
})

describe('isValidScore', () => {
  it('aceita inteiros e quebrados dentro da escala', () => {
    expect(isValidScore('1', 1, 5)).toBe(true)
    expect(isValidScore('5', 1, 5)).toBe(true)
    expect(isValidScore('3,5', 1, 5)).toBe(true)
    expect(isValidScore('4.25', 1, 5)).toBe(true)
  })

  it('recusa fora da escala', () => {
    expect(isValidScore('6', 1, 5)).toBe(false)
    expect(isValidScore('0,5', 1, 5)).toBe(false)
  })

  it('aceita 0: ausência de entrega, fora da escala de propósito', () => {
    expect(isValidScore('0', 1, 5)).toBe(true)
  })

  it('campo vazio não é inválido — é só não preenchido', () => {
    expect(isValidScore('', 1, 5)).toBe(true)
  })
})

describe('ScoreInput', () => {
  it('não deixa digitar letra nem sinal negativo', async () => {
    const onChange = vi.fn()
    render(<ScoreInput label="Nota de Critério" value="" min={1} max={5} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Nota de Critério'), 'a-4')
    expect(onChange).toHaveBeenLastCalledWith('4')
  })

  it('avisa quando a nota sai da escala', () => {
    render(<ScoreInput label="Nota" value="9" min={1} max={5} onChange={() => {}} />)
    expect(screen.getByLabelText('Nota')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('1 a 5')).toBeInTheDocument()
  })

  it('nota quebrada válida não é marcada como erro', () => {
    render(<ScoreInput label="Nota" value="4,5" min={1} max={5} onChange={() => {}} />)
    expect(screen.getByLabelText('Nota')).toHaveAttribute('aria-invalid', 'false')
  })
})
