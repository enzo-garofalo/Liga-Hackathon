import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { LoginPage } from '../pages/LoginPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  adminLogin: vi.fn(),
  register: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}))

const { requestPasswordReset, confirmPasswordReset } = await import('../api/auth')

const AVISO_ENVIADO =
  'Se existir uma conta com este e-mail, o link para trocar a senha já está a caminho.'

const LINK = '/reset-password?uid=MjQ5MDM&token=df69x2-e7f94625b5d5'

beforeEach(() => {
  vi.mocked(requestPasswordReset).mockReset()
  vi.mocked(confirmPasswordReset).mockReset()
})

describe('caminho até a troca de senha', () => {
  const entradas = [
    ['candidato', <LoginPage key="l" />],
    ['organizador', <AdminLoginPage key="a" />],
  ] as const

  it.each(entradas)('a tela de entrar do %s oferece "Esqueci minha senha"', (_quem, tela) => {
    renderWithProviders(tela)

    const link = screen.getByRole('link', { name: /esqueci minha senha/i })
    expect(link.getAttribute('href')).toContain('/forgot-password')
    // Sublinhado a pedido: é o que faz o texto parecer clicável no meio do formulário.
    expect(link.className).toContain('underline')
  })

  it('o link do organizador leva a marca da porta de onde saiu', () => {
    // Sem a marca, todo caminho de volta cai no login de candidato, que recusa
    // a conta do organizador.
    renderWithProviders(<AdminLoginPage />)

    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveAttribute(
      'href',
      '/forgot-password?area=organizador',
    )
  })

  it('o link do candidato não leva marca nenhuma', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})

describe('voltar cai na porta certa', () => {
  const portas = [
    ['organizador', '?area=organizador', '/admin/login'],
    ['candidato', '', '/login'],
  ] as const

  it.each(portas)(
    'quem veio como %s volta para a entrada dele na tela de pedir o link',
    (_quem, marca, destino) => {
      renderWithProviders(<ForgotPasswordPage />, { route: `/forgot-password${marca}` })

      expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute(
        'href',
        destino,
      )
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', destino)
    },
  )

  it.each(portas)(
    'depois de pedir o link, o %s também é mandado para a entrada dele',
    async (_quem, marca, destino) => {
      vi.mocked(requestPasswordReset).mockResolvedValue({ detail: AVISO_ENVIADO })
      renderWithProviders(<ForgotPasswordPage />, { route: `/forgot-password${marca}` })

      await userEvent.type(screen.getByLabelText(/e-mail/i), 'ana@x.com')
      await userEvent.click(screen.getByRole('button', { name: /enviar link/i }))

      const ir = await screen.findByRole('link', { name: /ir para o login/i })
      expect(ir).toHaveAttribute('href', destino)
    },
  )

  it.each(portas)(
    'na tela de trocar a senha, o %s volta pela porta que veio no link do e-mail',
    (_quem, marca, destino) => {
      renderWithProviders(<ResetPasswordPage />, { route: `${LINK}${marca.replace('?', '&')}` })

      // Todos: a tela tem o caminho de volta no topo e outro no rodapé, e os
      // dois precisam apontar para a mesma porta.
      const voltas = screen.getAllByRole('link', { name: 'Voltar para o login' })
      expect(voltas.length).toBeGreaterThan(1)
      for (const volta of voltas) {
        expect(volta).toHaveAttribute('href', destino)
      }
    },
  )
})

describe('pedir o link', () => {
  it('envia o e-mail digitado e avisa que o link saiu', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ detail: AVISO_ENVIADO })
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'ana@x.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() =>
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: 'ana@x.com' }),
    )
    expect(await screen.findByText(AVISO_ENVIADO)).toBeInTheDocument()
  })

  it('a tela de sucesso não deixa a pessoa esperando no formulário', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ detail: AVISO_ENVIADO })
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'ana@x.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    await screen.findByText(AVISO_ENVIADO)
    expect(screen.queryByRole('button', { name: /enviar link/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir para o login/i })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('falha do servidor aparece na tela', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(
      httpError(429, { detail: 'Muitos pedidos. Tente mais tarde.' }),
    )
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' })

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'ana@x.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar link/i }))

    expect(await screen.findByText(/muitos pedidos/i)).toBeInTheDocument()
  })
})

describe('usar o link', () => {
  it('manda uid e token que vieram no endereço', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue({
      detail: 'Senha alterada. Agora é só entrar com a senha nova.',
      area: 'candidato',
    })
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'senhaNova#2026')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'senhaNova#2026')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    await waitFor(() =>
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        uid: 'MjQ5MDM',
        token: 'df69x2-e7f94625b5d5',
        password: 'senhaNova#2026',
      }),
    )
  })

  it('senhas diferentes nem chegam a gastar o link', async () => {
    // O link serve uma vez só: um erro de digitação queimaria o link e a
    // pessoa teria que pedir outro e-mail para descobrir o motivo.
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'senhaNova#2026')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'senhaNova#2027')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    expect(await screen.findByText(/as duas senhas não são iguais/i)).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('senha curta é barrada antes de ir para a API', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'curta12')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'curta12')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    // A frase inteira: "pelo menos 8 caracteres" tambem aparece na descricao
    // da tela, e o teste passaria sem o campo ter reclamado de nada.
    expect(
      await screen.findByText(/a senha precisa de pelo menos 8 caracteres/i),
    ).toBeInTheDocument()
    expect(confirmPasswordReset).not.toHaveBeenCalled()
  })

  it('depois de trocar, o candidato vai para a entrada do candidato', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue({
      detail: 'Senha alterada. Agora é só entrar com a senha nova.',
      area: 'candidato',
    })
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'senhaNova#2026')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'senhaNova#2026')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    const entrar = await screen.findByRole('link', { name: /entrar com a senha nova/i })
    expect(entrar).toHaveAttribute('href', '/login')
  })

  it('o organizador vai para a entrada da organização', async () => {
    // As duas áreas têm portas diferentes: mandar o organizador para /login
    // deixaria ele com a senha nova e sem conseguir entrar.
    vi.mocked(confirmPasswordReset).mockResolvedValue({
      detail: 'Senha alterada. Agora é só entrar com a senha nova.',
      area: 'organizador',
    })
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'senhaNova#2026')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'senhaNova#2026')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    const entrar = await screen.findByRole('link', { name: /entrar com a senha nova/i })
    expect(entrar).toHaveAttribute('href', '/admin/login')
  })

  it('link expirado mostra o recado do servidor e o caminho para pedir outro', async () => {
    vi.mocked(confirmPasswordReset).mockRejectedValue(
      httpError(400, { non_field_errors: ['Este link não vale mais.'] }),
    )
    renderWithProviders(<ResetPasswordPage />, { route: LINK })

    await userEvent.type(screen.getByLabelText(/^nova senha$/i), 'senhaNova#2026')
    await userEvent.type(screen.getByLabelText(/repita a nova senha/i), 'senhaNova#2026')
    await userEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    expect(await screen.findByText(/este link não vale mais/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /peça um novo/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('endereço sem uid e token não mostra formulário nenhum', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' })

    expect(screen.queryByLabelText(/^nova senha$/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pedir um novo link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
