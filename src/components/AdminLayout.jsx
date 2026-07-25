import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export default function AdminLayout({ children }) {
  const { signOut } = useAuth()

  const tabClass = ({ isActive }) =>
    `focus-ring px-3 py-1.5 rounded-sm text-sm transition-colors ${
      isActive ? 'bg-wine text-ivory' : 'text-ink/70 hover:bg-blush'
    }`

  return (
    <div className="min-h-screen bg-ivory">
      <div className="border-b border-gold-light/40 bg-white/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <span className="font-display text-lg text-wine">Admin Panel</span>
          <div className="flex items-center gap-1">
            <NavLink to="/admin" end className={tabClass}>
              Products
            </NavLink>
            <NavLink to="/admin/inquiries" className={tabClass}>
              Inquiries
            </NavLink>
          </div>
          <button
            onClick={() => signOut()}
            className="focus-ring flex items-center gap-1.5 text-sm text-ink/70 hover:text-wine"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}
