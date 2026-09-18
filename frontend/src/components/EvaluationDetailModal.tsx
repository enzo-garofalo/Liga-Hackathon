import { useEvaluationSummary } from '../hooks/useEvaluations'
import { Modal } from './ui/Modal'

function decimal(value: number) {
  return value.toFixed(2).replace('.', ',')
}

interface Props {
  applicationId: string
  candidateName: string
  onClose: () => void
}

/** Notas por critério e por avaliador, como o modal de nota detalhada do wireframe. */
export function EvaluationDetailModal({ applicationId, candidateName, onClose }: Props) {
  const summaryQuery = useEvaluationSummary(applicationId)
  const summary = summaryQuery.data ?? []

  return (
    <Modal
      title="Avaliação detalhada"
      subtitle={candidateName}
      size="lg"
      onClose={onClose}
    >
      {summaryQuery.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-ink/[0.06]" />
      ) : summary.length === 0 ? (
        <p className="text-sm text-ink/60">Nenhuma avaliação registrada ainda.</p>
      ) : (
        <div className="space-y-8">
          {summary.map((block) => {
            const evaluators = Array.from(
              new Set(block.criteria.flatMap((c) => c.scores.map((s) => s.evaluator))),
            )

            return (
              <section key={block.stage.id}>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-base font-semibold text-ink">
                    Etapa: {block.stage.name}
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-xl border border-ink/10">
                  <table className="w-full min-w-[30rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/55">
                        <th className="px-4 py-2.5 font-medium">Critério</th>
                        {evaluators.map((evaluator) => (
                          <th key={evaluator} className="px-4 py-2.5 font-medium">
                            {evaluator}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 font-medium">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/[0.08]">
                      {block.criteria.map((criterion) => (
                        <tr key={criterion.name}>
                          <td className="px-4 py-2.5 text-ink/82">{criterion.name}</td>
                          {evaluators.map((evaluator) => {
                            const score = criterion.scores.find(
                              (s) => s.evaluator === evaluator,
                            )
                            return (
                              <td key={evaluator} className="px-4 py-2.5 text-ink/70">
                                {score ? decimal(score.score) : '—'}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 font-medium text-ink">
                            {decimal(criterion.average)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {block.notes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="kicker">Observações</p>
                    {block.notes.map((note) => (
                      <p key={note.evaluator} className="text-sm text-ink/75">
                        <span className="font-medium text-ink/85">{note.evaluator}:</span>{' '}
                        {note.text}
                      </p>
                    ))}
                  </div>
                )}

                <p className="mt-3 font-ui text-sm font-semibold text-ink">
                  Média da etapa:{' '}
                  {block.stage_average === null ? '—' : decimal(block.stage_average)}
                </p>
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
