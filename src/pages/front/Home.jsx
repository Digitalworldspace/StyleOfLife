import { useState, useMemo } from 'react'
import { useProducts } from '../../lib/useProducts'
import ProductCard from '../../components/ProductCard'
import BulkBar from '../../components/BulkBar'
import InquiryModal from '../../components/InquiryModal'
import TopBar from '../../components/TopBar'

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All')
  const { products, loading } = useProducts({
    category: activeCategory === 'All' ? undefined : activeCategory,
  })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [inquiryProducts, setInquiryProducts] = useState(null)

  const selected = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  )

  function toggleSelect(product) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.add(product.id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-ivory">
      <TopBar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4.6] bg-blush/50 rounded-sm animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-ink/60">No products yet</p>
            <p className="text-sm text-ink/40 mt-2">Check back soon — new stock is added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onToggleSelect={toggleSelect}
                onInquire={(p) => setInquiryProducts([p])}
              />
            ))}
          </div>
        )}
      </main>

      <BulkBar
        selected={selected}
        onClear={() => setSelectedIds(new Set())}
        onInquire={() => setInquiryProducts(selected)}
      />

      {inquiryProducts && (
        <InquiryModal products={inquiryProducts} onClose={() => setInquiryProducts(null)} />
      )}
    </div>
  )
}
