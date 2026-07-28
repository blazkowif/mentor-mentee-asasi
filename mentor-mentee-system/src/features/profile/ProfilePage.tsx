import { useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { useUpdateProfile } from './hooks/useProfile'
import { uploadFile, getPublicUrl } from '@/services/storageService'

// View/edit profile fields per role (PRD §17).
// Note: the shared `users` table (PRD §19) only has matric_number/programme —
// lecturer-specific fields like Staff ID / Faculty from §17 aren't in the
// schema yet. Add columns + form fields for those if lecturer profiles need them.
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useUpdateProfile(user?.id ?? '')
  const fileInput = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  if (!user) return null

  async function handleAvatarChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    try {
      const path = `${user.id}/${file.name}`
      await uploadFile('profile', path, file)
      const url = getPublicUrl('profile', path)
      updateProfile.mutate({ profile_image: url })
    } finally {
      setIsUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateProfile.mutate({ name, phone, email })
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Profile</h1>

      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-ums-gray">
          {user.profile_image && (
            <img src={user.profile_image} alt={user.name} className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleAvatarChosen}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={isUploading}
            className="text-sm text-ums-blue hover:underline"
          >
            {isUploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
        {user.matric_number && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Matric Number</label>
            <p className="text-sm text-gray-700">{user.matric_number}</p>
          </div>
        )}
        {user.programme && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Programme</label>
            <p className="text-sm text-gray-700">{user.programme}</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
          <input
            type="email"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={email ?? ''}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={phone ?? ''}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full rounded bg-ums-blue py-2 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
        >
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
