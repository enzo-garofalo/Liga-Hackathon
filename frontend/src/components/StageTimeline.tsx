import { BookOpen, Check, Circle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { TimelineStage } from '../types/application'
import { Modal } from './ui/Modal'

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function StageIcon({ state }: { state: TimelineStage['state'] }) {
  if (state === 'done') {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/12 ring-1 ring-brand-green/25">
        <Check className="h-4 w-4 text-brand-green" />
      </div>
    )
  }
  if (state === 'current') {
    return (
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand ring-4 ring-brand/15">
        <Loader2 className="h-4 w-4 animate-spin text-white" />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink/[0.06] ring-1 ring-ink/12">
      <Circle className="h-3 w-3 text-ink/35" />
    </div>
  )
}

interface StageTimelineProps {
  stages: TimelineStage[]
  /** Renderizado dentro da etapa atual — área de entrega, por exemplo. */
  renderCurrentExtra?: (stage: TimelineStage) => React.ReactNode
}

export function StageTimeline({ stages, renderCurrentExtra }: StageTimelineProps) {
  // Etapa cujas instruções estão abertas. O backend manda '' para quem ainda
  // não chegou na etapa, então o botão simplesmente não existe nesses casos.
  const [lendo, setLendo] = useState<TimelineStage | null>(null)

  return (
    <>
    <ol className="space-y-1">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1
        const start = formatDate(stage.start_at)
        const end = formatDate(stage.end_at)

        return (
          <li key={stage.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StageIcon state={stage.state} />
              {!isLast && (
                <div
                  className={`w-px flex-1 ${
                    stage.state === 'done' ? 'bg-brand-green/25' : 'bg-ink/10'
                  }`}
                />
              )}
            </div>

            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3
                  className={`font-display text-base font-semibold ${
                    stage.state === 'upcoming' ? 'text-ink/45' : 'text-ink'
                  }`}
                >
                  {stage.name}
                </h3>
                {stage.state === 'current' && (
                  <span className="rounded-full border border-brand/25 bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                    Etapa atual
                  </span>
                )}
                {(start || end) && (
                  <span className="text-xs text-ink/60">
                    {start && end ? `${start} – ${end}` : start || end}
                  </span>
                )}
              </div>

              {stage.description && (
                <p
                  className={`mt-1 text-sm leading-relaxed ${
                    stage.state === 'upcoming' ? 'text-ink/40' : 'text-ink/70'
                  }`}
                >
                  {stage.description}
                </p>
              )}

              {stage.instructions && (
                <button
                  type="button"
                  onClick={() => setLendo(stage)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1 font-ui text-xs font-medium text-brand transition-colors hover:bg-brand/12"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  O que preciso fazer
                </button>
              )}

              {stage.state === 'current' && renderCurrentExtra?.(stage)}
            </div>
          </li>
        )
      })}
    </ol>

    {lendo && (
      <Modal
        title={lendo.name}
        subtitle="O que você precisa fazer nesta etapa"
        size="lg"
        onClose={() => setLendo(null)}
      >
        <p className="whitespace-pre-line font-ui text-sm leading-7 text-ink/80">
          {lendo.instructions}
        </p>
      </Modal>
    )}
    </>
  )
}
