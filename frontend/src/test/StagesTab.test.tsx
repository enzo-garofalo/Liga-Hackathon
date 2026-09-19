import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStage,
  deleteStage,
  deleteStageInstructionsFile,
  downloadStageInstructionsFile,
  listStages,
  updateStage,
  uploadStageInstructionsFile,
} from '../api/stages'
import { StagesTab } from '../components/StagesTab'
import { listApplications } from '../api/adminApplications'
import { makeRow, makeStage } from './fixtures'
import { saveBlob } from '../utils/download'
import { httpError } from './http'
import { renderWithProviders } from './render'

vi.mock('../api/stages', () => ({
  listStages: vi.fn(),
  createStage: vi.fn(),
  updateStage: vi.fn(),
  deleteStage: vi.fn(),
  reorderStages: vi.fn(),
  uploadStageInstructionsFile: vi.fn(),
  deleteStageInstructionsFile: vi.fn(),
  downloadStageInstructionsFile: vi.fn(),
}))
vi.mock('../utils/download', () => ({ saveBlob: vi.fn() }))
vi.mock('../api/adminApplications', () => ({
  listApplications: vi.fn(),
  getApplication: vi.fn(),
  getEvaluations: vi.fn(),
  saveEvaluation: vi.fn(),
  runBulkAction: vi.fn(),
}))

describe('StagesTab', () => {
  beforeEach(() => {
    vi.mocked(listStages).mockResolvedValue([makeStage()])
    vi.mocked(createStage).mockResolvedValue(makeStage())
    vi.mocked(updateStage).mockResolvedValue(makeStage())
    vi.mocked(deleteStage).mockResolvedValue(undefined)
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('mostra a etapa com participantes, peso e critérios', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    expect(await screen.findByText('Resolução do Case')).toBeInTheDocument()
    expect(screen.getByText('3 candidatos')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByText('2 critérios')).toBeInTheDocument()
    expect(screen.getByText('pdf')).toBeInTheDocument()
  })

  it('avisa quando não há etapa, porque publicar exige uma', async () => {
    vi.mocked(listStages).mockResolvedValue([])
    renderWithProviders(<StagesTab processId="proc-1" />)

    expect(await screen.findByText('Nenhuma etapa configurada')).toBeInTheDocument()
    expect(screen.getByText(/só pode ser publicado com ao menos uma etapa/)).toBeInTheDocument()
  })

  it('cria etapa com critérios e pesos', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }))
    await userEvent.type(screen.getByLabelText(/^nome/i), 'Pitch')
    await userEvent.click(screen.getByRole('button', { name: /adicionar critério/i }))
    await userEvent.type(screen.getByPlaceholderText('Pensamento crítico'), 'Comunicação')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(createStage).toHaveBeenCalledWith(
        'proc-1',
        expect.objectContaining({
          name: 'Pitch',
          criteria: [expect.objectContaining({ name: 'Comunicação', order: 1 })],
        }),
      ),
    )
  })

  it('avisa quando os pesos não somam 100', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.getByText(/Soma dos pesos: 100%/)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Peso de Viabilidade'))
    await userEvent.type(screen.getByLabelText('Peso de Viabilidade'), '10')

    expect(screen.getByText(/precisa somar 100%/)).toBeInTheDocument()
  })

  it('tipos de arquivo só aparecem com upload ligado', async () => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ allows_file_upload: false, allowed_file_types: [] }),
    ])
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.queryByText('Tipos permitidos')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/permitir envio de arquivos/i))
    expect(screen.getByText('Tipos permitidos')).toBeInTheDocument()
  })

  it('mostra o motivo quando o backend recusa a exclusão', async () => {
    vi.mocked(deleteStage).mockRejectedValue(
      httpError(400, ['Há candidatos nesta etapa. Mova-os antes de excluí-la.']),
    )
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findByText('Resolução do Case')

    await userEvent.click(screen.getByLabelText('Excluir Resolução do Case'))

    expect(
      await screen.findByText('Há candidatos nesta etapa. Mova-os antes de excluí-la.'),
    ).toBeInTheDocument()
  })
})

describe('StagesTab — quem está em cada etapa', () => {
  beforeEach(() => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ participant_count: 2 }),
      makeStage({ id: 'stage-2', name: 'Entrevista', order: 2, participant_count: 1 }),
    ])
    vi.mocked(listApplications).mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [
        makeRow({ id: 'a1', participant_name: 'Ana Lima', current_stage: 'stage-1' }),
        makeRow({ id: 'a2', participant_name: 'João Silva', current_stage: 'stage-1' }),
        makeRow({ id: 'a3', participant_name: 'Bruno Reitano', current_stage: 'stage-2' }),
      ],
    })
  })

  it('a descrição aparece inteira, sem corte', async () => {
    const longa =
      'Inscrição confirmada. O case é divulgado no início da próxima etapa, ' +
      'e você recebe um aviso por e-mail assim que isso acontecer.'
    vi.mocked(listStages).mockResolvedValue([makeStage({ description: longa })])

    renderWithProviders(<StagesTab processId="proc-1" />)
    expect(await screen.findByText(longa)).toBeInTheDocument()
  })

  it('o card mostra a contagem; os nomes ficam atrás do botão', async () => {
    // Nome solto no card esticava a etapa e desalinhava a grade com muita gente.
    renderWithProviders(<StagesTab processId="proc-1" />)

    const caseCard = (await screen.findByText('Resolução do Case')).closest(
      'div.dark-card',
    ) as HTMLElement
    expect(within(caseCard).getByText('2 candidatos')).toBeInTheDocument()
    expect(within(caseCard).queryByText('Ana Lima')).not.toBeInTheDocument()

    await userEvent.click(within(caseCard).getByRole('button', { name: /ver lista/i }))

    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(modal).getByText('João Silva')).toBeInTheDocument()
    expect(within(modal).queryByText('Bruno Reitano')).not.toBeInTheDocument()
  })

  it('a lista de cada etapa traz só quem está nela', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    const interviewCard = (await screen.findByText('Entrevista')).closest(
      'div.dark-card',
    ) as HTMLElement

    await userEvent.click(within(interviewCard).getByRole('button', { name: /ver lista/i }))

    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText('Bruno Reitano')).toBeInTheDocument()
    expect(within(modal).queryByText('Ana Lima')).not.toBeInTheDocument()
  })

  it('com muita gente, o card não cresce: a lista inteira vai para o modal', async () => {
    const muitos = Array.from({ length: 30 }, (_, i) =>
      makeRow({
        id: `app-${i}`,
        participant_name: `Candidato ${i}`,
        current_stage: 'stage-1',
      }),
    )
    vi.mocked(listApplications).mockResolvedValue({
      count: muitos.length,
      next: null,
      previous: null,
      results: muitos,
    })

    renderWithProviders(<StagesTab processId="proc-1" />)

    const caseCard = (await screen.findByText('Resolução do Case')).closest(
      'div.dark-card',
    ) as HTMLElement
    // Nenhum nome no card, independentemente de quantos sejam.
    expect(within(caseCard).queryByText('Candidato 0')).not.toBeInTheDocument()

    await userEvent.click(within(caseCard).getByRole('button', { name: /ver lista/i }))

    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText('Candidato 0')).toBeInTheDocument()
    expect(within(modal).getByText('Candidato 29')).toBeInTheDocument()
  })

  it('pede a lista inteira, não só a primeira página', async () => {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await screen.findAllByRole('button', { name: /ver lista/i })

    expect(listApplications).toHaveBeenCalledWith(
      'proc-1',
      expect.objectContaining({ page_size: 200 }),
    )
  })

  it('etapa vazia não lista ninguém', async () => {
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    renderWithProviders(<StagesTab processId="proc-1" />)

    const caseCard = (await screen.findByText('Resolução do Case')).closest(
      'div.dark-card',
    ) as HTMLElement
    // Etapa sem ninguém não oferece o botão: não há lista para abrir.
    expect(
      within(caseCard).queryByRole('button', { name: /ver lista/i }),
    ).not.toBeInTheDocument()
  })
})

// ── Enunciado em PDF da etapa ─────────────────────────────────────
//
// Sobe por endpoint próprio, multipart, e não pelo "Salvar" da etapa: o resto
// da configuração é JSON.

describe('StagesTab: enunciado em PDF', () => {
  beforeEach(() => {
    vi.mocked(listStages).mockResolvedValue([makeStage()])
    vi.mocked(listApplications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    vi.mocked(uploadStageInstructionsFile).mockResolvedValue(
      makeStage({ instructions_file_name: 'case-2026-2.pdf' }),
    )
    vi.mocked(deleteStageInstructionsFile).mockResolvedValue(
      makeStage({ instructions_file_name: '' }),
    )
    vi.mocked(downloadStageInstructionsFile).mockResolvedValue(new Blob(['pdf']))
    vi.mocked(updateStage).mockResolvedValue(makeStage())
  })

  async function abrirEdicao() {
    renderWithProviders(<StagesTab processId="proc-1" />)
    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    return screen.getByRole('dialog', { name: /editar etapa/i })
  }

  /** Etapa sem PDF abre escrevendo; o anexo é a outra opção do mesmo campo. */
  async function abrirModoPdf() {
    const modal = await abrirEdicao()
    await userEvent.click(within(modal).getByRole('button', { name: 'Anexar PDF' }))
    return modal
  }

  it('o PDF toma o lugar do campo de texto, não fica ao lado', async () => {
    // O candidato vê um ou outro; a tela do organizador acompanha isso.
    const modal = await abrirEdicao()
    expect(within(modal).getByLabelText(/o que o candidato precisa fazer/i)).toHaveProperty(
      'tagName',
      'TEXTAREA',
    )

    await userEvent.click(within(modal).getByRole('button', { name: 'Anexar PDF' }))

    expect(
      within(modal).queryByRole('textbox', { name: /o que o candidato precisa fazer/i }),
    ).not.toBeInTheDocument()
  })

  it('anexa o PDF pela tela de edição da etapa', async () => {
    const modal = await abrirModoPdf()
    const arquivo = new File(['%PDF'], 'case-2026-2.pdf', { type: 'application/pdf' })

    await userEvent.upload(
      within(modal).getByLabelText(/anexar pdf do enunciado/i),
      arquivo,
    )

    await waitFor(() =>
      expect(uploadStageInstructionsFile).toHaveBeenCalledWith('stage-1', arquivo),
    )
    expect(await within(modal).findByText('case-2026-2.pdf')).toBeInTheDocument()
  })

  it('mostra o arquivo já anexado e deixa remover', async () => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ instructions_file_name: 'case-2026-2.pdf' }),
    ])
    const modal = await abrirEdicao()
    expect(within(modal).getByText('case-2026-2.pdf')).toBeInTheDocument()

    await userEvent.click(
      within(modal).getByRole('button', { name: 'Remover case-2026-2.pdf' }),
    )

    await waitFor(() =>
      expect(deleteStageInstructionsFile).toHaveBeenCalledWith('stage-1'),
    )
    await waitFor(() =>
      expect(within(modal).queryByText('case-2026-2.pdf')).not.toBeInTheDocument(),
    )
  })

  it('o organizador baixa o PDF que anexou', async () => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ instructions_file_name: 'case-2026-2.pdf' }),
    ])
    const modal = await abrirEdicao()

    await userEvent.click(
      within(modal).getByRole('button', { name: 'Baixar case-2026-2.pdf' }),
    )

    await waitFor(() =>
      expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'case-2026-2.pdf'),
    )
  })

  it('avisa quando sobrou texto que o candidato não vai ver', async () => {
    // Texto salvo com PDF anexado é armadilha: fica no banco e some da tela.
    vi.mocked(listStages).mockResolvedValue([
      makeStage({
        instructions_file_name: 'case-2026-2.pdf',
        instructions: 'Enunciado antigo em texto.',
      }),
    ])
    const modal = await abrirEdicao()

    expect(within(modal).getByText(/ainda tem o texto antigo salvo/i)).toBeInTheDocument()

    await userEvent.click(within(modal).getByRole('button', { name: /apagar o texto/i }))
    await userEvent.click(within(modal).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() =>
      expect(updateStage).toHaveBeenCalledWith(
        'stage-1',
        expect.objectContaining({ instructions: '' }),
      ),
    )
  })

  it('sem texto sobrando, não avisa nada', async () => {
    vi.mocked(listStages).mockResolvedValue([
      makeStage({ instructions_file_name: 'case-2026-2.pdf', instructions: '' }),
    ])
    const modal = await abrirEdicao()

    expect(
      within(modal).queryByText(/ainda tem o texto antigo salvo/i),
    ).not.toBeInTheDocument()
  })

  it('diz o motivo quando o backend recusa o arquivo', async () => {
    // O `accept=".pdf"` do campo já barra outro formato antes de sair daqui, e
    // o teto de tamanho só o backend conhece. É este o erro que chega à tela.
    vi.mocked(uploadStageInstructionsFile).mockRejectedValue(
      httpError(400, ['O arquivo excede o limite de 10 MB.']),
    )
    const modal = await abrirModoPdf()

    await userEvent.upload(
      within(modal).getByLabelText(/anexar pdf do enunciado/i),
      new File(['%PDF'], 'enorme.pdf', { type: 'application/pdf' }),
    )

    expect(
      await within(modal).findByText('O arquivo excede o limite de 10 MB.'),
    ).toBeInTheDocument()
  })

  it('etapa nova não oferece anexo antes de existir', async () => {
    // O arquivo precisa de um id de etapa. Sem isso o upload não teria destino.
    renderWithProviders(<StagesTab processId="proc-1" />)
    await userEvent.click(await screen.findByRole('button', { name: /nova etapa/i }))
    const modal = screen.getByRole('dialog', { name: /nova etapa/i })
    await userEvent.click(within(modal).getByRole('button', { name: 'Anexar PDF' }))

    expect(within(modal).getByText(/Salve a etapa primeiro/)).toBeInTheDocument()
    expect(
      within(modal).queryByLabelText(/anexar pdf do enunciado/i),
    ).not.toBeInTheDocument()
  })
})
