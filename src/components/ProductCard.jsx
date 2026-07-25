import { MessageCircle, Send, ImageOff } from 'lucide-react'
import { buildSingleProductWhatsAppLink } from '../lib/whatsapp'

export default function ProductCard({ product, selected, onToggleSelect, onInquire }) {
  const cover = product.images && product.images.length > 0 ? product.images[0] : null

  return (
    <div className="group relative flex flex-col bg-white/70 border border-gold-light/40 rounded-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-up">
      <div className="woven-edge w-full" />

      <label className="absolute top-3 left-3 z-10 flex items-center justify-center w-6 h-6 bg-white/90 rounded-sm border border-gold-light cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product)}
          className="w-4 h-4 accent-wine cursor-pointer"
          aria-label={`Select ${product.name} for bulk inquiry`}
        />
      </label>

      <div className="aspect-[3/4] bg-blush overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-wine/30">
            <ImageOff size={40} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <span className="text-[11px] uppercase tracking-wider text-gold font-medium">
          {product.category}
        </span>
        <h3 className="font-display text-lg text-ink leading-snug">{product.name}</h3>

        {(product.fabric || product.color) && (
          <p className="text-xs text-ink/60">
            {[product.fabric, product.color].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="flex items-baseline gap-2 mt-1">
          {product.price != null && (
            <span className="font-display text-xl text-wine">₹{product.price}</span>
          )}
          {product.unit && <span className="text-xs text-ink/50">/ {product.unit}</span>}
        </div>

        {product.moq != null && (
          <p className="text-xs text-ink/50">MOQ: {product.moq} pcs</p>
        )}

        {product.stock_status && (
          <span
            className={`text-[11px] w-fit px-2 py-0.5 rounded-sm mt-1 ${
              product.stock_status === 'In Stock'
                ? 'bg-sage/15 text-sage'
                : 'bg-wine/10 text-wine'
            }`}
          >
            {product.stock_status}
          </span>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gold-light/30">
          <button
            onClick={() => onInquire(product)}
            className="focus-ring flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-wine text-ivory py-2 rounded-sm hover:bg-wine-dark transition-colors"
          >
            <Send size={14} />
            Inquire
          </button>
          <a
            href={buildSingleProductWhatsAppLink(product)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center justify-center w-9 h-9 rounded-sm border border-sage/40 text-sage hover:bg-sage/10 transition-colors"
            aria-label={`Ask about ${product.name} on WhatsApp`}
          >
            <MessageCircle size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
