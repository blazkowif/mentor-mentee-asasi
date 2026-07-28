import clsx from 'clsx'
import type { Database } from '@/types/database.types'

type Priority = Database['public']['Tables']['tasks']['Row']['priority']

const styles: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[priority])}>
      {priority}
    </span>
  )
}
