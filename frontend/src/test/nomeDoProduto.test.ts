import { describe, expect, it } from 'vitest'

/**
 * Nomes que saíram do produto e não podem voltar.
 *
 * A plataforma já se chamou "Arena"; a Liga trocou por "Processo Seletivo"
 * (e "PS" onde não cabe). O nome estava em treze lugares, entre eles o
 * `<title>` do index.html, que nenhum teste de render alcança. Por isso a
 * checagem é no código-fonte, e não na tela.
 *
 * A empresa parceira da edição do hackathon saiu pelo mesmo motivo, a pedido
 * da Liga (fase 9). Ali a ausência também é verificada renderizando a landing,
 * em LandingPage.test.tsx.
 */
const PROIBIDOS = ['Arena', 'WeHandle']

// O Vite lê estes globs em tempo de build, então as opções vão literais aqui.
const arquivos: Record<string, string> = {
  ...(import.meta.glob('../**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  // O index.html mora fora do `src` e o `<title>` estava lá. Sem esta linha a
  // varredura passava sem olhar justamente o lugar que nenhum teste de render
  // alcança.
  ...(import.meta.glob('../../index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
}

// Os testes citam os nomes de propósito: é o que eles verificam.
const EXCECOES = ['nomeDoProduto.test.ts', 'LandingPage.test.tsx']

function ocorrencias(nome: string) {
  const alvo = new RegExp(`\\b${nome}\\b`, 'i')
  return Object.entries(arquivos)
    .filter(([caminho]) => !EXCECOES.some((excecao) => caminho.endsWith(excecao)))
    .flatMap(([caminho, conteudo]) =>
      conteudo
        .split('\n')
        .map((linha, indice) => ({ linha, numero: indice + 1 }))
        .filter(({ linha }) => alvo.test(linha))
        .map(({ numero }) => `${caminho}:${numero}`),
    )
}

describe('nomes retirados do produto', () => {
  it.each(PROIBIDOS)('"%s" não aparece no código', (nome) => {
    const achados = ocorrencias(nome)
    expect(achados, `"${nome}" ainda está em:\n${achados.join('\n')}`).toEqual([])
  })

  it('a varredura enxerga os arquivos de verdade', () => {
    // Sem isto, um glob errado deixaria os testes acima passando vazios.
    const nomes = Object.keys(arquivos)
    expect(nomes.length).toBeGreaterThan(50)
    expect(nomes.some((nome) => nome.endsWith('AppLayout.tsx'))).toBe(true)
    expect(nomes.some((nome) => nome.endsWith('index.html'))).toBe(true)
  })

  it('a busca acha o nome quando ele está lá', () => {
    // Um detector que nunca dispara é um teste que sempre passa.
    const conteudo = Object.values(arquivos).find((texto) =>
      texto.includes('Processo Seletivo'),
    )
    expect(conteudo).toBeDefined()
    expect(new RegExp('\\bProcesso Seletivo\\b').test(conteudo as string)).toBe(true)
  })
})
