import Link from 'next/link'
import Image from 'next/image'
import { UserMenu } from '@/components/user-menu'
import { ArrowLeft, Home } from 'lucide-react'
import { theme } from '@/lib/theme'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  showHome?: boolean
  children?: React.ReactNode
  className?: string
}

export function AppHeader({
  title,
  showBack = false,
  backHref = '/',
  showHome = false,
  children,
  className = '',
}: AppHeaderProps) {
  return (
    <header className={`sticky top-0 z-30 ${theme.backgrounds.header} shadow-2xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 p-3 md:p-5 relative">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {showBack && (
            <Link
              href={backHref}
              className={theme.buttons.icon}
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
            </Link>
          )}

          {showHome && !showBack && (
            <Link
              href="/"
              className={theme.buttons.icon}
            >
              <Home className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
            </Link>
          )}

          <Link href="/" className="relative w-32 h-8 md:w-48 md:h-12 hover:opacity-80 transition-opacity">
            <Image
              src="/livewatch-logo.png"
              alt="LiveWatch"
              fill
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center Section - Title */}
        {title && (
          <h1 className="hidden md:block text-lg md:text-xl font-bold text-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {title}
          </h1>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {children}
          <UserMenu />
        </div>
      </div>

      {/* Mobile Title */}
      {title && (
        <div className="md:hidden text-center pb-3 px-3">
          <h1 className="text-sm font-bold text-foreground">{title}</h1>
        </div>
      )}
    </header>
  )
}
