import { supabase } from './supabaseClient'

/**
 * Submits an inquiry with one or more product line items.
 * items: [{ product_id, product_name, quantity }]
 */
export async function submitInquiry({ customerName, phone, email, message, items, userId }) {
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert([
      {
        customer_name: customerName,
        phone,
        email: email || null,
        message: message || null,
        user_id: userId || null,
      },
    ])
    .select()
    .single()

  if (inquiryError) throw inquiryError

  if (items && items.length > 0) {
    const rows = items.map((item) => ({
      inquiry_id: inquiry.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity || 1,
    }))
    const { error: itemsError } = await supabase.from('inquiry_items').insert(rows)
    if (itemsError) throw itemsError
  }

  return inquiry
}
