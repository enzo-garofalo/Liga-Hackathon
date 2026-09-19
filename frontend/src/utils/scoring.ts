import type { EvaluationCriterion } from '../types/stage'
import { parseScore } from '../components/ui/ScoreInput'

/**
 * Nota da etapa a partir do que o avaliador digitou.
 *
 * Espelha `services/scoring.py` do backend: média ponderada pelo peso do
 * critério, e peso zero em todos significa peso igual. Serve para a ficha
 * mostrar a nota enquanto a pessoa preenche, em vez de ela só aparecer depois
 * de salvar e recarregar.
 *
 * Conta apenas os critérios já preenchidos — é prévia do que está na tela, não
 * do que está no banco. O 0 conta normalmente: significa ausência de entrega,
 * e o backend também o inclui na média.
 */
export function stageAverage(
  scores: Record<string, string>,
  criteria: EvaluationCriterion[],
): number | null {
  const preenchidos: { value: number; weight: number }[] = []

  for (const criterion of criteria) {
    const raw = scores[criterion.id as string] ?? ''
    if (raw.trim() === '') continue
    const value = parseScore(raw)
    if (value === null) continue
    preenchidos.push({ value, weight: Number(criterion.weight) || 0 })
  }

  if (preenchidos.length === 0) return null

  const totalWeight = preenchidos.reduce((total, item) => total + item.weight, 0)
  if (totalWeight === 0) {
    return preenchidos.reduce((total, item) => total + item.value, 0) / preenchidos.length
  }

  return (
    preenchidos.reduce((total, item) => total + item.value * item.weight, 0) / totalWeight
  )
}

/** Nota como a Liga lê: duas casas, vírgula decimal. */
export function formatScore(value: number): string {
  return value.toFixed(2).replace('.', ',')
}
