import { useState } from 'react'
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import ProductFormModal from '../../components/ProductFormModal'
import { useProducts } from '../../lib/useProducts'
import { deleteProduct } from '../../lib/productActions'

export default function AdminDashboard() {
  const { products, loading, refetch } = useProducts()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  function openAdd() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This also removes its images from storage.`)) return
    setDeletingId(product.id)
    try {
      await deleteProduct(product)
    } catch (err) {
      alert(err.message || 'Failed to delete product.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl text-ink">Products ({products.length})</h1>
        <button
          onClick={openAdd}
          className="focus-ring flex items-center gap-1.5 bg-wine text-ivory px-4 py-2 rounded-sm text-sm font-medium hover:bg-wine-dark transition-colors"
        >
          <Plus size={16} />
          Add product
        </button>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gold-light rounded-sm">
          <p className="text-ink/50">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white/70 border border-gold-light/40 rounded-sm overflow-hidden flex gap-3 p-3"
            >
              <div className="w-20 h-20 shrink-0 bg-blush rounded-sm overflow-hidden flex items-center justify-center">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={20} className="text-wine/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-gold">{product.category}</p>
                <h3 className="font-display text-base text-ink truncate">{product.name}</h3>
                <p className="text-sm text-ink/60">
                  {product.price != null ? `₹${product.price}` : '—'} · {product.stock_status}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => openEdit(product)}
                    className="focus-ring flex items-center gap-1 text-xs text-ink/70 hover:text-wine border border-gold-light/60 rounded-sm px-2 py-1"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                    className="focus-ring flex items-center gap-1 text-xs text-wine hover:text-wine-dark border border-wine/30 rounded-sm px-2 py-1 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> {deletingId === product.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            refetch()
          }}
        />
      )}
    </AdminLayout>
  )
}
