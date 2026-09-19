import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Search, UserPlus, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createInvite } from '../api/invites'
import { useParticipantSearch } from '../hooks/useSendInvite'
import type { ParticipantSummary } from '../types/participant'
import { getApiError } from '../utils/errors'
import { Button } from './ui/Button'

interface Props {
  teamId: string
  maxInvitees: number
  meId: string
  onClose: () => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export function InviteMembersModal({ teamId, maxInvitees, meId, onClose }: Props) {
  const qc = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selected, setSelected] = useState<ParticipantSummary[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const { data: results, isLoading: isSearching } = useParticipantSearch(debouncedSearch)
  const filtered = (results ?? []).filter(
    (participant) => participant.id !== meId && !selected.some((item) => item.id === participant.id),
  )
  const remaining = Math.max(0, maxInvitees - selected.length)

  function selectParticipant(participant: ParticipantSummary) {
    if (selected.length >= maxInvitees) return
    setSelected((previous) => [...previous, participant])
    setSearchInput('')
    setDebouncedSearch('')
    setShowDropdown(false)
  }

  function removeSelected(id: string) {
    setSelected((previous) => previous.filter((participant) => participant.id !== id))
  }

  async function handleSend() {
    if (selected.length === 0 || isPending) return
    setIsPending(true)
    setError(null)
    try {
      await Promise.all(selected.map((participant) => createInvite(teamId, participant.id)))
      qc.invalidateQueries({ queryKey: ['team', teamId] })
      setDone(true)
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-4">
        <div className="modal-panel-enter glass-panel pointer-events-auto flex max-h-[88vh] w-full max-w-xl flex-col rounded-[24px] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand sm:flex">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Convidar membro</h2>
                <p className="mt-1 text-sm text-ink/70">
                  Selecione até {maxInvitees} participante{maxInvitees > 1 ? 's' : ''} sem equipe.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink/65 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5">
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((participant) => (
                  <span
                    key={participant.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 py-1 pl-3 pr-2 text-xs font-medium text-brand-soft"
                  >
                    {participant.full_name.split(' ')[0]}
                    <button
                      type="button"
                      onClick={() => removeSelected(participant.id)}
                      className="rounded-full p-0.5 transition-colors hover:bg-brand/25"
                      aria-label={`Remover ${participant.full_name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {remaining > 0 ? (
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/58" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => {
                      if (searchInput.trim()) setShowDropdown(true)
                    }}
                    placeholder="Buscar participante por nome..."
                    className="h-12 w-full rounded-2xl border border-ink/15 bg-white pl-11 pr-10 text-sm font-medium text-ink placeholder:text-ink/55 shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  {isSearching && (
                    <Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink/58" />
                  )}
                </div>

                {showDropdown && debouncedSearch.trim().length > 0 && (
                  <div className="glass-panel absolute top-full z-10 mt-2 w-full overflow-hidden rounded-2xl">
                    {!isSearching && filtered.length === 0 ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-ink/70">
                        <UserRound className="h-4 w-4 flex-shrink-0" />
                        Nenhum participante encontrado
                      </div>
                    ) : (
                      <ul className="max-h-56 divide-y divide-ink/10 overflow-y-auto">
                        {filtered.map((participant) => (
                          <li key={participant.id}>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectParticipant(participant)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand/10"
                            >
                              <div className="flex h-9 w-9 flex-shrink-0 select-none items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-soft">
                                {initials(participant.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink">{participant.full_name}</p>
                                <p className="truncate text-xs text-ink/68">{participant.course} - {participant.semester} sem.</p>
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
              <p className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70">
                Máximo de {maxInvitees} convite{maxInvitees > 1 ? 's' : ''} selecionado.
              </p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {done && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Convites enviados!
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 sm:flex sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="order-2 w-full sm:order-1 sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={isPending}
              disabled={selected.length === 0}
              onClick={handleSend}
              className="order-1 h-11 w-full px-6 sm:order-2 sm:w-auto"
            >
              Enviar convite{selected.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
