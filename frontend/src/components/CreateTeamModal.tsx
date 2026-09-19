import { Loader2, Search, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateTeamWithInvites } from '../hooks/useCreateTeamWithInvites'
import { useProfile } from '../hooks/useProfile'
import { useParticipantSearch } from '../hooks/useSendInvite'
import type { ParticipantSummary } from '../types/participant'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface FormShape {
  name: string
  is_open: boolean
}

interface Props {
  onClose: () => void
}

const MAX_INVITEES = 3

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function CreateTeamModal({ onClose }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormShape>({
    defaultValues: { name: '', is_open: false },
  })
  const mutation = useCreateTeamWithInvites()
  const { data: me } = useProfile()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<ParticipantSummary[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: results, isLoading: isSearching } = useParticipantSearch(debouncedSearch)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const filtered = (results ?? []).filter(
    (p) => p.id !== me?.id && !selected.some((s) => s.id === p.id),
  )

  function selectParticipant(p: ParticipantSummary) {
    if (selected.length >= MAX_INVITEES) return
    setSelected((prev) => [...prev, p])
    setSearchInput('')
    setDebouncedSearch('')
    setShowDropdown(false)
  }

  function removeSelected(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id))
  }

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(
      { name: data.name, isOpen: data.is_open, invitees: selected.map((p) => ({ id: p.id })) },
      { onSuccess: () => onClose() },
    )
  })

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="glass-panel pointer-events-auto w-full max-w-lg rounded-2xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">Criar equipe</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <Input
              label="Nome da equipe"
              placeholder="DevSquad"
              {...register('name', { required: 'Escolha um nome.' })}
              error={errors.name?.message}
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 p-4 transition-colors hover:bg-ink/[0.04]">
              <input
                type="checkbox"
                {...register('is_open')}
                className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-[#7132f5]"
              />
              <div>
                <p className="text-sm font-medium text-ink">Equipe aberta</p>
                <p className="mt-0.5 text-xs text-ink/45">
                  Outros participantes podem solicitar entrada na sua equipe
                </p>
              </div>
            </label>

            <div>
              <p className="mb-1.5 text-sm font-medium text-ink/80">
                Convidar participantes <span className="font-normal text-ink/40">(opcional)</span>
              </p>

              {selected.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selected.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 py-1 pl-3 pr-2 text-xs font-medium text-brand-soft"
                    >
                      {p.full_name.split(' ')[0]}
                      <button
                        type="button"
                        onClick={() => removeSelected(p.id)}
                        className="rounded-full p-0.5 transition-colors hover:bg-brand/25"
                        aria-label={`Remover ${p.full_name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {selected.length < MAX_INVITEES ? (
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => {
                        if (searchInput.trim()) setShowDropdown(true)
                      }}
                      placeholder="Buscar por nome ou e-mail..."
                      className="w-full rounded-xl border border-ink/10 bg-transparent py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink/35 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    {isSearching && (
                      <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink/40" />
                    )}
                  </div>

                  {showDropdown && debouncedSearch.trim().length > 0 && (
                    <div className="glass-panel absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl">
                      {!isSearching && filtered.length === 0 ? (
                        <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-ink/45">
                          <UserRound className="h-4 w-4 flex-shrink-0" />
                          Nenhum participante encontrado
                        </div>
                      ) : (
                        <ul className="max-h-48 divide-y divide-ink/10 overflow-y-auto">
                          {filtered.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectParticipant(p)}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand/10"
                              >
                                <div className="flex h-8 w-8 flex-shrink-0 select-none items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-soft">
                                  {initials(p.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-ink">{p.full_name}</p>
                                  <p className="truncate text-xs text-ink/45">{p.course} - {p.semester} sem.</p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink/45">Limite de {MAX_INVITEES} convidados atingido</p>
              )}
            </div>

            {mutation.error && <p className="text-sm text-red-400">{getApiError(mutation.error)}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={mutation.isPending}>
                Criar equipe
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
