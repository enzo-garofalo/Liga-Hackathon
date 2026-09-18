import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { renderWithProviders } from './render'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  adminLogin: vi.fn(),
  register: vi.fn(),
}))

const telas = [
  ['criação de conta', <RegisterPage key="r" />],
  ['entrar como candidato', <LoginPage key="l" />],
  ['entrar como organizador', <AdminLoginPage key="a" />],
] as const

describe('telas de conta', () => {
  it.each(telas)('%s não fala mais do hackathon', (_nome, tela) => {
    renderWithProviders(tela)

    expect(screen.queryByText(/hackathon/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/equipe|convite|submissão/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/20 de junho/i)).not.toBeInTheDocument()
  })

  it.each(telas)('%s fala da Liga e do processo seletivo', (_nome, tela) => {
    renderWithProviders(tela)
    expect(screen.getAllByText(/Liga|processo seletivo|comissão/i).length).toBeGreaterThan(0)
  })

  it('o formulário de cadastro continua pedindo o perfil do candidato', () => {
    renderWithProviders(<RegisterPage />)

    for (const campo of [/e-mail/i, /senha/i, /nome completo/i, /curso/i, /semestre/i]) {
      expect(screen.getByLabelText(campo)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('a bio tem rótulo associado ao campo', () => {
    // decisions.md §15: textarea escrito à mão precisa do par htmlFor/id na mão.
    renderWithProviders(<RegisterPage />)

    const bio = screen.getByLabelText(/bio/i)
    expect(bio.tagName).toBe('TEXTAREA')
  })

  it('a tela do organizador é separada da do candidato', () => {
    renderWithProviders(<AdminLoginPage />)
    expect(screen.getByText(/comissão avaliadora/i)).toBeInTheDocument()
  })
})
