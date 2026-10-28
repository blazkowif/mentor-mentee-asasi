import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type UserPayload = {
  id?: string
  name?: string
  role?: 'student' | 'lecturer' | 'admin'
  email?: string
  password?: string
  matric_number?: string | null
  programme?: string | null
  phone?: string | null
  mentor_id?: string | null
  ic_number?: string | null
  gender?: string | null
  religion?: string | null
  race?: string | null
  address?: string | null
  postcode?: string | null
  city?: string | null
  state?: string | null
  study_status?: string | null
  channel?: string | null
  motto?: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization.')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: callerRole, error: roleError } = await caller.rpc('current_user_role')
    if (roleError || callerRole !== 'admin') throw new Error('Only administrators may manage accounts.')

    const { action, user } = await request.json() as {
      action: 'create' | 'update' | 'delete' | 'delete_all_students' | 'delete_all_mentors'
      user?: UserPayload & { confirmation?: string }
    }
    if (action === 'delete_all_students') {
      if (user?.confirmation !== 'I-hereby-ending-this-session') {
        throw new Error('The exact confirmation phrase is required.')
      }
      const { data: students, error: studentsError } = await admin
        .from('users')
        .select('id')
        .eq('role', 'student')
      if (studentsError) throw studentsError
      const result = await deleteAccounts(admin, students ?? [])
      return json({ ok: result.failed.length === 0, ...result })
    }
    if (action === 'delete_all_mentors') {
      if (user?.confirmation !== 'I-hereby-ending-all-mentor-accounts') {
        throw new Error('The exact confirmation phrase is required.')
      }
      const { data: mentors, error: mentorsError } = await admin
        .from('users')
        .select('id')
        .eq('role', 'lecturer')
      if (mentorsError) throw mentorsError
      const result = await deleteAccounts(admin, mentors ?? [])
      return json({ ok: result.failed.length === 0, ...result })
    }
    if (action === 'delete') {
      if (!user?.id) throw new Error('User id is required.')
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) throw error
      return json({ ok: true })
    }
    if (!user?.name || !user.role) {
      throw new Error('Name and role are required.')
    }
    if (user.role === 'student' && !user.matric_number) {
      throw new Error('Student matric number is required.')
    }
    if (user.role !== 'student' && !user.email) {
      throw new Error('Email is required for staff accounts.')
    }
    if (user.role !== 'student' && user.mentor_id) throw new Error('Only student accounts can have a mentor.')
    const authEmail = user.role === 'student' && user.matric_number
      ? studentAuthEmail(user.matric_number)
      : user.email!
    let id = user.id
    if (action === 'create') {
      if (!user.password || user.password.length < 8) throw new Error('Password must contain at least 8 characters.')
      const result = await admin.auth.admin.createUser({ email: authEmail, password: user.password, email_confirm: true })
      if (result.error) throw result.error
      id = result.data.user.id
    } else if (!id) {
      throw new Error('User id is required.')
    } else if (user.password) {
      const result = await admin.auth.admin.updateUserById(id, { password: user.password, email: authEmail })
      if (result.error) throw result.error
    } else {
      const result = await admin.auth.admin.updateUserById(id, { email: authEmail })
      if (result.error) throw result.error
    }
    let profilePayload: Record<string, unknown> = {
      id,
      name: user.name,
      role: user.role,
      email: user.role === 'student' && user.matric_number ? user.matric_number : user.email,
      matric_number: user.matric_number,
      programme: user.programme,
      phone: user.phone,
      mentor_id: user.mentor_id,
      ic_number: user.ic_number,
      gender: user.gender,
      religion: user.religion,
      race: user.race,
      address: user.address,
      postcode: user.postcode,
      city: user.city,
      state: user.state,
      study_status: user.study_status,
      channel: user.channel,
      motto: user.motto,
    }
    if (action === 'update') {
      const { data: existingProfile, error: existingProfileError } = await admin
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      if (existingProfileError) throw existingProfileError
      profilePayload = {
        ...existingProfile,
        ...Object.fromEntries(
          Object.entries(profilePayload).filter(([key, value]) => key === 'id' || value !== undefined),
        ),
      }
    }
    const { data: profile, error: profileError } = await admin.from('users').upsert(profilePayload)
      .select('id, role, matric_number, name, gender, religion, race, programme, mentor_id, email, phone, profile_image, address, postcode, city, state, study_status, channel, motto, created_at').single()
    if (profileError) throw profileError
    return json({ user: profile })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Account operation failed.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function studentAuthEmail(matricNumber: string) {
  const normalized = matricNumber.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${normalized}@student.local`
}

async function deleteAccounts(
  admin: ReturnType<typeof createClient>,
  accounts: Array<{ id: string }>,
) {
  let deleted = 0
  const failed: Array<{ id: string; error: string }> = []
  for (const account of accounts) {
    const result = await admin.auth.admin.deleteUser(account.id)
    if (result.error) {
      failed.push({ id: account.id, error: result.error.message })
      continue
    }
    deleted += 1
  }
  return { deleted, failed }
}
