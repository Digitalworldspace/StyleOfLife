const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || ''

/**
 * Builds a wa.me deep link that opens WhatsApp with a pre-filled message
 * listing the selected products. No backend / edge function needed —
 * WhatsApp Click-to-Chat just opens the visitor's own WhatsApp app.
 */
export function buildWhatsAppLink(products, customerNote = '') {
  const lines = []
  lines.push('Hello, I would like a wholesale quote for:')
  lines.push('')
  products.forEach((p, i) => {
    const qty = p.quantity ? ` x ${p.quantity}` : ''
    lines.push(`${i + 1}. ${p.name}${qty}${p.code ? ` (Code: ${p.code})` : ''}`)
  })
  if (customerNote) {
    lines.push('')
    lines.push(`Note: ${customerNote}`)
  }
  const text = encodeURIComponent(lines.join('\n'))
  const number = WHATSAPP_NUMBER.replace(/[^0-9]/g, '')
  return `https://wa.me/${number}?text=${text}`
}

export function buildSingleProductWhatsAppLink(product) {
  return buildWhatsAppLink([product])
}
