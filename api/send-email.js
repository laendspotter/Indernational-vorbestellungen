module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { to, bestellung, qrData } = req.body;

  const menuLabel = bestellung.menu === 'menu1' ? 'Menü 1' : 'Menü 2';
  const drinkInfo = bestellung.getraenk ? `<br>🥤 ${bestellung.getraenk}` : '';
  const total = (parseFloat(bestellung.preis || 0) + parseFloat(bestellung.getraenk_preis || 0)).toFixed(2).replace('.', ',');
  const zahlungInfo = bestellung.zahlung === 'online' ? '💳 Online bezahlt' : '💵 Bar zahlen bei Abholung';
  const typLabel = bestellung.typ === 'truck' ? '🚚 Food Truck' : '🍽️ Kantine';

  const date = new Date(bestellung.datum + 'T00:00:00');
  const dateStr = date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // QR code as data URL via Google Charts API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0b0e1a;font-family:'DM Sans',Arial,sans-serif;color:#f0ede6;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#7a7468;margin-bottom:8px;">INDERNATIONAL</p>
      <h1 style="font-size:1.8rem;font-weight:900;margin:0;letter-spacing:-0.02em;">Vorbestellung bestätigt ✓</h1>
    </div>

    <div style="background:#131726;border:1px solid #1e2236;border-radius:16px;padding:28px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Name</td><td style="padding:6px 0;font-weight:600;text-align:right;">${bestellung.name}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Datum</td><td style="padding:6px 0;font-weight:600;text-align:right;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Bereich</td><td style="padding:6px 0;font-weight:600;text-align:right;">${typLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Bestellung</td><td style="padding:6px 0;font-weight:600;text-align:right;">${menuLabel}${drinkInfo}</td></tr>
        <tr><td style="padding:6px 0;color:#7a7468;font-size:0.85rem;">Zahlung</td><td style="padding:6px 0;font-weight:600;text-align:right;">${zahlungInfo}</td></tr>
        ${parseFloat(bestellung.preis || 0) > 0 ? `<tr><td colspan="2" style="padding-top:12px;border-top:1px solid #1e2236;"></td></tr><tr><td style="padding:6px 0;font-weight:700;">Gesamt</td><td style="padding:6px 0;font-weight:700;color:#f5a623;text-align:right;">${total} €</td></tr>` : ''}
      </table>
    </div>

    <div style="background:#131726;border:1px solid #1e2236;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
      <p style="color:#7a7468;font-size:0.82rem;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.08em;">QR-Code vorzeigen bei Abholung</p>
      <img src="${qrUrl}" alt="QR Code" width="180" height="180" style="border-radius:10px;background:white;padding:10px;" />
    </div>

    <p style="text-align:center;color:#7a7468;font-size:0.8rem;margin-top:24px;">Indernational · Vielfalt die schmeckt</p>
  </div>
</body>
</html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Indernational <onboarding@resend.dev>',
        to: [to],
        subject: `✓ Vorbestellung bestätigt – ${dateStr}`,
        html
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Resend error');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
