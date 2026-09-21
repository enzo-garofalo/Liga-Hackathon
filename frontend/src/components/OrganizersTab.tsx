import { Mail, Trash2, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useInviteOrganizer,
  useProcessOrganizers,
  useRemoveOrganizer,
  useResendOrganizerInvite,
} from '../hooks/useProcessOrganizers'
import type { AdminProcessDetail } from '../types/adminProcess'
import type { ProcessOrganizer } from '../types/organizer'
import { getApiError } from '../utils/errors'
import { DistribuicaoTab } from './DistribuicaoTab'
import { QueryError } from './QueryError'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Input } from './ui/Input'

export function OrganizersTab({ process }: { process: AdminProcessDetail }) {
  const query = useProcessOrganizers(process.id)
  const membros = useMemo(() => query.data ?? [], [query.data])

  if (query.isError) {
    return (
      <QueryError
        title="Não foi possível carregar os organizadores"
        error={query.error}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    )
  }

  return (
    <div className="space-y-8">
      <QuemEsta process={process} membros={membros} carregando={query.isLoading} />
      <DistribuicaoTab process={process} membros={membros} />
    </div>
  )
}

// ── Quem está no processo ─────────────────────────────────────────

function QuemEsta({
  process,
  membros,
  carregando,
}: {
  process: AdminProcessDetail
  membros: ProcessOrganizer[]
  carregando: boolean
}) {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tirando, setTirando] = useState<ProcessOrganizer | null>(null)

  const convidar = useInviteOrganizer(process.id)
  const reenviar = useResendOrganizerInvite(process.id)
  const remover = useRemoveOrganizer(process.id)

  const enviar = (event: React.FormEvent) => {
    event.preventDefault()
    setErro(null)
    setAviso(null)
    convidar.mutate(
      { email: email.trim(), full_name: nome.trim(), role_title: cargo.trim() },
      {
        onSuccess: () => {
          setAviso(`Convite enviado para ${email.trim()}.`)
          setEmail('')
          setNome('')
          setCargo('')
        },
        onError: (e) => setErro(getApiError(e)),
      },
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Quem está neste processo
        </h2>
        <p className="mt-1 font-ui text-sm text-ink/60">
          Quem você chamar entra como avaliador: corrige o que você distribuir e não
          aprova, não reprova e não move ninguém de etapa. A pessoa cria a própria
          senha pelo link que recebe por e-mail.
        </p>
      </div>

      <form
        onSubmit={enviar}
        className="grid gap-4 rounded-2xl border border-ink/10 bg-white/50 p-4 sm:grid-cols-3"
      >
        <Input
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="pessoa@exemplo.com"
        />
        <Input
          label="Nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Como aparece na plataforma"
        />
        <Input
          label="Cargo na Liga"
          value={cargo}
          onChange={(event) => setCargo(event.target.value)}
          placeholder="Diretor de Operações"
        />
        <div className="sm:col-span-3">
          <Button type="submit" loading={convidar.isPending} disabled={!email.trim()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar ao processo
          </Button>
        </div>
      </form>

      {erro && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-ui text-sm font-medium text-red-600">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="rounded-xl border border-brand/30 bg-brand/[0.06] px-3 py-2 font-ui text-sm font-medium text-brand">
          {aviso}
        </p>
      )}

      {carregando ? (
        <div className="h-24 animate-pulse rounded-2xl bg-ink/5" />
      ) : membros.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 px-4 py-6 text-center font-ui text-sm text-ink/60">
          Ninguém foi chamado para este processo ainda.
        </p>
      ) : (
        <ul
          aria-label="Organizadores deste processo"
          className="divide-y divide-ink/10 rounded-2xl border border-ink/10"
        >
          {membros.map((membro) => (
            <li
              key={membro.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui text-sm font-medium text-ink">
                  {membro.full_name || membro.email}
                </p>
                <p className="truncate font-ui text-xs text-ink/55">
                  {membro.email}
                  {membro.role_title ? ` · ${membro.role_title}` : ''}
                </p>
              </div>

              <Badge variant={membro.is_coordinator ? 'pending' : 'neutral'}>
                {membro.is_coordinator ? 'Coordenador' : 'Avaliador'}
              </Badge>

              {membro.pending && (
                <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 font-ui text-xs font-semibold text-amber-700">
                  Convite pendente
                </span>
              )}

              <span className="font-ui text-xs text-ink/55">
                {membro.workload} correç{membro.workload === 1 ? 'ão' : 'ões'}
              </span>

              {membro.pending && (
                <button
                  type="button"
                  onClick={() =>
                    reenviar.mutate(membro.user_id, {
                      onSuccess: () => setAviso(`Convite reenviado para ${membro.email}.`),
                      onError: (e) => setErro(getApiError(e)),
                    })
                  }
                  className="font-ui text-xs text-ink/60 underline underline-offset-4 transition-colors hover:text-brand"
                >
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  Reenviar convite
                </button>
              )}

              {!membro.is_coordinator && (
                <button
                  type="button"
                  onClick={() => setTirando(membro)}
                  className="font-ui text-xs text-ink/60 underline underline-offset-4 transition-colors hover:text-red-600"
                >
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  Tirar do processo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {tirando && (
        <ConfirmDialog
          title="Tirar do processo"
          question={`Tirar ${tirando.full_name || tirando.email} deste processo?`}
          detail="A pessoa perde o acesso e as correções que estavam com ela voltam a ficar sem dono, para você distribuir de novo. As notas que ela já deu continuam valendo."
          confirmLabel="Tirar"
          tone="danger"
          loading={remover.isPending}
          onCancel={() => setTirando(null)}
          onConfirm={() =>
            remover.mutate(tirando.user_id, {
              onSuccess: () => {
                setTirando(null)
                setAviso(`${tirando.full_name || tirando.email} saiu do processo.`)
              },
              onError: (e) => {
                setTirando(null)
                setErro(getApiError(e))
              },
            })
          }
        />
      )}
    </section>
  )
}
