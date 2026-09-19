import { describe, expect, it } from 'vitest'
import type { EvaluationCriterion } from '../types/stage'
import { formatScore, stageAverage } from '../utils/scoring'

function criterio(id: string, weight: number): EvaluationCriterion {
  return { id, name: id, order: 1, weight }
}

describe('stageAverage', () => {
  it('pondera pelo peso do critério, como o backend', () => {
    // 5 com peso 80 e 1 com peso 20 = 4,2. Média simples daria 3.
    const criteria = [criterio('a', 80), criterio('b', 20)]
    expect(stageAverage({ a: '5', b: '1' }, criteria)).toBeCloseTo(4.2)
  })

  it('peso zero em todos significa peso igual', () => {
    const criteria = [criterio('a', 0), criterio('b', 0)]
    expect(stageAverage({ a: '5', b: '1' }, criteria)).toBe(3)
  })

  it('conta só o que já foi preenchido', () => {
    const criteria = [criterio('a', 50), criterio('b', 50)]
    expect(stageAverage({ a: '4', b: '' }, criteria)).toBe(4)
  })

  it('aceita vírgula, como o campo de nota', () => {
    expect(stageAverage({ a: '4,5' }, [criterio('a', 100)])).toBe(4.5)
  })

  it('o 0 entra na conta: significa ausência de entrega', () => {
    // Ignorá-lo inflaria a nota de quem não entregou.
    const criteria = [criterio('a', 50), criterio('b', 50)]
    expect(stageAverage({ a: '4', b: '0' }, criteria)).toBe(2)
  })

  it('sem nenhuma nota, não inventa número', () => {
    expect(stageAverage({}, [criterio('a', 100)])).toBeNull()
    expect(stageAverage({ a: '   ' }, [criterio('a', 100)])).toBeNull()
  })

  it('ignora nota que não é número', () => {
    expect(stageAverage({ a: 'abc' }, [criterio('a', 100)])).toBeNull()
  })
})

describe('formatScore', () => {
  it('usa vírgula e duas casas', () => {
    expect(formatScore(4.2)).toBe('4,20')
    expect(formatScore(3)).toBe('3,00')
  })
})
