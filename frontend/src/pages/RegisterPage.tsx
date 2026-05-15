import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useRegister } from '../hooks/useAuth'
import type { RegisterPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

interface FormShape {
  email: string
  password: string
  full_name: string
  course: string
  semester: string  // RHF gives string for number inputs
  bio: string
  github: string
  linkedin: string
}

export function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormShape>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      course: '',
      semester: '',
      bio: '',
      github: '',
      linkedin: '',
    },
  })
  const mutation = useRegister()

  const onSubmit = handleSubmit((data) => {
    const payload: RegisterPayload = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      course: data.course,
      semester: Number(data.semester),
      bio: data.bio,
      github: data.github || undefined,
      linkedin: data.linkedin || undefined,
    }
    mutation.mutate(payload)
  })

  return (
    <AuthLayout
      title="Cadastro"
      subtitle="Crie sua conta para participar do hackathon."
      wide
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            {...register('email', { required: 'Informe seu e-mail.' })}
            error={errors.email?.message}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: 'Crie uma senha.',
              minLength: { value: 8, message: 'Mínimo de 8 caracteres.' },
            })}
            error={errors.password?.message}
          />
          <Input
            label="Nome completo"
            {...register('full_name', { required: 'Informe seu nome completo.' })}
            error={errors.full_name?.message}
          />
          <Input
            label="Curso"
            {...register('course', { required: 'Informe seu curso.' })}
            error={errors.course?.message}
          />
          <Input
            label="Semestre"
            type="number"
            min={1}
            max={20}
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
            {...register('github')}
          />
          <div className="md:col-span-2">
            <Input
              label="LinkedIn (opcional)"
              placeholder="https://linkedin.com/in/usuario"
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
                'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
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
        <Button type="submit" variant="primary" loading={mutation.isPending} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}
