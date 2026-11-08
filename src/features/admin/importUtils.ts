import { studentAuthEmail } from '@/services/authService'

export const IMPORT_WORKER_COUNT = 6
export const IMPORT_MAX_RETRIES = 3

export type ImportRole = 'student' | 'lecturer' | 'admin'
export type ImportLookupUser = {
  id: string
  role: ImportRole
  name: string
  email: string | null
  matric_number: string | null
}
export type ImportValidationRow = {
  sourceIndex: number
  rowNumber: number
  name: string
  identifier: string
  matricNumber: string
  email: string
  password: string
  mentorValue: string
  existingUser: ImportLookupUser | null
  mentorId: string | null
  errors: string[]
  warnings: string[]
}
export type ImportValidationSummary = {
  valid: number
  willCreate: number
  willUpdate: number
  invalid: number
  warnings: number
}

export function normalizeLookup(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeMatricNumber(value: string) {
  const email = studentAuthEmail(value)
  return email.slice(0, -'@student.local'.length)
}

export function buildLookupMaps(users: ImportLookupUser[]) {
  const byMatric = new Map<string, ImportLookupUser>()
  const byEmail = new Map<string, ImportLookupUser>()
  const byName = new Map<string, ImportLookupUser>()
  for (const user of users) {
    if (user.matric_number) byMatric.set(normalizeMatricNumber(user.matric_number), user)
    if (user.email) byEmail.set(normalizeLookup(user.email), user)
    if (user.name) byName.set(normalizeLookup(user.name), user)
    byName.set(normalizeLookup(user.id), user)
  }
  return { byMatric, byEmail, byName }
}

export function validateImportRows(
  rows: Record<string, string>[],
  role: ImportRole,
  mapping: Partial<Record<string, string>>,
  defaultPassword: string,
  passwordMode: 'manual' | 'column',
  passwordColumn: string,
  users: ImportLookupUser[],
  mentors: ImportLookupUser[],
) {
  const userMaps = buildLookupMaps(users)
  const mentorMaps = buildLookupMaps(mentors)
  const matricCounts = new Map<string, number>()
  const emailCounts = new Map<string, number>()
  const prepared = rows.map((row, sourceIndex) => {
    const name = mapping.name ? row[mapping.name]?.trim() ?? '' : ''
    const matricNumber = mapping.matric_number ? row[mapping.matric_number]?.trim() ?? '' : ''
    const email = mapping.email ? row[mapping.email]?.trim() ?? '' : ''
    const password = passwordMode === 'column'
      ? (passwordColumn ? row[passwordColumn]?.trim() || defaultPassword.trim() : defaultPassword.trim())
      : defaultPassword.trim()
    const mentorValue = mapping.mentor ? row[mapping.mentor]?.trim() ?? '' : ''
    const normalizedMatric = matricNumber ? normalizeMatricNumber(matricNumber) : ''
    const normalizedEmail = normalizeLookup(email)
    if (normalizedMatric) matricCounts.set(normalizedMatric, (matricCounts.get(normalizedMatric) ?? 0) + 1)
    if (normalizedEmail) emailCounts.set(normalizedEmail, (emailCounts.get(normalizedEmail) ?? 0) + 1)
    const errors: string[] = []
    const warnings: string[] = []
    if (!name) errors.push('Nama is missing.')
    if (role === 'student') {
      if (!matricNumber) errors.push('NoMatrik is missing.')
      else if (!normalizedMatric) errors.push('NoMatrik is invalid.')
    } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(email ? 'Email is invalid.' : 'Email is missing.')
    }
    if (!password || password.length < 8) errors.push('Password is missing or shorter than 8 characters.')
    const existingUser = role === 'student'
      ? userMaps.byMatric.get(normalizedMatric) ?? null
      : userMaps.byEmail.get(normalizedEmail) ?? null
    const mentor = mentorValue
      ? mentorMaps.byName.get(normalizeLookup(mentorValue))
        ?? mentorMaps.byEmail.get(normalizeLookup(mentorValue))
        ?? mentorMaps.byMatric.get(normalizeMatricNumber(mentorValue))
        ?? null
      : null
    if (role === 'student' && mentorValue && !mentor) warnings.push(`Mentor "${mentorValue}" was not found; imported without mentor assignment.`)
    if (role === 'student') {
      if (!mapping.ic_number || !row[mapping.ic_number]?.trim()) warnings.push('IC number is missing.')
      if (!mapping.phone || !row[mapping.phone]?.trim()) warnings.push('Phone number is missing.')
    }
    return {
      sourceIndex,
      rowNumber: sourceIndex + 2,
      name,
      identifier: role === 'student' ? matricNumber : email,
      matricNumber,
      email,
      password,
      mentorValue,
      existingUser,
      mentorId: mentor?.id ?? null,
      errors,
      warnings,
    }
  })
  for (const row of prepared) {
    if (row.matricNumber && (matricCounts.get(normalizeMatricNumber(row.matricNumber)) ?? 0) > 1) {
      row.errors.push('Duplicate matric number in this sheet.')
    }
    if (row.email && (emailCounts.get(normalizeLookup(row.email)) ?? 0) > 1) {
      row.errors.push('Duplicate email in this sheet.')
    }
  }
  const summary = prepared.reduce<ImportValidationSummary>((result, row) => {
    if (row.errors.length) result.invalid += 1
    else if (row.existingUser) result.willUpdate += 1
    else result.willCreate += 1
    if (!row.errors.length) result.valid += 1
    if (!row.errors.length) result.warnings += row.warnings.length
    return result
  }, { valid: 0, willCreate: 0, willUpdate: 0, invalid: 0, warnings: 0 })
  return { rows: prepared, summary }
}

export async function runWithConcurrency<T>(
  items: T[],
  workerCount: number,
  worker: (item: T) => Promise<void>,
  shouldStop: () => boolean = () => false,
) {
  let nextIndex = 0
  const runWorker = async () => {
    while (!shouldStop()) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, runWorker))
}

export function retryDelay(attempt: number, random = Math.random()) {
  return 250 * (2 ** attempt) + Math.floor(random * 150)
}

export function isRetryableStatus(status: number | undefined) {
  return status === 429 || (status !== undefined && status >= 500 && status <= 599)
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  recheck: () => Promise<T | null>,
  getStatus: (error: unknown) => number | undefined,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableStatus(getStatus(error)) || attempt >= IMPORT_MAX_RETRIES) throw error
      const recovered = await recheck()
      if (recovered) return recovered
      await sleep(retryDelay(attempt))
    }
  }
}
