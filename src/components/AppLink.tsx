import type { ReactNode } from 'react'
import { navigate } from '../hooks/usePathname'

interface AppLinkProps {
  href: string
  className?: string
  children: ReactNode
}

export function AppLink({ href, className, children }: AppLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}
