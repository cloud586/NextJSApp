import React, { forwardRef } from 'react'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

const NextLink = ({ href, children, ...props }: { href?: string; children: React.ReactNode }) => (
  <a href={typeof href === 'string' ? href : href?.toString()} {...props}>
    {children}
  </a>
)

const NextImage = forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement> & { src: string | { src: string } }>(
  ({ src, alt, ...props }, ref) => {
    const resolvedSrc = typeof src === 'string' ? src : src?.src ?? ''
    return <img ref={ref} src={resolvedSrc} alt={alt ?? ''} {...props} />
  },
)
NextImage.displayName = 'Image'

vi.mock('next/link', () => ({ default: NextLink, __esModule: true }))
vi.mock('next/image', () => ({ default: NextImage, __esModule: true }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  useSegments: () => [],
}))
