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
    expect(result.rows[0].errors).toContain('Mentor "Missing" was not found.')
    expect(result.rows[1].errors).toContain('Password is missing or shorter than 8 characters.')
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
