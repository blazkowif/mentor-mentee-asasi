import { supabase } from '@/lib/supabase'

export type BucketName = 'profile' | 'announcements' | 'tasks' | 'submissions' | 'chat'

/**
 * Uploads under a path scoped to the owning user (see the folder convention
 * documented at the top of supabase/migrations/0002_storage.sql), so RLS can
 * check auth.uid() against the path.
 */
export async function uploadFile(bucket: BucketName, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export function getPublicUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Private buckets (everything except `profile`) need a signed URL rather
// than a public one.
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}
