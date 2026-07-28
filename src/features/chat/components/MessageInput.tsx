import { useState } from 'react'

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled?: boolean
}) {
  const [text, setText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 bg-white p-3">
      <input
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Type a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
      >
        Send
      </button>
    </form>
  )
}
