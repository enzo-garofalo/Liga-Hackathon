import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import wehandleMark from '../assets/wehandle-mark.svg'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Select } from '../components/ui/Select'
import { useRegister } from '../hooks/useAuth'
import type { RegisterPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

const COURSES = [
  'Análise e Desenvolvimento de Sistemas',
  'Bacharelado em Sistemas de Informação',
  'Ciência da Computação',
  'Ciência de Dados',
  'Engenharia da Computação',
  'Engenharia de Software',
  'Engenharia Elétrica',
  'Engenharia Mecatrônica',
  'Inteligência Artificial',
  'Redes de Computadores',
  'Segurança da Informação',
  'Tecnologia em Banco de Dados',
  'Tecnologia em Gestão da Tecnologia da Informação',
  'Tecnologia em Internet das Coisas',
  'Outro',
].map((c) => ({ value: c, label: c }))

interface FormShape {
  email: string
  password: string
  full_name: string
  course: string
  course_other: string
  semester: string
  bio: string
  github: string
  linkedin: string
}

function RegisterShowcase() {
  return (
    <aside className="aeline-floating-canvas relative hidden min-h-full overflow-hidden rounded-[1rem] text-white md:flex md:flex-col">
      <div className="aeline-grid" />
      <div className="aeline-particles" />
      <div className="relative z-10 flex min-h-full flex-col justify-between p-8 xl:p-10">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Liga de TI" className="h-8 brightness-0 invert" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">Hackathons</span>
        </Link>

        <div />

        <div className="max-w-xl pb-28">
          <p className="font-display text-4xl font-light leading-[0.98] tracking-[-0.055em] text-white/54 xl:text-5xl">
            Transforme
          </p>
          <h2 className="mt-1 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-white xl:text-5xl">
            ideias em código
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/46">
            Hackathon Liga de TI — 13 de junho de 2026.
          </p>
          <div className="mt-7 flex items-center gap-3 text-white/58">
            <img src={wehandleMark} alt="WeHandle" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold">Liga + WeHandle</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function RegisterPage() {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormShape>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      course: '',
      course_other: '',
      semester: '',
      bio: '',
      github: '',
      linkedin: '',
    },
  })
  const mutation = useRegister()
  const selectedCourse = useWatch({ control, name: 'course' })
  const isOther = selectedCourse === 'Outro'

  const onSubmit = handleSubmit((data) => {
    const payload: RegisterPayload = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      course: isOther ? data.course_other : data.course,
      semester: Number(data.semester),
      bio: data.bio,
      github: data.github || undefined,
      linkedin: data.linkedin || undefined,
    }
    mutation.mutate(payload)
  })

  return (
    <main className="min-h-screen bg-white p-2 text-black md:p-3">
      <div className="grid min-h-[calc(100vh-1rem)] overflow-hidden rounded-[1rem] bg-[#f2f2f2] md:min-h-[calc(100vh-1.5rem)] md:grid-cols-2">
        <RegisterShowcase />

        <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-y-auto px-5 py-6 md:min-h-0 md:px-10 md:py-8">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Liga de TI" className="h-8" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Hackathons</span>
            </Link>
            <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(20,16,30,0.08)]" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
            <div className="mb-6 flex items-center justify-end md:justify-between">
              <Link to="/" className="hidden items-center gap-2 text-sm font-semibold text-black/46 transition hover:text-brand md:flex">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
              <p className="ml-auto text-sm text-black/46">
                Já tem conta?{' '}
                <Link to="/login" className="font-semibold text-brand hover:text-brand-soft">
                  Entrar
                </Link>
              </p>
            </div>

            <div className="register-form-card bg-white/94 p-5 shadow-[0_24px_70px_rgba(20,16,30,0.08)] md:p-8">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand/60">Inscrição</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] text-black md:text-5xl">
                Criar sua conta
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/50">
                Preencha seu perfil para montar equipe, receber convites e acompanhar a submissão do hackathon.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('email', { required: 'Informe seu e-mail.' })}
                    error={errors.email?.message}
                  />
                  <PasswordInput
                    label="Senha"
                    autoComplete="new-password"
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('password', {
                      required: 'Crie uma senha.',
                      minLength: { value: 8, message: 'Mínimo de 8 caracteres.' },
                    })}
                    error={errors.password?.message}
                  />
                  <Input
                    label="Nome completo"
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('full_name', { required: 'Informe seu nome completo.' })}
                    error={errors.full_name?.message}
                  />
                  <Select
                    label="Curso"
                    placeholder="Selecione seu curso"
                    options={COURSES}
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('course', { required: 'Informe seu curso.' })}
                    error={errors.course?.message}
                  />
                  {isOther && (
                    <Input
                      label="Qual curso?"
                      placeholder="Digite o nome do seu curso"
                      className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                      {...register('course_other', { required: 'Informe o nome do curso.' })}
                      error={errors.course_other?.message}
                    />
                  )}
                  <Input
                    label="Semestre"
                    type="number"
                    min={1}
                    max={20}
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('semester', {
                      required: 'Informe seu semestre.',
                      min: { value: 1, message: 'Mínimo 1.' },
                      max: { value: 20, message: 'Máximo 20.' },
                    })}
                    error={errors.semester?.message}
                  />
                  <Input
                    label="GitHub (opcional)"
                    placeholder="https://github.com/usuario"
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('github')}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="LinkedIn (opcional)"
                      placeholder="https://linkedin.com/in/usuario"
                      className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                      {...register('linkedin')}
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="font-ui text-sm font-medium text-ink/80">
                      Bio (resumo de habilidades e experiências)
                    </label>
                    <textarea
                      rows={4}
                      {...register('bio', { required: 'Conte um pouco sobre você.' })}
                      className={[
                        'auth-textarea w-full resize-y bg-transparent px-4 py-3 font-ui text-sm text-ink',
                        'placeholder:text-ink/40',
                        'focus:outline-none focus:ring-2 focus:ring-[#7132f5]/50 focus:border-[#7132f5]',
                        'transition-colors',
                        errors.bio ? 'border-red-400' : 'border-ink/20',
                      ].join(' ')}
                    />
                    {errors.bio && <p className="font-ui text-xs text-red-500">{errors.bio.message}</p>}
                  </div>
                </div>

                {mutation.error && (
                  <p className="font-ui text-sm text-red-500">{getApiError(mutation.error)}</p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  loading={mutation.isPending}
                  className="h-12 w-full rounded-full bg-black text-base font-semibold text-white hover:bg-brand"
                >
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
