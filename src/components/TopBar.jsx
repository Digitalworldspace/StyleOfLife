import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = ['All', 'Saree', 'Ladies Suit']

export default function TopBar({ activeCategory, onCategoryChange }) {
  const { user, signOut } = useAuth()

  return (
    <div className="sticky top-0 z-30 bg-ivory/90 backdrop-blur-sm border-b border-gold-light/40">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <Link to="/" className="font-display text-lg text-wine shrink-0">
          Vastra Wholesale
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`focus-ring px-3 py-1.5 rounded-sm text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-wine text-ivory'
                  : 'text-ink/70 hover:bg-blush'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {user ? (
          <button
            onClick={() => signOut()}
            className="focus-ring flex items-center gap-1.5 text-sm text-ink/70 hover:text-wine shrink-0"
          >
            <User size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="focus-ring flex items-center gap-1.5 text-sm text-ink/70 hover:text-wine shrink-0"
          >
            <User size={16} />
            <span className="hidden sm:inline">Login</span>
          </Link>
        )}
      </div>
    </div>
  )
}
