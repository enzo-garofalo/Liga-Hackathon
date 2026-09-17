import { AlertTriangle, RotateCw } from 'lucide-react'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'

interface QueryErrorProps {
  error: unknown
  title?: string
  onRetry?: () => void
  retrying?: boolean
}

/**
 * Falha ao carregar dados da API.
 *
 * Sem isto, uma consulta que falha deixa a seção vazia — e o candidato não
 * distingue "não há processo aberto" de "o servidor está fora do ar".
 */
export function QueryError({
  error,
  title = 'Não foi possível carregar',
  onRetry,
  retrying = false,
}: QueryErrorProps) {
  return (
    <div
      role="alert"
      className="dark-card flex flex-wrap items-center justify-between gap-4 rounded-[21px] border-red-400/30 p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-ink/70">{getApiError(error)}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} loading={retrying}>
          <RotateCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
