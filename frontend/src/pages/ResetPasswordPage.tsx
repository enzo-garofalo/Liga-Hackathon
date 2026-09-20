import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/ui/Button'
import { PasswordInput } from '../components/ui/PasswordInput'
import { usePasswordResetConfirm } from '../hooks/useAuth'
import { getApiError } from '../utils/errors'

/** Mesmo mínimo que o cadastro exige, para a troca não abrir uma exceção. */
const SENHA_MIN = 8

interface FormShape {
  password: string
  confirmacao: string
}

function LinkQuebrado({ mensagem }: { mensagem: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="font-ui text-sm leading-6 text-ink/70">{mensagem}</p>
      </div>
      <Link
        to="/forgot-password"
        className="flex h-12 w-full items-center justify-center rounded-full bg-black font-ui text-base font-semibold text-white transition hover:bg-brand"
      >
        Pedir um novo link
      </Link>
    </div>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  // A porta de entrada vem no próprio link do e-mail, para quem abre e desiste
  // não ser devolvido do lado errado. Depois de trocar a senha vale o que a
  // API respondeu, que é a fonte de verdade.
  const loginPath = params.get('area') === 'organizador' ? '/admin/login' : '/login'
  // Convite de organizador: a operação é a mesma, escrever uma senha na conta,
  // mas quem abre este link nunca teve senha. "Trocar a senha" faria a pessoa
  // procurar uma senha antiga que não existe.
  const doConvite = params.get('convite') === '1'

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormShape>({
    defaultValues: { password: '', confirmacao: '' },
  })
  const mutation = usePasswordResetConfirm()

  const onSubmit = handleSubmit((data) =>
    mutation.mutate({ uid, token, password: data.password }),
  )

  // Sem uid e token não há o que confirmar: quem chegou aqui digitando o
  // endereço à mão vê o caminho de volta, e não um formulário que sempre falha.
  const linkIncompleto = !uid || !token

  return (
    <AuthShell
      eyebrow="Recuperar acesso"
      showcaseLight={doConvite ? 'Bem-vindo' : 'Escolha'}
      showcaseBold={doConvite ? 'à organização' : 'uma senha nova'}
      showcaseText={
        doConvite
          ? 'Você foi chamado para ajudar na correção. Escolha uma senha e sua conta está pronta.'
          : 'Só falta definir a senha que você vai usar para entrar na plataforma da Liga.'
      }
      showcaseBadge="Processo Seletivo"
      backTo={loginPath}
      title={doConvite ? 'Criar sua senha' : 'Trocar a senha'}
      description={
        doConvite
          ? 'Escolha a senha que você vai usar para entrar na área do organizador. Ela precisa ter pelo menos 8 caracteres.'
          : 'Escolha uma senha nova para sua conta. Ela precisa ter pelo menos 8 caracteres.'
      }
      footer={
        mutation.isSuccess || doConvite ? undefined : (
          <>
            Não pediu esta troca?{' '}
            <Link to={loginPath} className="font-semibold text-brand hover:text-brand-soft">
              Voltar para o login
            </Link>
          </>
        )
      }
    >
      {linkIncompleto ? (
        <LinkQuebrado mensagem="Este endereço está incompleto. Abra o link direto do e-mail que você recebeu, ou peça um novo." />
      ) : mutation.isSuccess ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="font-ui text-sm leading-6 text-ink/70">{mutation.data.detail}</p>
          </div>
          <Link
            to={mutation.data.area === 'organizador' ? '/admin/login' : '/login'}
            className="flex h-12 w-full items-center justify-center rounded-full bg-black font-ui text-base font-semibold text-white transition hover:bg-brand"
          >
            {doConvite ? 'Entrar na plataforma' : 'Entrar com a senha nova'}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <PasswordInput
            label={doConvite ? 'Senha' : 'Nova senha'}
            autoComplete="new-password"
            className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
            {...register('password', {
              required: 'Escolha uma senha.',
              minLength: { value: SENHA_MIN, message: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` },
            })}
            error={errors.password?.message}
          />
          <PasswordInput
            label={doConvite ? 'Repita a senha' : 'Repita a nova senha'}
            autoComplete="new-password"
            className="auth-field h-12 focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/20"
            {...register('confirmacao', {
              required: 'Repita a senha.',
              // Conferir aqui evita gastar o link, que serve uma vez só, com um
              // erro de digitação que ninguém veria antes de entrar.
              validate: (valor) => valor === getValues('password') || 'As duas senhas não são iguais.',
            })}
            error={errors.confirmacao?.message}
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
            Salvar nova senha
          </Button>
          <p className="text-center font-ui text-sm text-ink/48">
            Link expirado?{' '}
            <Link to="/forgot-password" className="font-semibold text-brand hover:text-brand-soft">
              Peça um novo
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
