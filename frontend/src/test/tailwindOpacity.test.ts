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
 * **Cor de texto fica de fora desta regra, de propósito.** Havia 135 classes de
 * texto fora da escala; arredondar todas deixou a interface visivelmente mais
 * clara, porque elas vinham renderizando a 100% ao herdar a cor do ancestral, e
 * a Liga preferiu o que já estava na tela. Elas continuam mortas, e continuam
 * sendo uma armadilha: em painel claro dentro de casca escura, o texto sai
 * branco. Foi o que aconteceu no pop-up de notificação, corrigido à mão ali.
 *
 * Fundo e borda não têm essa saída: fora da escala, o fundo não pinta e a borda
 * cai no cinza padrão do Tailwind. Não é tom errado, é estilo faltando. Por isso
 * a varredura cobre esses.
 *
 * Este arquivo cita classes erradas de propósito e fica fora da varredura.
 */
const ESCALA = new Set([
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
])

const UTILITARIOS = 'bg|border|divide|ring|from|via|to'
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
    // A regra só vale se o detector pegar. Um detector que nunca dispara é um
    // teste que sempre passa.
    expect(classesForaDaEscala('<div className="bg-brand/12">', 'x.tsx')).toEqual([
      'x.tsx:1  bg-brand/12',
    ])
    expect(classesForaDaEscala('<div className="bg-brand/10">', 'x.tsx')).toEqual([])
    // A forma com colchetes é válida e não pode ser acusada.
    expect(classesForaDaEscala('<div className="bg-brand/[0.12]">', 'x.tsx')).toEqual([])
    // Cor de texto está fora da regra: ver o comentário no topo.
    expect(classesForaDaEscala('<p className="text-ink/68">', 'x.tsx')).toEqual([])
  })
})
