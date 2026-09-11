import clsx from 'clsx'
import { useEffect, useState } from 'react'
import type { Database } from '@/types/database.types'
import { formatRelative } from '@/utils/formatDate'

type Message = Database['public']['Tables']['messages']['Row']

export default function MessageBubble({
  message,
  isOwn,
  onDelete,
  isSending = false,
}: {
  message: Message
  isOwn: boolean
  onDelete?: (messageId: string) => void
  isSending?: boolean
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) return

    const closeMenu = () => setIsMenuOpen(false)
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [isMenuOpen])

  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'relative max-w-[75%] rounded-lg px-3 py-2 text-sm',
          isSending && 'animate-pulse',
          isOwn ? 'bg-[#7885e8] text-white' : 'bg-[#3a405c] text-[#f4f6ff] shadow-sm',
        )}
        onContextMenu={(event) => {
          if (!onDelete || isSending) return
          event.preventDefault()
          setIsMenuOpen(true)
        }}
      >
        {message.message && <p className="whitespace-pre-wrap">{message.message}</p>}
        {message.attachment && (
          <a
            href={message.attachment}
            target="_blank"
            rel="noreferrer"
            className={clsx('block underline', isOwn ? 'text-indigo-100' : 'text-[#9e98ff]')}
          >
            Attachment
          </a>
        )}
        {onDelete && isMenuOpen && !isSending && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setIsMenuOpen(false)
              onDelete(message.id)
            }}
            className="absolute right-2 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-[#4b5375] bg-[#252a40] px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-[#343b5b]"
          >
            Delete for everyone
          </button>
        )}
        <span className={clsx('mt-1 block text-[10px]', isOwn ? 'text-indigo-100' : 'text-[#b8bed8]')}>
          {isSending ? 'Sending…' : formatRelative(message.created_at)}
        </span>
      </div>
    </div>
  )
}
