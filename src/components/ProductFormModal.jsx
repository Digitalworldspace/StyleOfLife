import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { createProduct, updateProduct } from '../lib/productActions'

const CATEGORIES = ['Saree', 'Ladies Suit']
const STOCK_OPTIONS = ['In Stock', 'Out of Stock', 'Made to Order']

export default function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || CATEGORIES[0],
    description: product?.description || '',
    price: product?.price ?? '',
    moq: product?.moq ?? '',
    unit: product?.unit || 'piece',
    fabric: product?.fabric || '',
    color: product?.color || '',
    stock_status: product?.stock_status || 'In Stock',
  })
  const [existingImages, setExistingImages] = useState(product?.images || [])
  const [imagesToRemove, setImagesToRemove] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function markImageForRemoval(url) {
    setExistingImages((imgs) => imgs.filter((i) => i !== url))
    setImagesToRemove((r) => [...r, url])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Product name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || null,
        price: form.price === '' ? null : Number(form.price),
        moq: form.moq === '' ? null : Number(form.moq),
        unit: form.unit || null,
        fabric: form.fabric || null,
        color: form.color || null,
        stock_status: form.stock_status,
      }
      if (isEdit) {
        await updateProduct(product.id, { ...payload, images: existingImages }, newFiles, imagesToRemove)
      } else {
        await createProduct(payload, newFiles)
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-ivory w-full max-w-lg rounded-sm overflow-hidden max-h-[92vh] flex flex-col">
        <div className="woven-edge-dense w-full" />
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-xl text-ink">
            {isEdit ? 'Edit product' : 'Add product'}
          </h2>
          <button onClick={onClose} className="focus-ring p-1 text-ink/50 hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pb-5 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Product name *"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={form.stock_status}
              onChange={(e) => update('stock_status', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            >
              {STOCK_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (₹)"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              min="0"
              placeholder="MOQ"
              value={form.moq}
              onChange={(e) => update('moq', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="Unit (piece/set)"
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Fabric (e.g. Silk)"
              value={form.fabric}
              onChange={(e) => update('fabric', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="Color"
              value={form.color}
              onChange={(e) => update('color', e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
            />
          </div>

          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm resize-none"
          />

          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingImages.map((url) => (
                <div key={url} className="relative w-16 h-16">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-sm" />
                  <button
                    type="button"
                    onClick={() => markImageForRemoval(url)}
                    className="focus-ring absolute -top-1.5 -right-1.5 bg-wine text-ivory rounded-full p-0.5"
                    aria-label="Remove image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm text-ink/60 block mb-1.5">Add images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewFiles(Array.from(e.target.files))}
              className="focus-ring text-sm w-full"
            />
          </div>

          {error && <p className="text-sm text-wine">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="focus-ring bg-wine text-ivory py-2.5 rounded-sm font-medium hover:bg-wine-dark transition-colors disabled:opacity-60 mt-1"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
          </button>
        </form>
      </div>
    </div>
  )
}
