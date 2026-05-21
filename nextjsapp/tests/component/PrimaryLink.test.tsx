import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrimaryLink } from '@/components/PrimaryLink'

describe('PrimaryLink', () => {
  it('renders a client-friendly next/link anchor', () => {
    render(<PrimaryLink href="/about" label="About us" />)

    const link = screen.getByRole('link', { name: /about us/i })
    expect(link).toHaveAttribute('href', '/about')
  })
})
