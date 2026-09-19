import type { Team } from '../types/team'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

interface TeamCardProps {
  team: Team
  onClick: () => void
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const fillPct = Math.round((team.member_count / 4) * 100)
  const vacancies = 4 - team.member_count

  return (
    <button
      onClick={onClick}
      className="dark-card group w-full rounded-[21px] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-tight text-ink">{team.name}</h3>
        {team.is_open && (
          <span className="flex-shrink-0 rounded-full border border-brand/25 bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-soft">
            Aberta
          </span>
        )}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand">
          <span className="font-display text-[10px] font-semibold text-white">
            {initials(team.leader.full_name)}
          </span>
        </div>
        <p className="truncate text-xs text-ink/70">
          Líder: <span className="font-medium text-ink/80">{team.leader.full_name}</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-ink/70">
          <span>{team.member_count}/4 membros</span>
          <span>{vacancies} vaga{vacancies !== 1 ? 's' : ''}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-brand transition-all group-hover:bg-brand-soft"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </button>
  )
}
