import logo from '../assets/logo.svg'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAdminLogin } from '../hooks/useAdminLogin'

export function AdminLoginPage() {
  const { form, onSubmit, isPending, apiError } = useAdminLogin()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="Liga de TI" className="h-10 mb-4" />
          <h1 className="font-display text-2xl font-semibold text-near-black">Liga de TI</h1>
          <p className="mt-1 text-sm text-silver-blue font-ui">Acesso administrativo</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 space-y-5"
        >
          <Input
            label="Usuário"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username', { required: 'Campo obrigatório' })}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Campo obrigatório' })}
          />

          {apiError && (
            <p className="text-sm text-red-500 font-ui text-center">
              Usuário ou senha inválidos.
            </p>
          )}

          <Button type="submit" loading={isPending} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
