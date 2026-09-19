import {
  useAcceptJoinRequest,
  useDeclineJoinRequest,
} from '../hooks/useJoinRequests'
import type { JoinRequest } from '../types/invite'
import { Button } from './ui/Button'

interface JoinRequestListItemProps {
  request: JoinRequest
  teamId: string
}

export function JoinRequestListItem({ request, teamId }: JoinRequestListItemProps) {
  const accept = useAcceptJoinRequest(teamId)
  const decline = useDeclineJoinRequest(teamId)
  const r = request.requester

  return (
    <li className="py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-ui font-medium text-ink">{r.full_name}</p>
        <p className="text-xs text-ink/46 font-ui mt-1">
          {r.course} · {r.semester}º semestre
        </p>
        <p className="text-sm text-ink/70 font-ui mt-2 line-clamp-2">{r.bio}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          onClick={() => decline.mutate(request.id)}
          loading={decline.isPending}
        >
          Recusar
        </Button>
        <Button
          variant="primary"
          onClick={() => accept.mutate(request.id)}
          loading={accept.isPending}
        >
          Aceitar
        </Button>
      </div>
    </li>
  )
}
