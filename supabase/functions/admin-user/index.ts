import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  job_title?: string | null
  grade?: string | null
  ums_per?: string | null
  study_status_smp?: string | null
  lecture_group?: string | null
  residence_college?: string | null
  room_number?: string | null
  bka_status?: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
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
      const students = await listUserIdsByRole(admin, 'student')
      const result = await deleteAccounts(admin, students ?? [])
      return json({ ok: result.failed.length === 0, ...result })
    }
    if (action === 'delete_all_mentors') {
      if (user?.confirmation !== 'I-hereby-ending-all-mentor-accounts') {
        throw new Error('The exact confirmation phrase is required.')
      }
      const mentors = await listUserIdsByRole(admin, 'lecturer')
      const result = await deleteAccounts(admin, mentors ?? [])
      return json({ ok: result.failed.length === 0, ...result })
    }
    if (!user) throw new Error('User details are required.')
    if (action === 'delete') {
      if (!user?.id) throw new Error('User id is required.')
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (error) throw error
      return json({ ok: true })
    }
    let existingProfile: Record<string, unknown> | null = null
    if (action === 'update') {
      if (!user?.id) throw new Error('User id is required.')
      const { data, error } = await admin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      existingProfile = data
    }
    const effectiveName = user?.name || String(existingProfile?.name ?? '')
    const effectiveRole = (user?.role ?? existingProfile?.role) as UserPayload['role'] | undefined
    const effectiveEmail = user?.email || String(existingProfile?.email ?? '')
    const effectiveMatric = user?.matric_number || String(existingProfile?.matric_number ?? '')

    if (!effectiveName || !effectiveRole) {
      throw new Error('Name and role are required.')
    }
    if (effectiveRole !== 'student' && !effectiveEmail) {
      throw new Error('Email is required for staff accounts.')
    }
    if (effectiveRole !== 'student' && user.mentor_id) throw new Error('Only student accounts can have a mentor.')
    const authEmail = effectiveRole === 'student'
      ? effectiveMatric ? studentAuthEmail(effectiveMatric) : (effectiveEmail || `pending-${crypto.randomUUID()}@student.local`)
      : effectiveEmail
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
      name: effectiveName,
      role: effectiveRole,
      email: effectiveRole === 'student' && effectiveMatric ? effectiveMatric : effectiveEmail,
      matric_number: user.matric_number ?? existingProfile?.matric_number,
      programme: user.programme ?? existingProfile?.programme,
      phone: user.phone ?? existingProfile?.phone,
      mentor_id: user.mentor_id ?? existingProfile?.mentor_id,
      ic_number: user.ic_number ?? existingProfile?.ic_number,
      gender: user.gender ?? existingProfile?.gender,
      religion: user.religion ?? existingProfile?.religion,
      race: user.race ?? existingProfile?.race,
      address: user.address ?? existingProfile?.address,
      postcode: user.postcode ?? existingProfile?.postcode,
      city: user.city ?? existingProfile?.city,
      state: user.state ?? existingProfile?.state,
      study_status: user.study_status ?? existingProfile?.study_status,
      channel: user.channel ?? existingProfile?.channel,
      motto: user.motto ?? existingProfile?.motto,
      job_title: user.job_title ?? existingProfile?.job_title,
      grade: user.grade ?? existingProfile?.grade,
      ums_per: user.ums_per ?? existingProfile?.ums_per,
      study_status_smp: user.study_status_smp ?? existingProfile?.study_status_smp,
      lecture_group: user.lecture_group ?? existingProfile?.lecture_group,
      residence_college: user.residence_college ?? existingProfile?.residence_college,
      room_number: user.room_number ?? existingProfile?.room_number,
      bka_status: user.bka_status ?? existingProfile?.bka_status,
    }
    if (action === 'update') {
      profilePayload = {
        ...existingProfile,
        ...Object.fromEntries(
          Object.entries(profilePayload).filter(([key, value]) => key === 'id' || value !== undefined),
        ),
      }
    }
    let profileResult = await admin.from('users').upsert(profilePayload).select('*').single()
    if (profileResult.error && isMissingStudentImportFields(profileResult.error)) {
      const legacyPayload = Object.fromEntries(
        Object.entries(profilePayload).filter(([key]) => !OPTIONAL_PROFILE_FIELDS.has(key)),
      )
      profileResult = await admin.from('users').upsert(legacyPayload).select('*').single()
    }
    if (profileResult.error) {
      if (action === 'create' && id) await admin.auth.admin.deleteUser(id)
      throw profileResult.error
    }
    const profile = profileResult.data
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

const OPTIONAL_PROFILE_FIELDS = new Set([
  'ic_number',
  'gender',
  'religion',
  'race',
  'phone',
  'address',
  'postcode',
  'city',
  'state',
  'study_status',
  'channel',
  'motto',
  'job_title',
  'grade',
  'ums_per',
  'study_status_smp',
  'lecture_group',
  'residence_college',
  'room_number',
  'bka_status',
])

function isMissingStudentImportFields(error: { code?: string; message?: string }) {
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return Boolean(error.message?.match(/ic_number|gender|religion|race|phone|address|postcode|city|state|study_status|channel|motto|job_title|grade|ums_per|lecture_group|residence_college|room_number|bka_status/i))
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

async function listUserIdsByRole(
  admin: ReturnType<typeof createClient>,
  role: 'student' | 'lecturer',
) {
  const pageSize = 1000
  const accounts: Array<{ id: string }> = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from('users')
      .select('id')
      .eq('role', role)
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    const page = data ?? []
    accounts.push(...page)
    if (page.length < pageSize) return accounts
  }
}
