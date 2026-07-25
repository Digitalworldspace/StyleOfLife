import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { submitInquiry } from '../lib/inquiryActions'
import { useAuth } from '../contexts/AuthContext'

export default function InquiryModal({ products, onClose }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitInquiry({
        customerName: name,
        phone,
        email,
        message,
        userId: user?.id,
        items: products.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
        })),
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-ivory w-full sm:max-w-md sm:rounded-sm rounded-t-2xl overflow-hidden animate-fade-up max-h-[90vh] flex flex-col">
        <div className="woven-edge-dense w-full" />
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-xl text-ink">
            {done ? 'Inquiry sent' : 'Send inquiry'}
          </h2>
          <button
            onClick={onClose}
            className="focus-ring p-1 text-ink/50 hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle2 className="text-sage" size={44} />
              <p className="text-ink/80">
                Thank you, {name}. Our team will reach out to you on {phone} shortly with wholesale pricing.
              </p>
              <button
                onClick={onClose}
                className="focus-ring mt-2 px-5 py-2 bg-wine text-ivory rounded-sm hover:bg-wine-dark transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 bg-blush/60 rounded-sm p-3">
                <p className="text-xs uppercase tracking-wide text-gold font-medium mb-1.5">
                  {products.length} item{products.length > 1 ? 's' : ''} selected
                </p>
                <ul className="text-sm text-ink/80 space-y-0.5 max-h-24 overflow-y-auto">
                  {products.map((p) => (
                    <li key={p.id}>· {p.name}</li>
                  ))}
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone / WhatsApp number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
                  required
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
                />
                <textarea
                  placeholder="Quantity needed, sizes, colors, etc. (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm resize-none"
                />

                {error && <p className="text-sm text-wine">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="focus-ring bg-wine text-ivory py-2.5 rounded-sm font-medium hover:bg-wine-dark transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send inquiry'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
