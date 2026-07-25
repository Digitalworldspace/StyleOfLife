import { MessageCircle, Send, X } from 'lucide-react'
import { buildWhatsAppLink } from '../lib/whatsapp'

export default function BulkBar({ selected, onClear, onInquire }) {
  if (selected.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl animate-fade-up">
      <div className="bg-ink text-ivory rounded-sm shadow-2xl flex items-center gap-3 px-4 py-3">
        <button
          onClick={onClear}
          className="focus-ring p-1 text-ivory/60 hover:text-ivory shrink-0"
          aria-label="Clear selection"
        >
          <X size={18} />
        </button>
        <span className="text-sm font-medium flex-1">
          {selected.length} item{selected.length > 1 ? 's' : ''} selected
        </span>
        <a
          href={buildWhatsAppLink(selected)}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex items-center gap-1.5 text-sm font-medium bg-sage text-ivory px-3 py-2 rounded-sm hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={15} />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <button
          onClick={onInquire}
          className="focus-ring flex items-center gap-1.5 text-sm font-medium bg-gold text-ivory px-3 py-2 rounded-sm hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
          <span className="hidden sm:inline">Inquire</span>
        </button>
      </div>
    </div>
  )
}
