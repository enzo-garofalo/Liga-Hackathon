import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { useAdminLogin } from '../hooks/useAuth'
import type { LoginPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

function AdminLoginShowcase() {
  return (
    <aside className="aeline-floating-canvas relative hidden min-h-full overflow-hidden rounded-[1rem] text-white md:flex md:flex-col">
      <div className="aeline-grid" />
      <div className="aeline-particles" />
      <div className="relative z-10 flex min-h-full flex-col justify-between p-8 xl:p-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-8 brightness-0 invert" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Arena</span>
        </Link>

        <div />

        <div className="max-w-xl pb-28">
          <p className="font-display text-4xl font-light leading-[0.98] tracking-[-0.055em] text-white/54 xl:text-5xl">
            Gestão
          </p>
          <h2 className="mt-1 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-white xl:text-5xl">
            do hackathon
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/46">
            Área exclusiva para acompanhar equipes, aprovações e decisões da organização.
          </p>
          <div className="mt-7 flex items-center gap-3 text-white/58">
            <span className="inline-flex h-7 items-center rounded-full border border-white/14 bg-white/[0.06] px-3 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/62">Organização</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
    defaultValues: { email: '', password: '' },
  })
  const mutation = useAdminLogin()

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <main className="min-h-screen bg-white p-2 text-black md:p-3">
      <div className="grid min-h-[calc(100vh-1rem)] overflow-hidden rounded-[1rem] bg-[#f2f2f2] md:min-h-[calc(100vh-1.5rem)] md:grid-cols-2">
        <AdminLoginShowcase />

        <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-y-auto px-5 py-6 md:min-h-0 md:px-10 md:py-8">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Liga de TI" className="h-8" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Arena</span>
            </Link>
            <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(20,16,30,0.08)]" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-6 hidden items-center justify-between md:flex">
              <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-black/46 transition hover:text-brand">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </div>

            <div className="register-form-card bg-white/94 p-5 shadow-[0_24px_70px_rgba(20,16,30,0.08)] md:p-8">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand/60">Admin</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] text-black md:text-5xl">
                Acesso administrativo
              </h1>
              <p className="mb-8 mt-4 font-ui text-sm leading-7 text-ink/48">
                Entrada exclusiva para a organização da Liga de TI.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                  {...register('email', { required: 'Informe o e-mail.' })}
                  error={errors.email?.message}
                />
                <PasswordInput
                  label="Senha"
                  autoComplete="current-password"
                  className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                  {...register('password', { required: 'Informe a senha.' })}
                  error={errors.password?.message}
                />
                {mutation.error && (
                  <p className="font-ui text-sm text-red-500">{getApiError(mutation.error)}</p>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  loading={mutation.isPending}
                  className="h-12 w-full rounded-full bg-black text-base font-semibold text-white hover:bg-brand"
                >
                  Entrar
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
