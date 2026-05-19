import { useQuery } from '@tanstack/react-query'
import { getInfo } from '../api/info'

function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const deadline = new Date(y, m - 1, d).setHours(0, 0, 0, 0)
  const today = new Date().setHours(0, 0, 0, 0)
  return Math.round((deadline - today) / 86_400_000)
}

function deadlineMessage(days: number, isoDate: string): string {
  if (days === 0) return 'Hoje é o último dia para formar sua equipe.'
  const formatted = new Date(isoDate).toLocaleDateString('pt-BR')
  if (days === 1) return `Falta 1 dia para o fim das inscrições (${formatted}).`
  return `Faltam ${days} dias para o fim das inscrições (${formatted}).`
}

export function DeadlineBanner() {
  const infoQuery = useQuery({ queryKey: ['info'], queryFn: getInfo })
  const info = infoQuery.data
  if (!info) return null
  const days = daysUntil(info.team_deadline)
  if (days < 0 || days > 7) return null

  return (
    <div className="bg-brand/15 border-b border-brand/25 text-brand-soft font-ui text-sm px-6 py-2 text-center">
      {deadlineMessage(days, info.team_deadline)}
    </div>
  )
}
