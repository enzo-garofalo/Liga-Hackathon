import { useEffect, useRef, useState } from 'react'
import { X, Search, Loader2, UserRound, CheckCircle2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/Button'
import { useParticipantSearch } from '../hooks/useSendInvite'
import { createInvite } from '../api/invites'
import { getApiError } from '../utils/errors'
import type { ParticipantSummary } from '../types/participant'

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
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
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={onClose} />
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
      <div className="max-w-lg w-full rounded-2xl bg-white shadow-2xl p-6 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-xl text-[#101114]">Convidar membro</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9497a9] hover:text-[#101114] hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 bg-[#7132f5]/10 text-[#7132f5] rounded-full pl-3 pr-2 py-1 text-xs font-ui font-medium"
                >
                  {p.full_name.split(' ')[0]}
                  <button
                    type="button"
                    onClick={() => removeSelected(p.id)}
                    className="rounded-full hover:bg-[#7132f5]/20 transition-colors p-0.5"
                    aria-label={`Remover ${p.full_name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          {selected.length < maxInvitees ? (
            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9497a9] pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true) }}
                  onFocus={() => { if (searchInput.trim()) setShowDropdown(true) }}
                  placeholder="Buscar participante por nome…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#dedee5] font-ui text-sm text-[#101114] placeholder:text-[#9497a9] bg-white focus:outline-none focus:ring-2 focus:ring-[#7132f5]/30 focus:border-[#7132f5] transition-colors"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9497a9] animate-spin pointer-events-none" />
                )}
              </div>

              {showDropdown && debouncedSearch.trim().length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-[#dedee5] shadow-lg overflow-hidden">
                  {!isSearching && filtered.length === 0 ? (
                    <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#9497a9] font-ui">
                      <UserRound className="w-4 h-4 flex-shrink-0" />
                      Nenhum participante encontrado
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto divide-y divide-[#dedee5]">
                      {filtered.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectParticipant(p)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#7132f5]/5 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-ui font-semibold text-xs flex items-center justify-center flex-shrink-0 select-none">
                              {initials(p.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-ui font-medium text-[#101114] truncate">{p.full_name}</p>
                              <p className="text-xs text-[#9497a9] font-ui truncate">{p.course} · {p.semester}º sem.</p>
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
            <p className="text-xs text-[#9497a9] font-ui">
              Máximo de {maxInvitees} convite{maxInvitees > 1 ? 's' : ''} atingido
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 font-ui">{error}</p>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-ui">
              <CheckCircle2 className="w-4 h-4" />
              Convites enviados!
            </div>
          )}

          {/* Footer */}
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
