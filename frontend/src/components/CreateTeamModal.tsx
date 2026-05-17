import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Search, Loader2, UserRound } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useParticipantSearch } from '../hooks/useSendInvite'
import { useCreateTeamWithInvites } from '../hooks/useCreateTeamWithInvites'
import { getApiError } from '../utils/errors'
import type { ParticipantSummary } from '../types/participant'

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
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

  const filtered = (results ?? []).filter((p) => !selected.some((s) => s.id === p.id))

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-w-lg w-full rounded-2xl bg-white shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-xl text-[#101114]">Criar equipe</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9497a9] hover:text-[#101114] hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Name */}
          <Input
            label="Nome da equipe"
            placeholder="DevSquad"
            {...register('name', { required: 'Escolha um nome.' })}
            error={errors.name?.message}
          />

          {/* Is open */}
          <label className="flex items-start gap-3 p-4 rounded-xl border border-[#dedee5] cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              {...register('is_open')}
              className="mt-0.5 w-4 h-4 accent-[#7132f5] cursor-pointer flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium font-ui text-[#101114]">Equipe aberta</p>
              <p className="text-xs text-[#9497a9] font-ui mt-0.5">
                Outros participantes podem solicitar entrada na sua equipe
              </p>
            </div>
          </label>

          {/* Invite participants */}
          <div>
            <p className="text-sm font-medium font-ui text-[#101114] mb-1.5">
              Convidar participantes{' '}
              <span className="font-normal text-[#9497a9]">(opcional)</span>
            </p>

            {/* Chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
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

            {/* Search input — hidden when limit reached */}
            {selected.length < MAX_INVITEES ? (
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9497a9] pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true) }}
                    onFocus={() => { if (searchInput.trim()) setShowDropdown(true) }}
                    placeholder="Buscar por nome ou e-mail…"
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
                              <div className="w-8 h-8 rounded-full bg-[#7132f5]/10 text-[#7132f5] font-ui font-semibold text-xs flex items-center justify-center flex-shrink-0 select-none">
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
                Limite de {MAX_INVITEES} convidados atingido
              </p>
            )}
          </div>

          {/* Error */}
          {mutation.error && (
            <p className="text-sm text-red-500 font-ui">{getApiError(mutation.error)}</p>
          )}

          {/* Footer */}
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
  )
}
