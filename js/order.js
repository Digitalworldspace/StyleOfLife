/* Order request form. Saves the request in the shop's own database (Supabase)
   and then offers PayPal and WhatsApp. No third-party form service is used. */
(function () {
  var f = document.getElementById('order-form');
  if (!f) return;
  var cfg = window.SOL_CONFIG || {};
  var msg = f.querySelector('.of-msg');
  var done = document.getElementById('order-done');
  function val(n) { var e = f.elements[n]; return e ? String(e.value || '').trim() : ''; }
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (val('website')) return; // honeypot
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) { msg.textContent = 'Sorry, ordering is not available right now. Please use WhatsApp.'; return; }
    var row = {
      sku: f.dataset.sku || 'NA', product_name: f.dataset.name || 'NA',
      metal: val('metal') || null, size: val('size') || null,
      customer_name: val('name'), email: val('email'), whatsapp: val('whatsapp') || null,
      country: val('country'), address: val('address') || null, note: val('note') || null
    };
    var btn = f.querySelector('button[type=submit]');
    btn.disabled = true; msg.textContent = 'Sending…';
    fetch(cfg.SUPABASE_URL + '/rest/v1/order_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY, Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    }).then(function (r) {
      if (!r.ok) throw new Error('bad');
      f.hidden = true; done.hidden = false;
      var pp = document.getElementById('order-paypal');
      if (pp && cfg.PAYPAL_URL) { pp.href = cfg.PAYPAL_URL; pp.hidden = false; }
      var wa = document.getElementById('order-wa');
      if (wa) {
        var t = 'Hi, I just sent an order request on your website. Product: ' + row.product_name + ' (' + row.sku + ')' +
          (row.metal ? ', metal: ' + row.metal : '') + (row.size ? ', size: ' + row.size : '') + '. Name: ' + row.customer_name + '.';
        wa.href = wa.dataset.base + '?text=' + encodeURIComponent(t);
      }
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      btn.disabled = false;
      msg.textContent = 'Sorry, we could not send your request. Please try again or use WhatsApp.';
    });
  });
})();
