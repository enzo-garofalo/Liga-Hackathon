import { BookOpen, Check, Circle, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { downloadStageInstructionsFile } from '../api/stages'
import type { TimelineStage } from '../types/application'
import { saveBlob } from '../utils/download'
import { getApiError } from '../utils/errors'
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
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/10 ring-1 ring-brand-green/25">
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
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink/[0.06] ring-1 ring-ink/10">
      <Circle className="h-3 w-3 text-ink/35" />
    </div>
  )
}

/**
 * Enunciado em PDF da etapa.
 *
 * Passa pelo endpoint autenticado como qualquer arquivo da plataforma: o
 * conteúdo é a prova, e o backend confere se o candidato já chegou na etapa
 * antes de entregar os bytes.
 */
function BotaoEnunciadoPdf({ stage }: { stage: TimelineStage }) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const arquivo = stage.instructions_file

  if (!arquivo) return null

  const baixar = async () => {
    setErro(null)
    setBaixando(true)
    try {
      saveBlob(await downloadStageInstructionsFile(stage.id), arquivo.filename)
    } catch (e) {
      setErro(getApiError(e))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={baixar}
        disabled={baixando}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 font-ui text-xs font-semibold text-white transition-colors hover:bg-[#5f28d4] disabled:opacity-60"
      >
        {baixando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Baixar o enunciado
      </button>
      {erro && (
        <p className="max-w-[16rem] font-ui text-xs font-medium text-red-600">{erro}</p>
      )}
    </div>
  )
}

interface StageTimelineProps {
  stages: TimelineStage[]
  /**
   * Renderizado dentro de cada etapa: área de entrega na etapa atual, e o que
   * o candidato já entregou nas que ficaram para trás.
   *
   * Antes isto só rodava na etapa atual, e o PDF do case sumia da tela assim
   * que a pessoa avançava.
   */
  renderStageExtra?: (stage: TimelineStage) => React.ReactNode
}

export function StageTimeline({ stages, renderStageExtra }: StageTimelineProps) {
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
              {/* Texto à esquerda, ação à direita: o botão ficava embaixo da
                  descrição e passava despercebido. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
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
                </div>

                {/* Com PDF anexado, o enunciado é o arquivo: é ele que o
                    candidato precisa abrir, não o texto. */}
                {stage.instructions_file ? (
                  <BotaoEnunciadoPdf stage={stage} />
                ) : (
                  stage.instructions && (
                    <button
                      type="button"
                      onClick={() => setLendo(stage)}
                      className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-full border border-brand/30 bg-brand/10 px-4 py-2 font-ui text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      O que preciso fazer
                    </button>
                  )
                )}
              </div>

              {renderStageExtra?.(stage)}
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
