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
    <div className="w-56 shrink-0 border-r border-gray-200 bg-white">
      {threads.map((t) => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          className={clsx(
            'block w-full border-b border-gray-100 px-3 py-2.5 text-left text-sm',
            activeKey === t.key ? 'bg-ums-blue/5 font-medium text-ums-blue' : 'text-gray-700 hover:bg-gray-50',
          )}
        >
          {t.label}
          {t.subtitle && <span className="block text-xs text-gray-400">{t.subtitle}</span>}
        </button>
      ))}
      {threads.length === 0 && <p className="p-3 text-xs text-gray-400">No conversations yet.</p>}
    </div>
  )
}
