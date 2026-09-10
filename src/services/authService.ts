import { supabase } from '@/lib/supabase'

/**
 * Login by Matric Number + IC Number (PRD section 6 — no public registration,
 * accounts are pre-imported by administrators).
 *
 * Supabase Auth is email/password (or OTP) native, so matric-number login needs
 * a translation step. Recommended approach for Claude Code to implement:
 *
 *   1. On account import, admin creates the auth user with a synthetic email
 *      `${matric_number}@ppst.ums.local` and a password derived from / reset
 *      to the IC number on first login (force password change after).
 *   2. This function looks up that synthetic email, then calls
 *      supabase.auth.signInWithPassword.
 *
 * Do this lookup via a Postgres RPC (`get_login_email(matric_number)`) rather
 * than querying the `users` table directly with the anon key, so unauthenticated
 * users can't enumerate matric numbers / emails.
 */
export async function loginWithMatric(matricNumber: string, icNumber: string) {
  const { data: emailLookup, error: lookupError } = await supabase.rpc(
    'get_login_email',
    { p_matric_number: matricNumber },
  )

  if (lookupError || !emailLookup) {
    throw new Error('Matric number not recognised. Please check and try again.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailLookup as string,
    password: icNumber,
  })

  if (error) throw error
  return data
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentAppUser() {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data, error } = await supabase
    .from('users')
    .select('id, role, matric_number, name, programme, mentor_id, email, phone, profile_image, address, motto, created_at')
    .eq('id', authUser.id)
    .single()

  if (error) throw error
  return data
}
