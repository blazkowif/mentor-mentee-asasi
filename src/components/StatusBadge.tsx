import clsx from 'clsx'
import type { Database } from '@/types/database.types'

type Status = Database['public']['Tables']['task_submissions']['Row']['status']

const styles: Record<Status, string> = {
  pending: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium capitalize', styles[status])}>
      {status}
    </span>
  )
}
