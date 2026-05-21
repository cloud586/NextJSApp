import Link from 'next/link'

interface PrimaryLinkProps {
  href: string
  label: string
}

export function PrimaryLink({ href, label }: PrimaryLinkProps) {
  return <Link href={href}>{label}</Link>
}
