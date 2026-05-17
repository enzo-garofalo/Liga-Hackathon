import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { useLogin } from '../hooks/useAuth'
import type { LoginPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

export function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
    defaultValues: { email: '', password: '' },
  })
  const mutation = useLogin()

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Use o e-mail e a senha do seu cadastro."
      footer={
        <>
          Não tem conta?{' '}
          <Link to="/register" className="text-brand hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          {...register('email', { required: 'Informe seu e-mail.' })}
          error={errors.email?.message}
        />
        <PasswordInput
          label="Senha"
          autoComplete="current-password"
          {...register('password', { required: 'Informe sua senha.' })}
          error={errors.password?.message}
        />
        {mutation.error && (
          <p className="text-sm text-red-500 font-ui">{getApiError(mutation.error)}</p>
        )}
        <Button type="submit" variant="primary" loading={mutation.isPending} className="w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
