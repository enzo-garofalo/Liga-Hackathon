import { useForm } from 'react-hook-form'
import { useCreateProcess, useUpdateProcess } from '../hooks/useAdminProcesses'
import type { AdminProcess } from '../types/adminProcess'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'

interface FormShape {
  name: string
  description: string
  registration_start: string
  registration_end: string
  visible: 'yes' | 'no'
}

/** ISO -> valor do input datetime-local, no fuso do navegador. */
function toLocalInput(iso: string) {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

interface Props {
  /** Ausente: criação. Presente: edição do processo existente. */
  process?: AdminProcess
  onClose: () => void
  onCreated?: (processId: string) => void
}

export function ProcessFormModal({ process, onClose, onCreated }: Props) {
  const editing = Boolean(process)
  const create = useCreateProcess()
  const update = useUpdateProcess()
  const mutation = editing ? update : create

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: process
      ? {
          name: process.name,
          description: process.description,
          registration_start: toLocalInput(process.registration_start),
          registration_end: toLocalInput(process.registration_end),
          visible: process.status === 'draft' ? 'no' : 'yes',
        }
      : { visible: 'no' },
  })

  const submit = handleSubmit((data) => {
    const payload = {
      name: data.name,
      description: data.description,
      // O input datetime-local devolve hora local; o backend espera ISO.
      registration_start: new Date(data.registration_start).toISOString(),
      registration_end: new Date(data.registration_end).toISOString(),
    }

    if (process) {
      update.mutate({ id: process.id, payload }, { onSuccess: onClose })
      return
    }

    create.mutate(
      { ...payload, status: data.visible === 'yes' ? 'published' : 'draft' },
      {
        onSuccess: (created) => {
          onCreated?.(created.id)
          onClose()
        },
      },
    )
  })

  return (
    <Modal
      title={editing ? 'Editar processo' : 'Novo processo seletivo'}
      subtitle={editing ? process?.name : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {editing ? 'Salvar alterações' : 'Criar processo'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Nome do processo"
          required
          placeholder="Processo Seletivo Liga de TI 2026.2"
          error={errors.name?.message}
          {...register('name', { required: 'Informe o nome do processo.' })}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="process-description"
            className="font-ui text-sm font-medium text-ink/80"
          >
            Descrição
          </label>
          <textarea
            id="process-description"
            rows={4}
            placeholder="O que o candidato precisa saber sobre o processo."
            className="w-full rounded-xl border border-ink/20 bg-transparent px-3 py-2.5 font-ui text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            {...register('description')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Início das inscrições"
            type="datetime-local"
            required
            error={errors.registration_start?.message}
            {...register('registration_start', { required: 'Informe o início.' })}
          />
          <Input
            label="Fim das inscrições"
            type="datetime-local"
            required
            error={errors.registration_end?.message}
            {...register('registration_end', { required: 'Informe o fim.' })}
          />
        </div>

        {!editing && (
          <fieldset className="space-y-2">
            <legend className="font-ui text-sm font-medium text-ink/80">
              Processo visível para candidatos?
            </legend>
            <label className="flex items-center gap-2 font-ui text-sm text-ink/80">
              <input type="radio" value="yes" {...register('visible')} className="accent-brand" />
              Sim — publica e abre as inscrições
            </label>
            <label className="flex items-center gap-2 font-ui text-sm text-ink/80">
              <input type="radio" value="no" {...register('visible')} className="accent-brand" />
              Não — salvar como rascunho
            </label>
            <p className="text-xs text-ink/60">
              Rascunho não aparece para candidato nenhum. Depois de criar, configure as
              etapas em "Gerenciar processo" e abra as inscrições por lá.
            </p>
          </fieldset>
        )}

        {mutation.isError && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
            {getApiError(mutation.error)}
          </p>
        )}
      </form>
    </Modal>
  )
}
