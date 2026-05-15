import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useMe } from '../hooks/useAuth'
import { useCreateTeam } from '../hooks/useCreateTeam'
import type { TeamCreatePayload } from '../types/team'
import { getApiError } from '../utils/errors'

interface FormShape {
  name: string
  is_open: boolean
}

export function CreateTeamPage() {
  const meQuery = useMe()
  const { register, handleSubmit, formState: { errors } } = useForm<FormShape>({
    defaultValues: { name: '', is_open: false },
  })
  const mutation = useCreateTeam()

  const onSubmit = handleSubmit((data) => {
    const payload: TeamCreatePayload = { name: data.name, is_open: data.is_open }
    mutation.mutate(payload)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header me={meQuery.data} />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-semibold text-near-black mb-6">
          Criar equipe
        </h1>
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-8 space-y-5"
        >
          <Input
            label="Nome da equipe"
            placeholder="DevSquad"
            {...register('name', { required: 'Escolha um nome.' })}
            error={errors.name?.message}
          />
          <label className="flex items-center gap-2 text-sm font-ui text-near-black">
            <input type="checkbox" {...register('is_open')} className="accent-brand" />
            Aceitar pedidos de entrada (equipe aberta)
          </label>
          {mutation.error && (
            <p className="text-sm text-red-500 font-ui">{getApiError(mutation.error)}</p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" loading={mutation.isPending}>
              Criar equipe
            </Button>
            <Link to="/dashboard">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
