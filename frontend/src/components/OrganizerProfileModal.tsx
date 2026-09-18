import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useOrganizerProfile } from '../hooks/useOrganizerProfile'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'

interface FormShape {
  full_name: string
  role_title: string
  phone: string
  github: string
  linkedin: string
}

export function OrganizerProfileModal({ onClose }: { onClose: () => void }) {
  const { query, update } = useOrganizerProfile()
  const profile = query.data
  const { register, handleSubmit, reset } = useForm<FormShape>()

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        role_title: profile.role_title,
        phone: profile.phone,
        github: profile.github,
        linkedin: profile.linkedin,
      })
    }
  }, [profile, reset])

  const submit = handleSubmit((data) => {
    update.mutate(data, { onSuccess: onClose })
  })

  return (
    <Modal
      title="Meu perfil"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={update.isPending} disabled={!profile}>
            Salvar alterações
          </Button>
        </>
      }
    >
      {query.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-ink/[0.06]" />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-ink/12 bg-ink/[0.04] px-3 py-1 font-ui text-xs text-ink/70">
              {profile?.email}
            </span>
            <span
              className={`rounded-full border px-3 py-1 font-ui text-xs font-medium ${
                profile?.is_coordinator
                  ? 'border-brand/25 bg-brand/12 text-brand'
                  : 'border-ink/12 bg-ink/[0.04] text-ink/70'
              }`}
            >
              {profile?.is_coordinator ? 'Coordenador' : 'Avaliador'}
            </span>
          </div>

          <Input label="Nome" {...register('full_name')} />
          <Input label="Cargo" placeholder="Diretor de Operações" {...register('role_title')} />
          <Input label="Telefone" placeholder="(19) 99999-0000" {...register('phone')} />
          <Input label="GitHub" placeholder="https://github.com/..." {...register('github')} />
          <Input label="LinkedIn" placeholder="https://linkedin.com/in/..." {...register('linkedin')} />

          <p className="text-xs text-ink/60">
            O cargo é informativo. Quem enxerga a identidade dos candidatos na correção
            anônima e distribui as avaliações é o coordenador do processo.
          </p>

          {update.isError && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
              {getApiError(update.error)}
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}
