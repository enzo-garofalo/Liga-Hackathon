import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'

interface AuthShellProps {
  /** Texto pequeno acima do título, em caixa alta. */
  eyebrow: string
  /** Primeira parte do título do painel escuro, em peso leve. */
  showcaseLight: string
  /** Segunda parte do título do painel escuro, em negrito. */
  showcaseBold: string
  /** Frase de apoio no painel escuro. */
  showcaseText: string
  /** Selo no rodapé do painel escuro. */
  showcaseBadge: string
  title: string
  description: string
  children: ReactNode
  /** Linha final do cartão, normalmente um caminho de volta. */
  footer?: ReactNode
  /**
   * Para onde voltam as setas e o "Voltar para o login".
   *
   * Existe porque candidato e organizador entram por portas diferentes: fixo
   * em `/login`, quem viesse de `/admin/login` era devolvido na porta errada.
   */
  backTo?: string
}

/**
 * Moldura das telas de conta que não são login nem cadastro.
 *
 * Nasceu para as duas telas de senha esquecida, que são iguais às de entrar em
 * tudo menos no texto. As três telas antigas (login, login do organizador e
 * cadastro) seguem com a cópia própria delas: estão em produção, e trocar a
 * moldura de todas por esta é um risco que nenhuma tarefa pediu.
 */
export function AuthShell({
  eyebrow,
  showcaseLight,
  showcaseBold,
  showcaseText,
  showcaseBadge,
  title,
  description,
  children,
  footer,
  backTo = '/login',
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-white p-2 text-black md:p-3">
      <div className="grid min-h-[calc(100vh-1rem)] overflow-hidden rounded-[1rem] bg-[#f2f2f2] md:min-h-[calc(100vh-1.5rem)] md:grid-cols-2">
        <aside className="aeline-floating-canvas relative hidden min-h-full overflow-hidden rounded-[1rem] text-white md:flex md:flex-col">
          <div className="aeline-grid" />
          <div className="aeline-particles" />
          <div className="relative z-10 flex min-h-full flex-col justify-between p-8 xl:p-10">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Liga de TI" className="h-8 brightness-0 invert" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Processo Seletivo</span>
            </Link>

            <div />

            <div className="max-w-xl pb-28">
              <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.06em] text-white xl:text-5xl">
                <span className="font-light text-white/54">{showcaseLight}</span>{' '}
                <span className="font-extrabold">{showcaseBold}</span>
              </h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/46">{showcaseText}</p>
              <div className="mt-7 flex items-center gap-3 text-white/58">
                <span className="inline-flex h-7 items-center rounded-full border border-white/15 bg-white/[0.06] px-3 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/62">
                  {showcaseBadge}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-y-auto px-5 py-6 md:min-h-0 md:px-10 md:py-8">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Liga de TI" className="h-8" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Processo Seletivo</span>
            </Link>
            <Link
              to={backTo}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(20,16,30,0.08)]"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-6 hidden items-center justify-between md:flex">
              <Link to={backTo} className="flex items-center gap-2 text-sm font-semibold text-black/46 transition hover:text-brand">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>

            <div className="register-form-card bg-white/95 p-5 shadow-[0_24px_70px_rgba(20,16,30,0.08)] md:p-8">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand/60">{eyebrow}</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] text-black md:text-5xl">
                {title}
              </h1>
              <p className="mb-8 mt-4 font-ui text-sm leading-7 text-ink/48">{description}</p>

              {children}

              {/* `/70` e não `/50`: aqui a opacidade vale de verdade (múltiplo de 5),
                  enquanto as classes vizinhas estão fora da escala, não viram CSS e
                  herdam o preto do <main>. A 50% esta linha ficava visivelmente mais
                  apagada que todo o resto do cartão. */}
              {footer && <div className="mt-6 text-center font-ui text-sm text-ink/70">{footer}</div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
