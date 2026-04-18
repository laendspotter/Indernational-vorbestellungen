const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const today = new Date().toISOString().split('T')[0];
  const dateStr = new Date(today + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });

  const { data: orders } = await db.from('vorbestellungen')
    .select('*')
    .eq('datum', today)
    .not('user_email', 'is', null)
    .eq('erledigt', false);

  if (!orders || orders.length === 0) return res.status(200).json({ ok: true, sent: 0 });

  let sent = 0;
  for (const o of orders) {
    const menuLabel = o.menu === 'menu1' ? 'Menü 1' : 'Menü 2';
    const drinkInfo = o.getraenk ? ` + ${o.getraenk}` : '';
    const typLabel = o.typ === 'truck' ? '🚚 Food Truck' : '🍽️ Kantine';
    const total = (parseFloat(o.preis || 0) + parseFloat(o.getraenk_preis || 0)).toFixed(2).replace('.', ',');

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0b0e1a;font-family:Arial,sans-serif;color:#f0ede6;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#7a7468;margin-bottom:8px;">INDERNATIONAL</p>
    <h1 style="font-size:1.6rem;font-weight:900;margin:0 0 6px;">Vergiss dein Essen nicht! 🍴</h1>
    <p style="color:#7a7468;font-size:0.9rem;margin-bottom:24px;">Heute ist Abholtag — deine Bestellung wartet auf dich.</p>
    <div style="background:#131726;border:1px solid #1e2236;border-radius:14px;padding:24px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Name</td><td style="padding:6px 0;font-weight:600;text-align:right;">${o.name}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Datum</td><td style="padding:6px 0;font-weight:600;text-align:right;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Bereich</td><td style="padding:6px 0;font-weight:600;text-align:right;">${typLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Bestellung</td><td style="padding:6px 0;font-weight:600;text-align:right;">${menuLabel}${drinkInfo}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Zahlung</td><td style="padding:6px 0;font-weight:600;text-align:right;">${o.zahlung === 'online' && o.bezahlt ? '💳 Bereits bezahlt' : '💵 Bar zahlen bei Abholung'}</td></tr>
        ${parseFloat(o.preis || 0) > 0 ? `<tr><td colspan="2" style="padding-top:10px;border-top:1px solid #1e2236;"></td></tr><tr><td style="padding:6px 0;font-weight:700;">Gesamt</td><td style="padding:6px 0;font-weight:700;color:#f5a623;text-align:right;">${total} €</td></tr>` : ''}
      </table>
    </div>
    <p style="text-align:center;color:#7a7468;font-size:0.75rem;">Indernational · Vielfalt die schmeckt</p>
  </div>
</body></html>`;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Indernational <vorbestellungen@indernational.laendspotter.com>',
          to: [o.user_email],
          subject: `🍴 Nicht vergessen: Deine Bestellung heute bei Indernational`,
          html
        })
      });
      sent++;
    } catch (err) {
      console.error('Reminder error for', o.user_email, err.message);
    }
  }

  res.status(200).json({ ok: true, sent });
};
