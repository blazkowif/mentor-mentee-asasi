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
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#3a405c] bg-[#252a40] p-3">
      <input
        className="flex-1 rounded-lg border border-[#4b5375] bg-[#171b2b] px-3 py-2 text-sm text-white outline-none placeholder:text-[#9ca5c5] focus:border-[#8994ed]"
        placeholder="Type a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-lg bg-[#7885e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#8994ed] disabled:opacity-60"
      >
        Send
      </button>
    </form>
  )
}
