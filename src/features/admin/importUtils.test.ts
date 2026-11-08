import { describe, expect, it, vi } from 'vitest'
import {
  IMPORT_WORKER_COUNT,
  runWithConcurrency,
  validateImportRows,
  withRetry,
} from './importUtils'

describe('import validation', () => {
  it('reports duplicates, missing credentials, and unknown mentors before import', () => {
    const result = validateImportRows(
      [
        { Name: 'A', Matric: 'S-1', Mentor: 'Missing', Password: 'password1' },
        { Name: 'B', Matric: 'S-1', Mentor: 'Mentor', Password: '' },
      ],
      'student',
      { name: 'Name', matric_number: 'Matric', mentor: 'Mentor' },
      '',
      'column',
      'Password',
      [],
      [{ id: 'm1', role: 'lecturer', name: 'Mentor', email: 'mentor@example.com', matric_number: null }],
    )

    expect(result.summary.invalid).toBe(2)
    expect(result.rows[0].errors).toContain('Duplicate matric number in this sheet.')
    expect(result.rows[0].warnings).toContain('Mentor "Missing" was not found; imported without mentor assignment.')
    expect(result.rows[1].errors).toContain('Password is missing or shorter than 8 characters.')
  })

  it('keeps missing optional student details as warnings instead of blocking the row', () => {
    const result = validateImportRows(
      [{ Name: 'A', Matric: 'S-1', Password: 'password1' }],
      'student',
      { name: 'Name', matric_number: 'Matric' },
      '',
      'column',
      'Password',
      [],
      [],
    )

    expect(result.summary.valid).toBe(1)
    expect(result.summary.invalid).toBe(0)
    expect(result.summary.warnings).toBe(2)
    expect(result.rows[0].errors).toEqual([])
    expect(result.rows[0].warnings).toEqual(['IC number is missing.', 'Phone number is missing.'])
  })

  it('imports students when the mentor is unavailable and reports a warning', () => {
    const result = validateImportRows(
      [{ Name: 'A', Matric: 'S-2', Mentor: 'Unavailable', Password: 'password1' }],
      'student',
      { name: 'Name', matric_number: 'Matric', mentor: 'Mentor' },
      '',
      'column',
      'Password',
      [],
      [],
    )

    expect(result.summary.valid).toBe(1)
    expect(result.summary.invalid).toBe(0)
    expect(result.rows[0].mentorId).toBeNull()
    expect(result.rows[0].warnings).toContain('Mentor "Unavailable" was not found; imported without mentor assignment.')
  })

  it('validates administrator imports using staff email fields', () => {
    const result = validateImportRows(
      [{ Name: 'Admin', Email: 'admin@example.com', Password: 'password1' }],
      'admin',
      { name: 'Name', email: 'Email' },
      '',
      'column',
      'Password',
      [],
      [],
    )

    expect(result.summary.valid).toBe(1)
    expect(result.rows[0].identifier).toBe('admin@example.com')
  })
})

describe('import concurrency', () => {
  it('never exceeds the configured worker count', async () => {
    let active = 0
    let maximum = 0
    await runWithConcurrency(Array.from({ length: 20 }, (_, index) => index), IMPORT_WORKER_COUNT, async () => {
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
    })
    expect(maximum).toBe(IMPORT_WORKER_COUNT)
  })
})

describe('import retry', () => {
  it('rechecks before retrying retryable failures and stops on a recovered account', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { context: { status: 503 } }))
    const recheck = vi.fn().mockResolvedValue({ id: 'existing' })
    const result = await withRetry(operation, recheck, (error) => (error as { context: { status: number } }).context.status, async () => undefined)

    expect(result).toEqual({ id: 'existing' })
    expect(operation).toHaveBeenCalledTimes(1)
    expect(recheck).toHaveBeenCalledTimes(1)
  })
})
