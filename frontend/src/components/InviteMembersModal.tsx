import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Search, UserRound, X } from 'lucide-react'
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
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const { data: results, isLoading: isSearching } = useParticipantSearch(debouncedSearch)
  const filtered = (results ?? []).filter(
    (p) => p.id !== meId && !selected.some((s) => s.id === p.id),
  )

  function selectParticipant(p: ParticipantSummary) {
    if (selected.length >= maxInvitees) return
    setSelected((prev) => [...prev, p])
    setSearchInput('')
    setDebouncedSearch('')
    setShowDropdown(false)
  }

  function removeSelected(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSend() {
    if (selected.length === 0 || isPending) return
    setIsPending(true)
    setError(null)
    try {
      await Promise.all(selected.map((p) => createInvite(teamId, p.id)))
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
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="glass-panel pointer-events-auto w-full max-w-lg rounded-2xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">Convidar membro</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink/46 transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

            {selected.length < maxInvitees ? (
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" />
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
                    placeholder="Buscar participante por nome..."
                    className="w-full rounded-xl border border-ink/12 bg-transparent py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink/34 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  {isSearching && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink/42" />
                  )}
                </div>

                {showDropdown && debouncedSearch.trim().length > 0 && (
                  <div className="glass-panel absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl">
                    {!isSearching && filtered.length === 0 ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-ink/46">
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
                                <p className="truncate text-xs text-ink/46">{p.course} - {p.semester} sem.</p>
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
              <p className="text-xs text-ink/46">
                Máximo de {maxInvitees} convite{maxInvitees > 1 ? 's' : ''} atingido
              </p>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            {done && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Convites enviados!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={isPending}
                disabled={selected.length === 0}
                onClick={handleSend}
              >
                Enviar convite{selected.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
