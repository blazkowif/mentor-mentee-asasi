import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import { useUpdateProfile } from './hooks/useProfile'
import { uploadFile, getPublicUrl } from '@/services/storageService'
import * as userService from '@/services/userService'
import { queryKeys } from '@/lib/queryKeys'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useUpdateProfile(user?.id ?? '')
  const fileInput = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusIsError, setStatusIsError] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email] = useState(user?.email ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [motto, setMotto] = useState(user?.motto ?? '')

  const { data: mentor } = useQuery({
    queryKey: queryKeys.users.mentor(user?.id ?? ''),
    queryFn: () => (user?.mentor_id ? userService.getMentor(user.mentor_id) : Promise.resolve(null)),
    enabled: !!user?.mentor_id,
  })

  if (!user) return null

  async function handleAvatarChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    setStatus(null)
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
      await uploadFile('profile', path, file)
      const url = getPublicUrl('profile', path)
      updateProfile.mutate(
        { profile_image: url },
        {
          onSuccess: () => {
            setStatusIsError(false)
            setStatus('Profile photo updated.')
          },
          onError: (error) => {
            setStatusIsError(true)
            setStatus(error instanceof Error ? error.message : 'Could not update profile photo.')
          },
        },
      )
    } catch (error) {
      setStatusIsError(true)
      setStatus(error instanceof Error ? error.message : 'Could not upload profile photo.')
    } finally {
      setIsUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    updateProfile.mutate(
      { name, phone, address, motto },
      {
        onSuccess: () => {
          setStatusIsError(false)
          setStatus('Profile changes saved.')
        },
        onError: (error) => {
          setStatusIsError(true)
          setStatus(error instanceof Error ? error.message : 'Could not save profile changes.')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Profile</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-ums-gray">
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-400">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChosen} />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={isUploading}
                className="mt-2 text-sm text-ums-blue hover:underline"
              >
                {isUploading ? 'Uploading…' : 'Change photo'}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400">Name</p>
                <p className="text-sm text-gray-900">{user.name}</p>
              </div>
              {user.matric_number && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Matric Number</p>
                  <p className="text-sm text-gray-900">{user.matric_number}</p>
                </div>
              )}
              {user.programme && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Course</p>
                  <p className="text-sm text-gray-900">{user.programme}</p>
                </div>
              )}
              {user.role === 'student' && mentor && (
                <div>
                  <p className="text-xs font-medium text-gray-400">Mentor</p>
                  <p className="text-sm text-gray-900">{mentor.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-400">Address</p>
                <p className="text-sm text-gray-900">{user.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400">Motto</p>
                <p className="text-sm text-gray-900">{user.motto || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
              <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Account email</label>
              <input type="email" className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500" value={email ?? ''} readOnly />
              <p className="mt-1 text-xs text-gray-400">Contact an administrator to change your login email.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
              <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
              <textarea className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={address ?? ''} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Motto</label>
              <textarea className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={motto ?? ''} onChange={(e) => setMotto(e.target.value)} rows={2} />
            </div>
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="w-full rounded bg-ums-blue py-2 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {status && (
              <p className={statusIsError ? 'text-sm text-red-600' : 'text-sm text-green-700'}>
                {status}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
