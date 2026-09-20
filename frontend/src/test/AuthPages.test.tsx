import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { BIO_MAX } from '../utils/perfil'
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

    // `/^senha/i` e nao `/senha/i`: o botao de revelar tem aria-label
    // "Revelar senha" e casaria junto com o campo.
    for (const campo of [/e-mail/i, /^senha/i, /nome completo/i, /curso/i, /semestre/i]) {
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

  it('a bio do cadastro tem o mesmo teto do perfil', async () => {
    // Sem o teto, quem se cadastra com bio longa não salva mais o perfil depois:
    // a edição recusa acima de 500 e a pessoa fica travada sem entender.
    renderWithProviders(<RegisterPage />)

    expect(screen.getByText('0/500')).toBeInTheDocument()

    const bio = screen.getByLabelText(/bio/i)
    await userEvent.type(bio, 'Curiosa por produto.')
    expect(screen.getByText('20/500')).toBeInTheDocument()
  })

  it('a bio não deixa digitar além do teto', async () => {
    // A tela prometia 500 e deixava escrever mil: o limite só aparecia ao
    // enviar, depois do texto já escrito.
    renderWithProviders(<RegisterPage />)
    const bio = screen.getByLabelText(/bio/i) as HTMLTextAreaElement

    expect(bio.maxLength).toBe(BIO_MAX)

    // Colar, e não digitar: 520 teclas simuladas estouram o tempo do teste, e
    // colar é como um texto longo chega num campo destes de verdade.
    await userEvent.click(bio)
    await userEvent.paste('x'.repeat(BIO_MAX + 20))
    expect(bio.value).toHaveLength(BIO_MAX)
    expect(screen.getByText(`${BIO_MAX}/${BIO_MAX}`)).toBeInTheDocument()
  })

  it.each(telas)('o campo de senha de %s é associado ao rótulo', (_nome, tela) => {
    // decisions.md §15. O `getByLabelText(/senha/i)` que existia aqui casava
    // com o aria-label do botão de revelar e passava mesmo com o campo solto
    // do rótulo: o `id` não estava sendo aplicado ao input.
    renderWithProviders(tela)

    // Ancorado no inicio: o rotulo do cadastro traz um asterisco de
    // obrigatorio ("Senha*"), e "Revelar senha" nao pode entrar na conta.
    const senha = screen.getByLabelText(/^senha/i)
    expect(senha.tagName).toBe('INPUT')
    expect(senha).toHaveAttribute('type', 'password')
  })

  it('a tela do organizador é separada da do candidato', () => {
    renderWithProviders(<AdminLoginPage />)
    expect(screen.getByText(/comissão avaliadora/i)).toBeInTheDocument()
  })
})
