import { useForm } from 'react-hook-form'
import { AuthLeftPanel } from '../components/AuthLeftPanel'
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
    <div className="flex flex-col md:flex-row min-h-screen">
      <AuthLeftPanel />

      {/* Right panel */}
      <div className="flex-1 bg-white flex flex-col px-6 pt-8 pb-6 md:items-center md:justify-center md:min-h-screen md:p-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display leading-tight tracking-tight mb-2">
            <span className="block text-3xl font-light text-[#9497a9]">Acesso</span>
            <span className="block text-3xl font-semibold text-[#101114]">administrativo</span>
          </h1>
          <p className="font-ui font-light text-sm text-[#9497a9] mb-8">
            Entrada exclusiva para a organização da Liga de TI.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
              {...register('email', { required: 'Informe o e-mail.' })}
              error={errors.email?.message}
            />
            <PasswordInput
              label="Senha"
              autoComplete="current-password"
              className="h-12 rounded-xl focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
              {...register('password', { required: 'Informe a senha.' })}
              error={errors.password?.message}
            />
            {mutation.error && (
              <p className="text-sm text-red-500 font-ui">{getApiError(mutation.error)}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending}
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:bg-[#5b1ecf] transition-all duration-200"
            >
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
