import { Link } from 'react-router-dom'
import type { Team } from '../types/team'
import { Badge } from './ui/Badge'

interface TeamCardProps {
  team: Team
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link
      to={`/teams/${team.id}`}
      className="block bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-5 hover:border-brand transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg font-semibold text-near-black">{team.name}</h3>
        {team.is_open && <Badge variant="pending">Aberta</Badge>}
      </div>
      <p className="text-sm text-silver-blue font-ui mb-3">
        Líder: <span className="text-near-black">{team.leader.full_name}</span>
      </p>
      <p className="text-xs text-silver-blue font-ui">
        {team.member_count}/4 membros
      </p>
    </Link>
  )
}
