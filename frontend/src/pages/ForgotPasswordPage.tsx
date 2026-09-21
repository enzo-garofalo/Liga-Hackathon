import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { usePasswordResetRequest } from '../hooks/useAuth'
import type { PasswordResetRequestPayload } from '../types/auth'
import { getApiError } from '../utils/errors'

export function ForgotPasswordPage() {
  const [params] = useSearchParams()
  // De qual porta a pessoa saiu. O organizador chega aqui com a marca no
  // endereço; sem isso, todo caminho de volta caía no login de candidato, que
  // recusa a conta dele com "esta conta não tem cadastro de candidato".
  const daOrganizacao = params.get('area') === 'organizador'
  const loginPath = daOrganizacao ? '/admin/login' : '/login'

  const { register, handleSubmit, formState: { errors } } = useForm<PasswordResetRequestPayload>({
    defaultValues: { email: '' },
  })
  const mutation = usePasswordResetRequest()

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <AuthShell
      eyebrow="Recuperar acesso"
      showcaseLight="Esqueceu"
      showcaseBold="a senha?"
      showcaseText="Acontece. Informe seu e-mail e enviamos um link para você escolher uma senha nova."
      showcaseBadge={daOrganizacao ? 'Organização' : 'Processo Seletivo'}
      backTo={loginPath}
      title="Esqueci minha senha"
      description="Informe o e-mail que você usou para criar sua conta. Vale tanto para candidato quanto para a organização."
      footer={
        <>
          Lembrou a senha?{' '}
          <Link to={loginPath} className="font-semibold text-brand hover:text-brand-soft">
            Entrar
          </Link>
        </>
      }
    >
      {mutation.isSuccess ? (
        // A mesma tela para e-mail com conta e sem conta: dizer "não achei este
        // e-mail" contaria a qualquer um quem tem cadastro na Liga.
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/[0.06] p-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="font-ui text-sm leading-6 text-ink/70">{mutation.data.detail}</p>
          </div>
          <p className="font-ui text-sm leading-6 text-ink/48">
            O link vale por algumas horas e só pode ser usado uma vez. Se não chegar nada,
            confira o endereço digitado e tente de novo.
          </p>
          <Link
            to={loginPath}
            className="flex h-12 w-full items-center justify-center rounded-full bg-black font-ui text-base font-semibold text-white transition hover:bg-brand"
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
            {...register('email', { required: 'Informe seu e-mail.' })}
            error={errors.email?.message}
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
            Enviar link de redefinição
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
