import { describe, expect, it } from 'vitest'
import { sum } from '@/utils/sum'

describe('sum util', () => {
  it('adds numbers correctly', () => {
    expect(sum([1, 2, 3, 4])).toBe(10)
  })
})
