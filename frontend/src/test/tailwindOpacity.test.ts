import { describe, expect, it } from 'vitest'

/**
 * A escala de opacidade do Tailwind anda de 5 em 5.
 *
 * Um valor fora dela não existe: a classe some do CSS gerado, sem erro nenhum,
 * e o elemento passa a herdar a cor do ancestral. Em painel claro dentro de uma
 * casca escura, isso vira texto branco em fundo branco, que foi o que aconteceu
 * com a data no pop-up de notificação.
 *
 * É invisível em revisão de código, porque a classe parece certa. Por isso vira
 * teste. Para um valor fora da escala, use colchetes: `text-ink/[0.68]`.
 *
 * Este arquivo cita classes erradas de proposito e fica fora da varredura.
 */
const ESCALA = new Set([
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
])

const UTILITARIOS = 'text|bg|border|divide|ring|from|via|to'
// Só a forma com número depois da barra. A de colchetes é válida e fica de fora.
const PADRAO = new RegExp(
  `(?<![\\w:-])((?:[a-z-]+:)*(?:${UTILITARIOS})-[a-z0-9-]+)/(\\d+)(?![\\w/-])`,
  'g',
)

// Lido pelo Vite, não pelo sistema de arquivos: o projeto não tem @types/node,
// e isto funciona igual no vitest.
const arquivos = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Este arquivo é a única exceção: ele cita classes erradas de propósito, na
// documentação e no teste de sabotagem abaixo.
const ESTE_ARQUIVO = 'tailwindOpacity.test.ts'

function classesForaDaEscala(conteudo: string, nome: string): string[] {
  return conteudo.split('\n').flatMap((linha, indice) =>
    [...linha.matchAll(PADRAO)]
      .filter((achado) => !ESCALA.has(Number(achado[2])))
      .map((achado) => `${nome}:${indice + 1}  ${achado[0]}`),
  )
}

describe('opacidade das classes do Tailwind', () => {
  it('não usa valor que a escala padrão não gera', () => {
    const fora = Object.entries(arquivos)
      .filter(([nome]) => !nome.endsWith(ESTE_ARQUIVO))
      .flatMap(([nome, conteudo]) => classesForaDaEscala(conteudo, nome))

    expect(fora, `Classes que o Tailwind não gera:\n${fora.join('\n')}`).toEqual([])
  })

  it('varre os arquivos de verdade', () => {
    // Sem isto, um glob errado deixaria o teste acima passar vazio para sempre.
    const nomes = Object.keys(arquivos)
    expect(nomes.length).toBeGreaterThan(50)
    expect(nomes.some((nome) => nome.endsWith('NotificationBell.tsx'))).toBe(true)
  })

  it('reconhece um valor fora da escala', () => {
    // A regra só vale se o detector pegar. Este é o caso que passou batido.
    expect(classesForaDaEscala('<p className="text-ink/68">', 'x.tsx')).toEqual([
      'x.tsx:1  text-ink/68',
    ])
    expect(classesForaDaEscala('<p className="text-ink/70">', 'x.tsx')).toEqual([])
    // A forma com colchetes é válida e não pode ser acusada.
    expect(classesForaDaEscala('<p className="text-ink/[0.68]">', 'x.tsx')).toEqual([])
  })
})
