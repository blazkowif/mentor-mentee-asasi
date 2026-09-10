import { useState } from 'react'

const CONSENT_KEY = 'ppst-essential-storage-notice'

export default function CookieNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) !== 'accepted'
    } catch {
      return false
    }
  })

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted')
    } finally {
      setVisible(false)
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <p className="text-xs leading-5 text-gray-600">
        This system uses essential browser storage to keep your secure login session active. No advertising or tracking cookies are used.
      </p>
      <button
        type="button"
        onClick={accept}
        className="shrink-0 rounded bg-ums-blue px-3 py-2 text-xs font-medium text-white hover:bg-ums-blue-light"
      >
        Understood
      </button>
    </div>
  )
}