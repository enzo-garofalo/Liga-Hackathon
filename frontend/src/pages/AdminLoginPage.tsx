import { useForm } from 'react-hook-form'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { useAdminLogin } from '../hooks/useAuth'
import type { LoginPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

export function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
    defaultValues: { email: '', password: '' },
  })
  const mutation = useAdminLogin()

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <AuthLayout
      title="Acesso administrativo"
      subtitle="Entrada exclusiva para a organização da Liga de TI."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          {...register('email', { required: 'Informe o e-mail.' })}
          error={errors.email?.message}
        />
        <PasswordInput
          label="Senha"
          autoComplete="current-password"
          {...register('password', { required: 'Informe a senha.' })}
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
