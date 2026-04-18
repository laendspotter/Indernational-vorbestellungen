const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email: emailParam } = req.body || {};
  const reportEmail = emailParam || process.env.REPORT_EMAIL;
  if (!reportEmail) return res.status(400).json({ error: 'Keine E-Mail konfiguriert.' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6);
  lastMonday.setHours(0,0,0,0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23,59,59,999);

  const fromStr = lastMonday.toISOString().split('T')[0];
  const toStr = lastSunday.toISOString().split('T')[0];
  const weekLabel = `${lastMonday.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'})} – ${lastSunday.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'})}`;

  const { data: orders } = await db.from('vorbestellungen').select('*').gte('datum', fromStr).lte('datum', toStr);
  const all = orders || [];

  const truck = all.filter(o => o.typ === 'truck');
  const kantine = all.filter(o => o.typ === 'kantine');
  const revenue = all.reduce((s, o) => s + parseFloat(o.preis||0) + parseFloat(o.getraenk_preis||0), 0);

  const counts = {};
  all.forEach(o => { counts[o.name] = (counts[o.name]||0) + 1; });
  const topKunden = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,5);

  const m1 = all.filter(o => o.menu === 'menu1').length;
  const m2 = all.filter(o => o.menu === 'menu2').length;

  const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const perDay = {};
  all.forEach(o => {
    const d = new Date(o.datum + 'T00:00:00');
    const key = dayNames[d.getDay()];
    perDay[key] = (perDay[key]||0) + 1;
  });
  const dayBars = ['Mo','Di','Mi','Do','Fr'].map(d => {
    const count = perDay[d] || 0;
    const max = Math.max(...Object.values(perDay), 1);
    const pct = Math.round(count / max * 100);
    return `<tr>
      <td style="padding:4px 12px 4px 0;font-size:0.82rem;color:#7a7468;width:30px;">${d}</td>
      <td style="padding:4px 0;"><div style="background:#1e2236;border-radius:4px;overflow:hidden;height:14px;width:180px;"><div style="background:linear-gradient(90deg,#f5a623,#3ecf8e);height:100%;width:${pct}%;border-radius:4px;"></div></div></td>
      <td style="padding:4px 0 4px 10px;font-size:0.82rem;color:#f0ede6;">${count}</td>
    </tr>`;
  }).join('');

  const topKundenRows = topKunden.map(([name, count], i) => {
    const medals = ['🥇','🥈','🥉','4.','5.'];
    return `<tr><td style="padding:8px 12px 8px 0;font-size:0.85rem;">${medals[i]}</td><td style="padding:8px 0;font-size:0.85rem;color:#f0ede6;">${name}</td><td style="padding:8px 0;font-size:0.85rem;color:#f5a623;text-align:right;">${count}x</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0b0e1a;font-family:Arial,sans-serif;color:#f0ede6;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <p style="font-size:0.72rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7a7468;margin-bottom:6px;">INDERNATIONAL · WOCHENBERICHT</p>
  <h1 style="font-size:1.6rem;font-weight:900;margin:0 0 4px;">Letzte Woche</h1>
  <p style="color:#7a7468;font-size:0.85rem;margin:0 0 28px;">${weekLabel}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr>
      <td style="width:25%;text-align:center;background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;">
        <div style="font-size:1.8rem;font-weight:900;color:#f0ede6;">${all.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;margin-top:3px;">Gesamt</div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:25%;text-align:center;background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;">
        <div style="font-size:1.8rem;font-weight:900;color:#f5a623;">${truck.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;margin-top:3px;">🚚 Truck</div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:25%;text-align:center;background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;">
        <div style="font-size:1.8rem;font-weight:900;color:#3ecf8e;">${kantine.length}</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;margin-top:3px;">🍽️ Kantine</div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:25%;text-align:center;background:#131726;border:1px solid #1e2236;border-radius:10px;padding:16px;">
        <div style="font-size:1.8rem;font-weight:900;color:#f5a623;">${revenue.toFixed(2).replace('.',',')} €</div>
        <div style="font-size:0.7rem;color:#7a7468;text-transform:uppercase;margin-top:3px;">Umsatz</div>
      </td>
    </tr>
  </table>
  <div style="background:#131726;border:1px solid #1e2236;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#7a7468;margin:0 0 14px;">Bestellungen pro Tag</p>
    <table cellpadding="0" cellspacing="0">${dayBars}</table>
  </div>
  <div style="background:#131726;border:1px solid #1e2236;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#7a7468;margin:0 0 14px;">Menü-Verteilung</p>
    <div style="display:flex;gap:16px;">
      <div style="flex:1;text-align:center;background:#0b0e1a;border-radius:8px;padding:12px;"><div style="font-size:1.4rem;font-weight:900;color:#f5a623;">${m1}</div><div style="font-size:0.75rem;color:#7a7468;margin-top:2px;">Menü 1</div></div>
      <div style="flex:1;text-align:center;background:#0b0e1a;border-radius:8px;padding:12px;"><div style="font-size:1.4rem;font-weight:900;color:#3ecf8e;">${m2}</div><div style="font-size:0.75rem;color:#7a7468;margin-top:2px;">Menü 2</div></div>
    </div>
  </div>
  ${topKunden.length > 0 ? `<div style="background:#131726;border:1px solid #1e2236;border-radius:12px;padding:20px;margin-bottom:28px;"><p style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#7a7468;margin:0 0 14px;">Top Kunden</p><table width="100%" cellpadding="0" cellspacing="0">${topKundenRows}</table></div>` : ''}
  <p style="text-align:center;color:#7a7468;font-size:0.72rem;">Indernational · Edelhalde 46/1 · 72285 Pfalzgrafenweiler</p>
</div>
</body></html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Indernational <vorbestellungen@indernational.laendspotter.com>',
        to: [reportEmail],
        subject: `📊 Wochenbericht ${weekLabel} – ${all.length} Bestellungen`,
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
