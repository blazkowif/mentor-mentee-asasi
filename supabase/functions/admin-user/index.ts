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
      action: 'create' | 'update' | 'delete' | 'delete_all_students'
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
      let deleted = 0
      for (const student of students ?? []) {
        const result = await admin.auth.admin.deleteUser(student.id)
        if (result.error) throw result.error
        deleted += 1
      }
      return json({ ok: true, deleted })
    }
    if (action === 'delete') {
      if (!user?.id) throw new Error('User id is required.')
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) throw error
      return json({ ok: true })
    }
    if (!user?.name || !user.email || !user.role) throw new Error('Name, role, and email are required.')
    if (user.role !== 'student' && user.mentor_id) throw new Error('Only student accounts can have a mentor.')
    let id = user.id
    if (action === 'create') {
      if (!user.password || user.password.length < 8) throw new Error('Password must contain at least 8 characters.')
      const result = await admin.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true })
      if (result.error) throw result.error
      id = result.data.user.id
    } else if (!id) {
      throw new Error('User id is required.')
    } else if (user.password) {
      const result = await admin.auth.admin.updateUserById(id, { password: user.password, email: user.email })
      if (result.error) throw result.error
    } else {
      const result = await admin.auth.admin.updateUserById(id, { email: user.email })
      if (result.error) throw result.error
    }
    const { data: profile, error: profileError } = await admin.from('users').upsert({
      id,
      name: user.name,
      role: user.role,
      email: user.email,
      matric_number: user.matric_number ?? null,
      programme: user.programme ?? null,
      phone: user.phone ?? null,
      mentor_id: user.mentor_id ?? null,
      ic_number: user.ic_number ?? null,
      gender: user.gender ?? null,
      religion: user.religion ?? null,
      race: user.race ?? null,
      address: user.address ?? null,
      postcode: user.postcode ?? null,
      city: user.city ?? null,
      state: user.state ?? null,
      study_status: user.study_status ?? null,
      channel: user.channel ?? null,
    }).select('id, role, matric_number, name, gender, religion, race, programme, mentor_id, email, phone, profile_image, address, postcode, city, state, study_status, channel, motto, created_at').single()
    if (profileError) throw profileError
    return json({ user: profile })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Account operation failed.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
