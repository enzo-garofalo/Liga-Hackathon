import type { Team } from '../types/team'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

interface TeamCardProps {
  team: Team
  onClick: () => void
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  const fillPct = Math.round((team.member_count / 4) * 100)

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-purple-100 transition-all cursor-pointer"
    >
      {/* Top row: name + open badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-display text-base font-bold text-[#101114] leading-snug">{team.name}</h3>
        {team.is_open && (
          <span className="flex-shrink-0 bg-purple-100 text-purple-700 text-xs font-medium font-ui px-2 py-0.5 rounded-full">
            Aberta
          </span>
        )}
      </div>

      {/* Leader */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-semibold font-display">
            {initials(team.leader.full_name)}
          </span>
        </div>
        <p className="text-xs text-[#9497a9] font-ui truncate">
          Líder: <span className="text-[#101114] font-medium">{team.leader.full_name}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9497a9] font-ui">{team.member_count}/4 membros</span>
          <span className="text-xs text-[#9497a9] font-ui">{4 - team.member_count} vaga{4 - team.member_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-purple-500 h-full rounded-full transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </button>
  )
}
