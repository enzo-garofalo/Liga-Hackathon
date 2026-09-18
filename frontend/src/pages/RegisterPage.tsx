import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
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
].map((course) => ({ value: course, label: course }))

interface FormShape {
  email: string
  password: string
  full_name: string
  phone: string
  course: string
  course_other: string
  semester: string
  bio: string
  github: string
  linkedin: string
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function getUrl(value: string) {
  const normalized = normalizeUrl(value)
  if (!normalized) return null
  try {
    return new URL(normalized)
  } catch {
    return null
  }
}

function validateLinkedIn(value: string) {
  if (!value.trim()) return 'Informe seu LinkedIn.'
  const url = getUrl(value)
  const host = url?.hostname.replace(/^www\./, '')
  if (!url || host !== 'linkedin.com' || !url.pathname.startsWith('/in/')) {
    return 'Use um link válido do LinkedIn, como linkedin.com/in/seu-perfil.'
  }
  return true
}

function validateGitHub(value: string) {
  if (!value.trim()) return true
  const url = getUrl(value)
  const host = url?.hostname.replace(/^www\./, '')
  if (!url || host !== 'github.com' || url.pathname.split('/').filter(Boolean).length < 1) {
    return 'Use um link válido do GitHub, como github.com/usuario.'
  }
  return true
}

function validatePhone(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return 'Informe seu telefone.'
  if (digits.length < 10 || digits.length > 11) return 'Informe um telefone com DDD.'
  return true
}

function RegisterShowcase() {
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
            Transforme
          </p>
          <h2 className="mt-1 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-white xl:text-5xl">
            ideias em código
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/46">
            Hackathon Liga de TI - 20 de junho de 2026.
          </p>
          <div className="mt-7 flex items-center gap-3 text-white/58">
            <span className="inline-flex h-7 items-center rounded-full border border-white/14 bg-white/[0.06] px-3 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/62">Processo Seletivo</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
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
  const phoneValue = useWatch({ control, name: 'phone' }) ?? ''
  const isOther = selectedCourse === 'Outro'
  const phoneField = register('phone', { required: 'Informe seu telefone.', validate: validatePhone })

  const onSubmit = handleSubmit((data) => {
    const payload: RegisterPayload = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: onlyDigits(data.phone),
      course: isOther ? data.course_other : data.course,
      semester: Number(data.semester),
      bio: data.bio,
      github: normalizeUrl(data.github),
      linkedin: normalizeUrl(data.linkedin),
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
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">Arena</span>
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

              <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('email', { required: 'Informe seu e-mail.' })}
                    error={errors.email?.message}
                  />
                  <PasswordInput
                    label="Senha"
                    autoComplete="new-password"
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('password', {
                      required: 'Crie uma senha.',
                      minLength: { value: 8, message: 'Mínimo de 8 caracteres.' },
                    })}
                    error={errors.password?.message}
                  />
                  <Input
                    label="Nome completo"
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('full_name', { required: 'Informe seu nome completo.' })}
                    error={errors.full_name?.message}
                  />
                  <Input
                    label="Telefone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...phoneField}
                    value={phoneValue}
                    onChange={(event) =>
                      setValue('phone', formatPhone(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: Boolean(errors.phone),
                      })
                    }
                    error={errors.phone?.message}
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
                      required
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
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('semester', {
                      required: 'Informe seu semestre.',
                      min: { value: 1, message: 'Mínimo 1.' },
                      max: { value: 20, message: 'Máximo 20.' },
                    })}
                    error={errors.semester?.message}
                  />
                  <Input
                    label="LinkedIn"
                    placeholder="linkedin.com/in/usuario"
                    required
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('linkedin', { required: 'Informe seu LinkedIn.', validate: validateLinkedIn })}
                    error={errors.linkedin?.message}
                  />
                  <Input
                    label="GitHub (opcional)"
                    placeholder="github.com/usuario"
                    className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                    {...register('github', { validate: validateGitHub })}
                    error={errors.github?.message}
                  />
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="font-ui text-sm font-medium text-ink/80">
                      Bio (resumo de habilidades e experiências)
                      <span className="ml-1 text-red-500">*</span>
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
