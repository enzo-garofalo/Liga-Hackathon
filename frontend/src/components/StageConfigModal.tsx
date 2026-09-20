import { Download, FileText, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  deleteStageInstructionsFile,
  downloadStageInstructionsFile,
  uploadStageInstructionsFile,
} from '../api/stages'
import type { EvaluationCriterion, Stage, StagePayload } from '../types/stage'
import { saveBlob } from '../utils/download'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'

const FILE_TYPES = ['pdf', 'zip', 'pptx', 'docx', 'png', 'jpg']

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

/**
 * Enunciado em PDF da etapa, no lugar do texto.
 *
 * Sobe na hora, e não no "Salvar": o resto da etapa é JSON e o arquivo é
 * multipart. Misturar os dois obrigaria a converter o endpoint inteiro.
 */
function InstructionsFileField({
  stage,
  temTexto,
  onLimparTexto,
  onChange,
}: {
  stage?: Stage
  /** Avisa que há texto salvo que o candidato não vai ver enquanto houver PDF. */
  temTexto: boolean
  onLimparTexto: () => void
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [anexado, setAnexado] = useState(stage?.instructions_file_name ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const aplicar = async (acao: Promise<Stage>) => {
    setErro(null)
    setOcupado(true)
    try {
      const atualizada = await acao
      setAnexado(atualizada.instructions_file_name)
      onChange()
    } catch (e) {
      setErro(getApiError(e))
    } finally {
      setOcupado(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const baixar = async () => {
    if (!stage) return
    setErro(null)
    setOcupado(true)
    try {
      saveBlob(await downloadStageInstructionsFile(stage.id), anexado)
    } catch (e) {
      setErro(getApiError(e))
    } finally {
      setOcupado(false)
    }
  }

  if (!stage) {
    return (
      <p className="rounded-xl border border-ink/15 bg-ink/[0.02] p-4 font-ui text-xs text-ink/55">
        Salve a etapa primeiro. O arquivo precisa de uma etapa já criada.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* O campo é acionado pelos botões, mas continua sendo campo de
          formulário: precisa de rótulo (decisions.md §15). */}
      <label htmlFor="stage-instructions-file" className="sr-only">
        Anexar PDF do enunciado
      </label>
      <input
        ref={inputRef}
        id="stage-instructions-file"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(event) => {
          const arquivo = event.target.files?.[0]
          if (arquivo) aplicar(uploadStageInstructionsFile(stage.id, arquivo))
        }}
      />

      {anexado ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-3 py-2">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 text-brand" />
            <span className="truncate font-ui text-sm font-medium text-ink">{anexado}</span>
          </span>
          <button
            type="button"
            onClick={baixar}
            disabled={ocupado}
            className="rounded-lg p-1.5 text-ink/60 transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-50"
            aria-label={`Baixar ${anexado}`}
            title="Baixar"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="rounded-lg px-2 py-1 font-ui text-xs font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50"
          >
            Trocar
          </button>
          <button
            type="button"
            onClick={() => aplicar(deleteStageInstructionsFile(stage.id))}
            disabled={ocupado}
            className="rounded-lg p-1.5 text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remover ${anexado}`}
            title="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button
          variant="outlined"
          onClick={() => inputRef.current?.click()}
          loading={ocupado}
          className="self-start"
        >
          <Paperclip className="h-4 w-4" />
          Anexar PDF
        </Button>
      )}

      <p className="font-ui text-xs text-ink/55">
        O candidato vê um botão de baixar no lugar de "O que preciso fazer", e só depois
        de chegar nesta etapa. O arquivo entra assim que você escolhe, sem esperar o
        Salvar.
      </p>

      {/* Texto sobrando é armadilha: fica salvo e o candidato nunca vê. */}
      {anexado && temTexto && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2">
          <p className="font-ui text-xs font-medium text-ink/80">
            Esta etapa ainda tem o texto antigo salvo. Com o PDF anexado, o candidato não
            vê esse texto.
          </p>
          <button
            type="button"
            onClick={onLimparTexto}
            className="flex-shrink-0 rounded-lg px-2 py-1 font-ui text-xs font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            Apagar o texto
          </button>
        </div>
      )}

      {erro && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-ui text-xs font-medium text-red-600">
          {erro}
        </p>
      )}
    </div>
  )
}


interface Props {
  stage?: Stage
  onClose: () => void
  onSave: (payload: StagePayload) => void
  saving: boolean
  error: unknown
  /** Chamado quando o PDF muda, para a lista de etapas recarregar. */
  onFileChange?: () => void
}

export function StageConfigModal({
  stage,
  onClose,
  onSave,
  saving,
  error,
  onFileChange = () => {},
}: Props) {
  const [name, setName] = useState(stage?.name ?? '')
  const [description, setDescription] = useState(stage?.description ?? '')
  const [instructions, setInstructions] = useState(stage?.instructions ?? '')
  // Etapa que já tem PDF abre no modo PDF: é o que o candidato está vendo.
  const [formato, setFormato] = useState<'texto' | 'pdf'>(
    stage?.instructions_file_name ? 'pdf' : 'texto',
  )
  const [startAt, setStartAt] = useState(toLocalInput(stage?.start_at ?? null))
  const [endAt, setEndAt] = useState(toLocalInput(stage?.end_at ?? null))
  const [weight, setWeight] = useState(String(stage?.weight ?? 0))
  const [acceptsLate, setAcceptsLate] = useState(stage?.accepts_late_submission ?? false)
  const [allowsUpload, setAllowsUpload] = useState(stage?.allows_file_upload ?? false)
  const [anonima, setAnonima] = useState(stage?.anonymous_evaluation ?? false)
  const [maxFiles, setMaxFiles] = useState(String(stage?.max_files ?? 1))
  const [fileTypes, setFileTypes] = useState<string[]>(stage?.allowed_file_types ?? ['pdf'])
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(
    stage?.criteria?.length ? stage.criteria : [],
  )

  const weightSum = criteria.reduce((total, c) => total + Number(c.weight || 0), 0)
  const weighted = criteria.some((c) => Number(c.weight) > 0)

  const updateCriterion = (index: number, patch: Partial<EvaluationCriterion>) => {
    setCriteria((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  const submit = () => {
    onSave({
      name,
      description,
      instructions,
      start_at: toIso(startAt),
      end_at: toIso(endAt),
      weight: Number(weight || 0),
      anonymous_evaluation: anonima,
      accepts_late_submission: acceptsLate,
      allows_file_upload: allowsUpload,
      max_files: allowsUpload ? Number(maxFiles || 1) : null,
      allowed_file_types: allowsUpload ? fileTypes : [],
      criteria: criteria.map((item, index) => ({
        ...item,
        order: index + 1,
        weight: Number(item.weight || 0),
      })),
    })
  }

  return (
    <Modal
      title={stage ? 'Editar etapa' : 'Nova etapa'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={!name.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Nome"
          required
          value={name}
          placeholder="Resolução do Case"
          onChange={(event) => setName(event.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="stage-description" className="font-ui text-sm font-medium text-ink/80">
            Descrição
          </label>
          <textarea
            id="stage-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* O enunciado é texto OU arquivo: um substitui o outro na tela do
            candidato, então substitui aqui também. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor={formato === 'texto' ? 'stage-instructions' : 'stage-instructions-file'}
              className="font-ui text-sm font-medium text-ink/80"
            >
              O que o candidato precisa fazer
            </label>
            <div className="flex rounded-full border border-ink/15 p-0.5">
              {(['texto', 'pdf'] as const).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setFormato(opcao)}
                  aria-pressed={formato === opcao}
                  className={`rounded-full px-3 py-1 font-ui text-xs font-semibold transition-colors ${
                    formato === opcao
                      ? 'bg-brand text-white'
                      : 'text-ink/60 hover:text-brand'
                  }`}
                >
                  {opcao === 'texto' ? 'Escrever' : 'Anexar PDF'}
                </button>
              ))}
            </div>
          </div>

          {formato === 'texto' ? (
            <>
              <textarea
                id="stage-instructions"
                rows={6}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Enunciado, formato da entrega, prazos, regras. O candidato lê isto num botão na linha do tempo."
                className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <p className="font-ui text-xs text-ink/55">
                Só fica visível para quem já chegou nesta etapa.
              </p>
            </>
          ) : (
            <InstructionsFileField
              stage={stage}
              temTexto={instructions.trim().length > 0}
              onLimparTexto={() => setInstructions('')}
              onChange={onFileChange}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Início"
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
          <Input
            label="Término"
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 font-ui text-sm text-ink/80">
          <input
            type="checkbox"
            checked={acceptsLate}
            onChange={(event) => setAcceptsLate(event.target.checked)}
            className="accent-brand"
          />
          Aceitar entrega após a data de término
        </label>

        <div>
          <label className="flex items-center gap-2 font-ui text-sm text-ink/80">
            <input
              type="checkbox"
              checked={anonima}
              onChange={(event) => setAnonima(event.target.checked)}
              className="accent-brand"
            />
            Correção anônima nesta etapa
          </label>
          <p className="mt-1 pl-6 font-ui text-xs text-ink/55">
            Enquanto o candidato estiver aqui, quem não coordena vê o código dele
            (C-0007) no lugar do nome, e o arquivo entregue chega sem o nome
            original. Faz sentido na correção do case, onde só a proposta deveria
            pesar, e não no pitch nem na entrevista.
          </p>
        </div>

        <Input
          label="Peso da etapa na nota final (%)"
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />

        <div className="rounded-xl border border-ink/10 p-4">
          <label className="flex items-center gap-2 font-ui text-sm font-medium text-ink/80">
            <input
              type="checkbox"
              checked={allowsUpload}
              onChange={(event) => setAllowsUpload(event.target.checked)}
              className="accent-brand"
            />
            Permitir envio de arquivos
          </label>

          {allowsUpload && (
            <div className="mt-4 space-y-4">
              <Input
                label="Número máximo de arquivos"
                type="number"
                min={1}
                value={maxFiles}
                onChange={(event) => setMaxFiles(event.target.value)}
              />
              <div>
                <p className="mb-2 font-ui text-sm font-medium text-ink/80">
                  Tipos permitidos
                </p>
                <div className="flex flex-wrap gap-2">
                  {FILE_TYPES.map((type) => {
                    const active = fileTypes.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFileTypes((prev) =>
                            active ? prev.filter((t) => t !== type) : [...prev, type],
                          )
                        }
                        className={`rounded-full border px-3 py-1 font-ui text-xs font-medium transition-colors ${
                          active
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-ink/15 text-ink/60 hover:border-brand/40'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-ui text-sm font-medium text-ink/80">
              Critérios de avaliação (barema)
            </p>
            <button
              type="button"
              onClick={() =>
                setCriteria((prev) => [
                  ...prev,
                  { name: '', order: prev.length + 1, weight: 0 },
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1 font-ui text-xs font-medium text-ink/75 transition-colors hover:border-brand hover:text-brand"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar critério
            </button>
          </div>

          {criteria.length === 0 ? (
            <p className="text-xs text-ink/55">
              Sem critérios, a etapa não é avaliada por nota.
            </p>
          ) : (
            <div className="space-y-2">
              {criteria.map((criterion, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={criterion.name}
                    placeholder="Pensamento crítico"
                    onChange={(event) => updateCriterion(index, { name: event.target.value })}
                    className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-transparent px-3 py-2 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={criterion.weight}
                    onChange={(event) =>
                      updateCriterion(index, { weight: Number(event.target.value) })
                    }
                    aria-label={`Peso de ${criterion.name || 'critério'}`}
                    className="w-20 flex-shrink-0 rounded-xl border border-ink/20 bg-transparent px-3 py-2 text-center font-ui text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <span className="flex-shrink-0 text-xs text-ink/55">%</span>
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== index))}
                    className="flex-shrink-0 rounded-lg p-2 text-ink/60 transition-colors hover:bg-red-500/10 hover:text-red-600"
                    aria-label="Remover critério"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {weighted && (
                <p
                  className={`text-xs font-medium ${
                    weightSum === 100 ? 'text-brand-green' : 'text-amber-700'
                  }`}
                >
                  Soma dos pesos: {weightSum}%
                  {weightSum !== 100 && ' — precisa somar 100% para salvar.'}
                </p>
              )}
              {!weighted && (
                <p className="text-xs text-ink/55">
                  Todos os pesos em zero: os critérios valem igual.
                </p>
              )}
            </div>
          )}
        </div>

        {Boolean(error) && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
            {getApiError(error)}
          </p>
        )}
      </div>
    </Modal>
  )
}
