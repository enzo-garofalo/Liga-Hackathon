import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { EvaluationCriterion, Stage, StagePayload } from '../types/stage'
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

interface Props {
  stage?: Stage
  onClose: () => void
  onSave: (payload: StagePayload) => void
  saving: boolean
  error: unknown
}

export function StageConfigModal({ stage, onClose, onSave, saving, error }: Props) {
  const [name, setName] = useState(stage?.name ?? '')
  const [description, setDescription] = useState(stage?.description ?? '')
  const [startAt, setStartAt] = useState(toLocalInput(stage?.start_at ?? null))
  const [endAt, setEndAt] = useState(toLocalInput(stage?.end_at ?? null))
  const [weight, setWeight] = useState(String(stage?.weight ?? 0))
  const [acceptsLate, setAcceptsLate] = useState(stage?.accepts_late_submission ?? false)
  const [allowsUpload, setAllowsUpload] = useState(stage?.allows_file_upload ?? false)
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
      start_at: toIso(startAt),
      end_at: toIso(endAt),
      weight: Number(weight || 0),
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

        <Input
          label="Peso da etapa na nota final (%)"
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />

        <div className="rounded-xl border border-ink/12 p-4">
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
                            ? 'border-brand bg-brand/12 text-brand'
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
