import { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { Phone, Mail } from 'lucide-react'

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([])
  const [itemsByInquiry, setItemsByInquiry] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: inquiryRows } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    const { data: itemRows } = await supabase.from('inquiry_items').select('*')

    const grouped = {}
    ;(itemRows || []).forEach((item) => {
      if (!grouped[item.inquiry_id]) grouped[item.inquiry_id] = []
      grouped[item.inquiry_id].push(item)
    })

    setInquiries(inquiryRows || [])
    setItemsByInquiry(grouped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('inquiries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiry_items' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAll])

  async function updateStatus(id, status) {
    await supabase.from('inquiries').update({ status }).eq('id', id)
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-ink mb-5">Inquiries ({inquiries.length})</h1>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gold-light rounded-sm">
          <p className="text-ink/50">No inquiries yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {inquiries.map((inq) => (
            <div key={inq.id} className="bg-white/70 border border-gold-light/40 rounded-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-display text-lg text-ink">{inq.customer_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-ink/60 mt-1">
                    <a href={`tel:${inq.phone}`} className="flex items-center gap-1 hover:text-wine">
                      <Phone size={13} /> {inq.phone}
                    </a>
                    {inq.email && (
                      <a href={`mailto:${inq.email}`} className="flex items-center gap-1 hover:text-wine">
                        <Mail size={13} /> {inq.email}
                      </a>
                    )}
                  </div>
                </div>
                <select
                  value={inq.status}
                  onChange={(e) => updateStatus(inq.id, e.target.value)}
                  className="focus-ring border border-gold-light/60 bg-white rounded-sm px-2 py-1 text-xs"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {itemsByInquiry[inq.id]?.length > 0 && (
                <ul className="text-sm text-ink/70 mt-2 list-disc list-inside">
                  {itemsByInquiry[inq.id].map((item) => (
                    <li key={item.id}>
                      {item.product_name} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              {inq.message && <p className="text-sm text-ink/60 mt-2 italic">"{inq.message}"</p>}

              <p className="text-xs text-ink/40 mt-2">
                {new Date(inq.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
