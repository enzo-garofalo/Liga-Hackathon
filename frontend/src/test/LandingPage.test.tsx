import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOpenProcess } from '../api/openProcess'
import { LandingPage } from '../pages/LandingPage'
import { LandingPageHackathon } from '../pages/LandingPageHackathon'
import { renderWithProviders } from './render'

vi.mock('../api/openProcess', () => ({ getOpenProcess: vi.fn() }))

const aberto = {
  name: 'Processo Seletivo Liga de TI 2026.2',
  registration_start: '2026-10-01T09:00:00-03:00',
  registration_end: '2026-10-20T23:59:00-03:00',
  registration_open: true,
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.mocked(getOpenProcess).mockResolvedValue(null)
  })
  it('apresenta o processo seletivo, não o hackathon', () => {
    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Processo Seletivo 2026.2')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Liga de TI')
    expect(screen.queryByText(/hackathon/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/equipe de 4|4 pessoas|montar sua equipe/i)).not.toBeInTheDocument()
  })

  it('não menciona a empresa parceira da edição anterior', () => {
    renderWithProviders(<LandingPage />)
    expect(screen.queryByText(/wehandle/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/empresa parceira/i)).not.toBeInTheDocument()
  })

  it('oferece entrar como candidato e como organizador', () => {
    // O pedido da Liga: os dois acessos visíveis, como em site de processo seletivo.
    renderWithProviders(<LandingPage />)

    const acesso = document.querySelector('#acesso') as HTMLElement
    expect(acesso).toBeTruthy()

    expect(within(acesso).getByRole('link', { name: /criar minha conta/i })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(within(acesso).getByRole('link', { name: /já tenho conta/i })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(
      within(acesso).getByRole('link', { name: /entrar como organizador/i }),
    ).toHaveAttribute('href', '/admin/login')
  })

  it('explica as três etapas, na ordem', () => {
    renderWithProviders(<LandingPage />)

    const etapas = document.querySelector('#etapas') as HTMLElement
    const nomes = within(etapas)
      .getAllByRole('heading', { level: 3 })
      .map((el) => el.textContent)
    expect(nomes).toEqual(['Resolução do Case', 'Pitch', 'Entrevista'])
  })

  it('não expõe ao candidato o que é assunto de organizador', () => {
    // Peso de etapa, escala de nota e mecânica de correção saíram a pedido da Liga.
    renderWithProviders(<LandingPage />)

    expect(screen.queryByText(/nota final/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/correção anônima/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/mais de um avaliador/i)).not.toBeInTheDocument()
  })

  it('diz o que a Liga é, com missão e visão', () => {
    renderWithProviders(<LandingPage />)

    const liga = document.querySelector('#liga') as HTMLElement
    expect(within(liga).getByRole('heading', { name: /Por que a Liga existe/ })).toBeInTheDocument()
    expect(within(liga).getByText(/março de 2024/i)).toBeInTheDocument()
    expect(within(liga).getByRole('heading', { name: /^Missão$/ })).toBeInTheDocument()
    expect(within(liga).getByRole('heading', { name: /^Visão/ })).toBeInTheDocument()
  })

  it('lista os cinco valores do manual', () => {
    renderWithProviders(<LandingPage />)

    const liga = document.querySelector('#liga') as HTMLElement
    for (const valor of [
      'Protagonismo',
      'Execução',
      'Profissionalismo',
      'Colaboração',
      'Constância',
    ]) {
      expect(within(liga).getByRole('heading', { name: valor })).toBeInTheDocument()
    }
  })

  it('só promete o que a Liga faz de verdade', () => {
    // O manual listava mentoria de ex-membros; a Liga não tem isso rodando.
    renderWithProviders(<LandingPage />)

    const liga = document.querySelector('#liga') as HTMLElement
    expect(within(liga).queryByText(/mentoria/i)).not.toBeInTheDocument()
    expect(within(liga).getByRole('heading', { name: /uma área para atuar/i })).toBeInTheDocument()
  })

  it('mostra os critérios de avaliação antes da inscrição', () => {
    // O planejamento exige que nenhuma regra apareça pela primeira vez no resultado.
    renderWithProviders(<LandingPage />)

    const etapas = document.querySelector('#etapas') as HTMLElement
    expect(within(etapas).getByText('Pensamento crítico')).toBeInTheDocument()
    expect(within(etapas).getByText('Domínio da solução')).toBeInTheDocument()
    expect(within(etapas).getByText('Comprometimento')).toBeInTheDocument()
  })

  it('responde as dúvidas práticas de quem vai se candidatar', () => {
    renderWithProviders(<LandingPage />)

    // A primeira é a que mais afasta candidato de outra área.
    expect(screen.getByText(/Preciso saber programar/i)).toBeInTheDocument()
    expect(screen.getByText(/Posso usar Inteligência Artificial/i)).toBeInTheDocument()
    expect(screen.getByText(/O pitch é presencial/i)).toBeInTheDocument()
    expect(screen.getByText(/Onde acompanho minha candidatura/i)).toBeInTheDocument()
  })

  it('mostra o período de inscrições do processo publicado', async () => {
    // Vem da API, não do código: o organizador muda a data no admin e o site acompanha.
    vi.mocked(getOpenProcess).mockResolvedValue(aberto)
    renderWithProviders(<LandingPage />)

    expect(await screen.findByText(/Inscrições de 01\/10 a 20\/10/)).toBeInTheDocument()
    expect(screen.getByText('abertas')).toBeInTheDocument()
  })

  it('avisa quando o prazo já passou, em vez de convidar', async () => {
    vi.mocked(getOpenProcess).mockResolvedValue({ ...aberto, registration_open: false })
    renderWithProviders(<LandingPage />)

    expect(await screen.findByText('encerradas')).toBeInTheDocument()
    expect(screen.queryByText('abertas')).not.toBeInTheDocument()
  })

  it('o prazo também entra no FAQ', async () => {
    vi.mocked(getOpenProcess).mockResolvedValue(aberto)
    renderWithProviders(<LandingPage />)

    expect(
      await screen.findByText(/Quando começam e terminam as inscrições/),
    ).toBeInTheDocument()
    expect(screen.getByText(/01 de outubro de 2026/)).toBeInTheDocument()
    expect(screen.getByText(/20 de outubro de 2026/)).toBeInTheDocument()
  })

  it('sem processo publicado, não inventa data', async () => {
    // Rascunho tem data provisória: anunciá-la seria mentir para o candidato.
    renderWithProviders(<LandingPage />)

    await waitFor(() => expect(getOpenProcess).toHaveBeenCalled())
    expect(screen.queryByText(/Inscrições de/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Quando começam e terminam/)).not.toBeInTheDocument()
  })

  it('a primeira pergunta do FAQ já vem aberta', () => {
    renderWithProviders(<LandingPage />)
    expect(screen.getByText(/O case não exige código/i)).toBeVisible()
  })
})

describe('LandingPageHackathon (preservada atrás da chave)', () => {
  it('continua inteira para a próxima edição', () => {
    // CLAUDE.md: religar o hackathon é trocar SHOW_HACKATHON, sem reescrever a home.
    renderWithProviders(<LandingPageHackathon />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hackathon #01')
    const inscricao = screen.getAllByRole('link', { name: /participar do hackathon/i })
    expect(inscricao.length).toBeGreaterThan(0)
    for (const link of inscricao) {
      expect(link).toHaveAttribute('href', '/register')
    }
    expect(screen.getByText(/Recepção dos participantes/)).toBeInTheDocument()
  })

  it('também não cita mais a empresa parceira', () => {
    renderWithProviders(<LandingPageHackathon />)
    expect(screen.queryByText(/wehandle/i)).not.toBeInTheDocument()
  })
})
