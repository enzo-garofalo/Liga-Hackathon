import { useAcceptInvite, useDeclineInvite } from '../hooks/useInvites'
import type { TeamInvite } from '../types/invite'
import { Button } from './ui/Button'

interface InviteListItemProps {
  invite: TeamInvite
}

export function InviteListItem({ invite }: InviteListItemProps) {
  const accept = useAcceptInvite()
  const decline = useDeclineInvite()

  return (
    <li className="py-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-ui font-medium text-near-black">{invite.team.name}</p>
        <p className="text-xs text-silver-blue font-ui mt-1">
          Convite de {invite.invited_by.full_name} · {invite.team.member_count}/4 membros
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => decline.mutate(invite.id)}
          loading={decline.isPending}
        >
          Recusar
        </Button>
        <Button
          variant="primary"
          onClick={() => accept.mutate(invite.id)}
          loading={accept.isPending}
        >
          Aceitar
        </Button>
      </div>
    </li>
  )
}
