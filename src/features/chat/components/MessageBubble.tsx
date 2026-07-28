import clsx from 'clsx'
import type { Database } from '@/types/database.types'
import { formatRelative } from '@/utils/formatDate'

type Message = Database['public']['Tables']['messages']['Row']

export default function MessageBubble({
  message,
  isOwn,
}: {
  message: Message
  isOwn: boolean
}) {
  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm',
          isOwn ? 'bg-ums-blue text-white' : 'bg-white text-gray-900 shadow-sm',
        )}
      >
        {message.message && <p className="whitespace-pre-wrap">{message.message}</p>}
        {message.attachment && (
          <a
            href={message.attachment}
            target="_blank"
            rel="noreferrer"
            className={clsx('block underline', isOwn ? 'text-blue-100' : 'text-ums-blue')}
          >
            Attachment
          </a>
        )}
        <span className={clsx('mt-1 block text-[10px]', isOwn ? 'text-blue-100' : 'text-gray-400')}>
          {formatRelative(message.created_at)}
        </span>
      </div>
    </div>
  )
}
