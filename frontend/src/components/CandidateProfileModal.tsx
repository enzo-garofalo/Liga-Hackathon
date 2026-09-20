import {
  Download,
  FileText,
  GitBranch,
  Link2,
  Loader2,
  Mail,
  Phone,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadDeliverable } from '../api/applications'
import { useApplicationDetail, useSaveEvaluation } from '../hooks/useEvaluations'
import { saveBlob } from '../utils/download'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { isValidScore, parseScore, ScoreInput } from './ui/ScoreInput'
import { formatScore, stageAverage } from '../utils/scoring'
import { Modal } from './ui/Modal'

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="kicker">{label}</p>
        <p className="truncate font-ui text-sm text-ink/82">{value || '—'}</p>
      </div>
    </div>
  )
}

interface Props {
  applicationId: string
  scaleMin: number
  scaleMax: number
  /** Nome da próxima etapa; ausente quando o candidato está na última. */
  nextStageName?: string | null
  onApprove?: () => void
  onReject?: () => void
  deciding?: boolean
  onClose: () => void
}

export function CandidateProfileModal({
  applicationId,
  scaleMin,
  scaleMax,
  nextStageName,
  onApprove,
  onReject,
  deciding = false,
  onClose,
}: Props) {
  const detailQuery = useApplicationDetail(applicationId)
  const saveEvaluation = useSaveEvaluation(applicationId)
  const application = detailQuery.data

  const [scores, setScores] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Nota da etapa enquanto a pessoa digita: antes ela só aparecia depois de
  // salvar, então quem avaliava e aprovava direto nunca via o número.
  const notaDaEtapa = application ? stageAverage(scores, application.criteria) : null

  // Pré-carrega as notas que este avaliador já deu.
  useEffect(() => {
    if (!application) return
    const existing: Record<string, string> = {}
    for (const [criterionId, score] of Object.entries(application.my_scores)) {
      existing[criterionId] = String(score)
    }
    setScores(existing)
  }, [application])

  const handleDownload = async (id: string, filename: string) => {
    setError(null)
    setDownloading(id)
    try {
      saveBlob(await downloadDeliverable(id), filename)
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setDownloading(null)
    }
  }

  const submit = () => {
    if (!application?.current_stage) return
    setError(null)

    const filled = Object.entries(scores).filter(([, value]) => value.trim() !== '')
    if (filled.length === 0) {
      setError('Informe ao menos uma nota.')
      return
    }

    const invalid = filled.find(([, value]) => !isValidScore(value, scaleMin, scaleMax))
    if (invalid) {
      setError(
        'Nota fora da escala. Use valores entre ' +
          scaleMin +
          ' e ' +
          scaleMax +
          ', ou 0 para ausência de entrega.',
      )
      return
    }

    saveEvaluation.mutate(
      {
        stage: application.current_stage,
        scores: filled.map(([criterion, value]) => ({
          criterion,
          score: parseScore(value) as number,
        })),
        notes,
      },
      { onSuccess: onClose, onError: (e) => setError(getApiError(e)) },
    )
  }

  const canEvaluate =
    Boolean(application?.current_stage) && (application?.criteria.length ?? 0) > 0

  return (
    <Modal
      title={application?.participant_name ?? 'Candidato'}
      subtitle={
        application?.current_stage_name
          ? `Etapa: ${application.current_stage_name}`
          : undefined
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>

          {application?.status === 'in_progress' && onReject && (
            <Button
              variant="outlined"
              onClick={onReject}
              disabled={deciding}
              className="border-red-400/40 text-red-600 hover:border-red-500 hover:bg-red-500/10 hover:text-red-700"
            >
              <ThumbsDown className="h-4 w-4" />
              Reprovar
            </Button>
          )}

          {application?.status === 'in_progress' && onApprove && (
            <Button
              variant="outlined"
              onClick={onApprove}
              disabled={deciding}
              className="border-brand-green/40 text-brand-green hover:border-brand-green hover:bg-brand-green/10"
            >
              <ThumbsUp className="h-4 w-4" />
              {nextStageName ? `Aprovar para ${nextStageName}` : 'Aprovar'}
            </Button>
          )}

          {canEvaluate && (
            <Button onClick={submit} loading={saveEvaluation.isPending}>
              Salvar avaliação
            </Button>
          )}
        </>
      }
    >
      {detailQuery.isLoading || !application ? (
        <div className="h-64 animate-pulse rounded-xl bg-ink/[0.06]" />
      ) : (
        <div className="space-y-6">
          {/* Na correção anônima a tela diz o que está acontecendo, em vez de
              desenhar uma fileira de campos vazios: quem corrige precisa saber
              que a identidade foi escondida de propósito, e não que faltou
              dado no cadastro. */}
          {application.anonymous ? (
            <p className="rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-3 font-ui text-sm text-ink/75">
              Correção anônima nesta etapa. Você vê o código do candidato e o que
              ele entregou; nome, contato, curso e bio ficam com a coordenação,
              para a nota sair do trabalho e não de quem o escreveu.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={Mail} label="E-mail" value={application.email} />
              <Field icon={Phone} label="Telefone" value={application.phone} />
              <Field icon={GitBranch} label="GitHub" value={application.github} />
              <Field icon={Link2} label="LinkedIn" value={application.linkedin} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/70">
            {!application.anonymous && (
              <>
                <span>
                  Curso:{' '}
                  <span className="font-medium text-ink/85">{application.course}</span>
                </span>
                <span>
                  Semestre:{' '}
                  <span className="font-medium text-ink/85">{application.semester}</span>
                </span>
              </>
            )}
            {application.final_score !== null && (
              <span>
                Média final:{' '}
                <span className="font-medium text-ink/85">
                  {application.final_score.toFixed(2).replace('.', ',')}
                </span>
              </span>
            )}
          </div>

          {/* Some junto com o resto da identidade na correção anônima: a bio é
              texto livre e costuma entregar quem escreveu. */}
          {application.bio && (
            <div>
              <p className="kicker mb-2">Bio</p>
              <p className="whitespace-pre-line rounded-xl border border-ink/10 px-4 py-3 text-sm leading-6 text-ink/75">
                {application.bio}
              </p>
            </div>
          )}

          {application.email === null && (
            <p className="rounded-xl border border-brand/25 bg-brand/[0.06] px-3 py-2 text-xs text-ink/75">
              Correção anônima: os dados de identificação ficam ocultos para o avaliador.
            </p>
          )}

          <div>
            <p className="kicker mb-2">Entregáveis</p>
            {application.deliverables.length === 0 ? (
              <p className="text-sm text-ink/55">Nenhum arquivo enviado.</p>
            ) : (
              <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10">
                {application.deliverables.map((deliverable) => (
                  <li
                    key={deliverable.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-brand" />
                      <span className="truncate font-ui text-sm text-ink/82">
                        {deliverable.filename}
                      </span>
                      <span className="flex-shrink-0 text-xs text-ink/50">
                        {deliverable.stage_name}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownload(deliverable.id, deliverable.filename)}
                      disabled={downloading === deliverable.id}
                      className="rounded-lg p-2 text-ink/60 transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                      title="Baixar"
                    >
                      {downloading === deliverable.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEvaluate ? (
            <div>
              <p className="kicker mb-2">
                Avaliação de {application.current_stage_name} (escala {scaleMin} a {scaleMax})
              </p>
              <div className="space-y-3">
                {application.criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="min-w-0 font-ui text-sm text-ink/82">
                      {criterion.name}
                      {Number(criterion.weight) > 0 && (
                        <span className="ml-2 text-xs text-ink/50">
                          peso {Number(criterion.weight)}%
                        </span>
                      )}
                    </span>
                    <ScoreInput
                      label={`Nota de ${criterion.name}`}
                      value={scores[criterion.id as string] ?? ''}
                      min={scaleMin}
                      max={scaleMax}
                      onChange={(next) =>
                        setScores((prev) => ({
                          ...prev,
                          [criterion.id as string]: next,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              {notaDaEtapa !== null && (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-2.5">
                  <span className="min-w-0 font-ui text-sm font-medium text-ink/82">
                    Nota desta etapa
                    <span className="ml-2 text-xs font-normal text-ink/55">
                      sua avaliação, ainda não salva
                    </span>
                  </span>
                  <span className="font-display text-lg font-semibold tabular-nums text-brand">
                    {formatScore(notaDaEtapa)}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-1">
                <label
                  htmlFor="evaluation-notes"
                  className="font-ui text-sm font-medium text-ink/80"
                >
                  Observações
                </label>
                <textarea
                  id="evaluation-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Registre evidências, não impressões: o que na entrega sustenta a nota."
                  className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink/60">
              A etapa atual não tem critérios configurados, então não há o que avaliar aqui.
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
