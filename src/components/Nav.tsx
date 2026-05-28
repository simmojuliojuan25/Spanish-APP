'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/vocabulary', label: 'Words', icon: '📚' },
  { href: '/flashcards', label: 'Flash Cards', icon: '🃏' },
  { href: '/quiz', label: 'Quiz', icon: '✏️' },
  { href: '/stories', label: 'Stories', icon: '📖' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 min-h-screen bg-emerald-900 text-white p-4 gap-1 fixed left-0 top-0">
        <div className="text-xl font-bold mb-6 px-2">🇪🇸 Español</div>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(l.href)
                ? 'bg-emerald-700'
                : 'hover:bg-emerald-800'
            }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 text-emerald-300"
        >
          <span>🚪</span> Log out
        </button>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-emerald-900 text-white flex justify-around items-center h-16 z-50">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 text-xs px-2 py-1 rounded ${
              pathname.startsWith(l.href) ? 'text-white' : 'text-emerald-400'
            }`}
          >
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
