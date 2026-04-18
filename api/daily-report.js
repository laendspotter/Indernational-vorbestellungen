const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email, date: dateParam } = req.body || {};
  const reportEmail = email || process.env.REPORT_EMAIL;
  if (!reportEmail) return res.status(400).json({ error: 'Keine E-Mail konfiguriert. REPORT_EMAIL env variable setzen.' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const today = dateParam || new Date().toISOString().split('T')[0];
  const dateStr = new Date(today + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const { data: orders } = await db.from('vorbestellungen').select('*').eq('datum', today).order('created_at');
  const all = orders || [];

  const truck = all.filter(o => o.typ === 'truck');
  const kantine = all.filter(o => o.typ === 'kantine');
  const revenue = all.reduce((s, o) => s + parseFloat(o.preis || 0) + parseFloat(o.getraenk_preis || 0), 0);

  const fmt = arr => arr.map(o => {
    const drink = o.getraenk ? ` + ${o.getraenk}` : '';
    const notiz = o.notiz ? ` (${o.notiz})` : '';
    const zahlung = o.zahlung === 'online' ? '💳' : '💵';
    return `<tr style="border-bottom:1px solid #1e2236;">
      <td style="padding:8px 12px;">${o.name}</td>
      <td style="padding:8px 12px;">${o.menu === 'menu1' ? 'Menü 1' : 'Menü 2'}${drink}</td>
      <td style="padding:8px 12px;color:#7a7468;">${notiz}</td>
      <td style="padding:8px 12px;">${zahlung}</td>
      <td style="padding:8px 12px;color:#f5a623;">${(parseFloat(o.preis||0)+parseFloat(o.getraenk_preis||0)).toFixed(2)} €</td>
    </tr>`;
  }).join('');

  const section = (title, arr, color) => arr.length === 0 ? '' : `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:1rem;font-weight:700;color:${color};margin-bottom:12px;">${title} (${arr.length})</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131726;border-radius:10px;overflow:hidden;border:1px solid #1e2236;">
        <thead><tr style="background:#1e2236;">
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#7a7468;">Name</th>
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#7a7468;">Bestellung</th>
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#7a7468;">Notiz</th>
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#7a7468;">Zahlung</th>
          <th style="padding:8px 12px;text-align:left;font-size:0.8rem;color:#7a7468;">Betrag</th>
        </tr></thead>
        <tbody>${fmt(arr)}</tbody>
      </table>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0b0e1a;font-family:Arial,sans-serif;color:#f0ede6;">
  <div style="max-width:680px;margin:0 auto;padding:40px 20px;">
    <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#7a7468;margin-bottom:8px;">INDERNATIONAL · TAGESBERICHT</p>
    <h1 style="font-size:1.8rem;font-weight:900;margin:0 0 24px;letter-spacing:-0.02em;">${dateStr}</h1>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:28px;">
      <div style="background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:1.8rem;font-weight:900;color:#f0ede6;">${all.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;">Gesamt</div>
      </div>
      <div style="background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:1.8rem;font-weight:900;color:#f5a623;">${truck.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;">🚚 Truck</div>
      </div>
      <div style="background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:1.8rem;font-weight:900;color:#3ecf8e;">${kantine.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;">🍽️ Kantine</div>
      </div>
      <div style="background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:1.8rem;font-weight:900;color:#f5a623;">${revenue.toFixed(2)} €</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;">Umsatz</div>
      </div>
    </div>
    ${section('🚚 Food Truck', truck, '#f5a623')}
    ${section('🍽️ Kantine', kantine, '#3ecf8e')}
    <p style="text-align:center;color:#7a7468;font-size:0.75rem;margin-top:32px;">Indernational · Vielfalt die schmeckt</p>
  </div>
</body></html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Indernational <vorbestellungen@indernational.laendspotter.com>',
        to: [reportEmail],
        subject: `📊 Tagesbericht ${dateStr} — ${all.length} Bestellungen`,
        html
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message);
    res.status(200).json({ ok: true, orders: all.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
