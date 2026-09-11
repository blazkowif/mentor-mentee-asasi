import clsx from 'clsx'

export interface ChatThread {
  key: string
  label: string
  subtitle?: string
}

export default function ConversationList({
  threads,
  activeKey,
  onSelect,
}: {
  threads: ChatThread[]
  activeKey: string | null
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#191b2b]">
      {threads.map((thread) => (
        <button
          key={thread.key}
          type="button"
          onClick={() => onSelect(thread.key)}
          className={clsx(
            'block w-full border-b border-[#252840] px-4 py-3 text-left text-sm transition',
            activeKey === thread.key
              ? 'bg-[#7885e8]/25 font-medium text-white'
              : 'text-[#d7dbeb] hover:bg-[#303650]',
          )}
        >
          {thread.label}
          {thread.subtitle && (
            <span className="block text-xs text-[#aeb6d2]">{thread.subtitle}</span>
          )}
        </button>
      ))}
      {threads.length === 0 && (
        <p className="p-4 text-xs text-[#aeb6d2]">No conversations yet.</p>
      )}
    </div>
  )
}
