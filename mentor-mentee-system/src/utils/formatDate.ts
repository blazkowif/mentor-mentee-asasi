import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(iso: string, pattern = 'd MMM yyyy') {
  return format(new Date(iso), pattern)
}

export function formatRelative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}
