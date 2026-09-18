import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react'
import type { ProcessStats as Stats } from '../types/adminProcess'

const tiles = [
  { key: 'total', label: 'Inscritos', icon: Users, tone: 'text-brand' },
  { key: 'in_progress', label: 'Em análise', icon: Clock, tone: 'text-brand-soft' },
  { key: 'approved', label: 'Aprovados', icon: CheckCircle2, tone: 'text-brand-green' },
  { key: 'rejected', label: 'Reprovados', icon: XCircle, tone: 'text-red-500' },
] as const

export function ProcessStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {tiles.map(({ key, label, icon: Icon, tone }) => (
        <div
          key={key}
          className="dark-card relative overflow-hidden rounded-[21px] p-5 text-center"
        >
          <Icon className={`absolute right-4 top-4 h-6 w-6 ${tone} opacity-45`} />
          <p className="font-display text-3xl font-semibold text-ink">{stats[key]}</p>
          <p className="kicker mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}
