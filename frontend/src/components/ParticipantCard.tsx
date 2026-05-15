import type { ParticipantSummary } from '../types/participant'
import { Button } from './ui/Button'

interface ParticipantCardProps {
  participant: ParticipantSummary
  onInvite: () => void
  invited: boolean
  loading?: boolean
}

export function ParticipantCard({ participant, onInvite, invited, loading }: ParticipantCardProps) {
  return (
    <article className="bg-white rounded-2xl border border-[#dedee5] shadow-whisper p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-near-black truncate">
            {participant.full_name}
          </h3>
          <p className="text-xs text-silver-blue font-ui mt-1">
            {participant.course} · {participant.semester}º semestre
          </p>
          <p className="text-sm text-near-black font-ui mt-2 line-clamp-2">
            {participant.bio}
          </p>
          {(participant.github || participant.linkedin) && (
            <p className="text-xs text-silver-blue font-ui mt-2 flex gap-3">
              {participant.github && (
                <a href={participant.github} target="_blank" rel="noreferrer" className="hover:text-brand">
                  GitHub
                </a>
              )}
              {participant.linkedin && (
                <a href={participant.linkedin} target="_blank" rel="noreferrer" className="hover:text-brand">
                  LinkedIn
                </a>
              )}
            </p>
          )}
        </div>
        <Button
          variant={invited ? 'subtle' : 'primary'}
          onClick={onInvite}
          disabled={invited}
          loading={loading}
        >
          {invited ? 'Convidado' : 'Convidar'}
        </Button>
      </div>
    </article>
  )
}
