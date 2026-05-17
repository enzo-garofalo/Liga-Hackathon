import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthLeftPanel } from '../components/AuthLeftPanel'
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
    <div className="flex flex-col md:flex-row min-h-screen">
      <AuthLeftPanel sticky />

      {/* Right panel */}
      <div className="flex-1 bg-white flex flex-col overflow-y-auto px-6 pt-8 pb-6 md:h-screen md:py-10 md:px-12">
        <div className="w-full max-w-xl mx-auto md:my-auto">
          <h1 className="font-display leading-tight tracking-tight mb-2">
            <span className="block text-3xl font-light text-[#9497a9]">Criar</span>
            <span className="block text-3xl font-semibold text-[#101114]">sua conta</span>
          </h1>
          <p className="font-ui font-light text-sm text-[#9497a9] mb-8">
            Preencha os dados abaixo para participar do hackathon
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                {...register('email', { required: 'Informe seu e-mail.' })}
                error={errors.email?.message}
              />
              <PasswordInput
                label="Senha"
                autoComplete="new-password"
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                {...register('password', {
                  required: 'Crie uma senha.',
                  minLength: { value: 8, message: 'Mínimo de 8 caracteres.' },
                })}
                error={errors.password?.message}
              />
              <Input
                label="Nome completo"
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                {...register('full_name', { required: 'Informe seu nome completo.' })}
                error={errors.full_name?.message}
              />
              <Select
                label="Curso"
                placeholder="Selecione seu curso"
                options={COURSES}
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                {...register('course', { required: 'Informe seu curso.' })}
                error={errors.course?.message}
              />
              {isOther && (
                <Input
                  label="Qual curso?"
                  placeholder="Digite o nome do seu curso"
                  className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                  {...register('course_other', { required: 'Informe o nome do curso.' })}
                  error={errors.course_other?.message}
                />
              )}
              <Input
                label="Semestre"
                type="number"
                min={1}
                max={20}
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
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
                className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                {...register('github')}
              />
              <div className="md:col-span-2">
                <Input
                  label="LinkedIn (opcional)"
                  placeholder="https://linkedin.com/in/usuario"
                  className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
                  {...register('linkedin')}
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium font-ui text-near-black">
                  Bio (resumo de habilidades e experiências)
                </label>
                <textarea
                  rows={4}
                  {...register('bio', { required: 'Conte um pouco sobre você.' })}
                  className={[
                    'w-full px-3.5 py-2.5 rounded-xl border font-ui text-sm text-near-black',
                    'placeholder:text-silver-blue bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-[#7132f5]/50 focus:border-[#7132f5]',
                    'transition-colors resize-y',
                    errors.bio ? 'border-red-400' : 'border-[#dedee5]',
                  ].join(' ')}
                />
                {errors.bio && <p className="text-xs text-red-500 font-ui">{errors.bio.message}</p>}
              </div>
            </div>

            {mutation.error && (
              <p className="text-sm text-red-500 font-ui">{getApiError(mutation.error)}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending}
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:bg-[#5b1ecf] transition-all duration-200"
            >
              Criar conta
            </Button>
          </form>

          <p className="mt-6 text-sm font-ui text-[#9497a9] text-center">
            Já tem conta?{' '}
            <Link to="/login" className="text-[#7132f5] font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
