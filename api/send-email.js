module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { to, bestellung, qrData } = req.body;
  if (!to || !bestellung) return res.status(400).json({ error: 'Fehlende Parameter' });

  const b = bestellung;
  const dateStr = b.datum
    ? new Date(b.datum + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '–';
  const menuLabel = b.menu === 'menu1' ? 'Menü 1' : 'Menü 2';
  const typLabel = b.typ === 'truck' ? '🚚 Food Truck' : '🍽️ Kantine';
  const zahlungLabel = b.zahlung === 'online' ? '💳 Online bezahlt' : '💵 Bar bei Abholung';
  const menuPreis = parseFloat(b.preis || 0);
  const drinkPreis = parseFloat(b.getraenk_preis || 0);
  const total = menuPreis + drinkPreis;

  // generate invoice number from timestamp
  const invoiceNr = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

  // QR code URL
  const qrUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData)}`
    : '';

  const drinkRow = b.getraenk ? `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.9rem;">${b.getraenk}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.82rem;color:#888;">Getränk</td>
      <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.9rem;text-align:right;">${drinkPreis.toFixed(2).replace('.', ',')} €</td>
    </tr>` : '';

  const notizRow = b.notiz ? `
    <tr>
      <td colspan="3" style="padding:8px 0;font-size:0.8rem;color:#888;border-bottom:1px solid #f0ede6;">
        📝 Hinweis: ${b.notiz}
      </td>
    </tr>` : '';

  const totalRow = total > 0 ? `
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;border-top:1px solid #e0ddd6;margin-top:8px;padding-top:10px;">
      <span>Gesamt</span>
      <span style="color:#f5a623;">${total.toFixed(2).replace('.', ',')} €</span>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <div style="background:#0b0e1a;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="color:#f0ede6;font-size:1.4rem;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;">Indernational</div>
      <div style="color:#7a7468;font-size:0.75rem;margin-top:3px;">Vielfalt die schmeckt</div>
    </div>
    <div style="text-align:right;">
      <div style="background:#f5a623;color:#0b0e1a;font-weight:700;font-size:0.7rem;padding:4px 10px;border-radius:50px;letter-spacing:0.08em;text-transform:uppercase;display:inline-block;">Rechnung</div>
      <div style="color:#7a7468;font-size:0.78rem;margin-top:6px;">${invoiceNr}</div>
    </div>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <!-- KUNDE -->
    <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin-bottom:6px;">Kunde</div>
    <div style="background:#f9f7f4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <div style="font-weight:600;font-size:0.95rem;">${to}</div>
      <div style="font-size:0.82rem;color:#888;margin-top:3px;">${b.name ? b.name + ' · ' : ''}${dateStr}</div>
    </div>

    <!-- BESTELLUNG -->
    <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin-bottom:10px;">Bestellung · ${typLabel}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <thead>
        <tr>
          <th style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;border-bottom:2px solid #eee;text-align:left;">Beschreibung</th>
          <th style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;border-bottom:2px solid #eee;text-align:left;">Typ</th>
          <th style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;padding:8px 0;border-bottom:2px solid #eee;text-align:right;">Betrag</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.9rem;">${menuLabel}</td>
          <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.82rem;color:#888;">${typLabel}</td>
          <td style="padding:12px 0;border-bottom:1px solid #f0ede6;font-size:0.9rem;text-align:right;">${menuPreis > 0 ? menuPreis.toFixed(2).replace('.', ',') + ' €' : '–'}</td>
        </tr>
        ${drinkRow}
        ${notizRow}
      </tbody>
    </table>

    <!-- TOTAL -->
    <div style="background:#f9f7f4;border-radius:8px;padding:16px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;padding:4px 0;">
        <span style="color:#888;">Zahlung</span>
        <span style="font-weight:600;">${zahlungLabel}</span>
      </div>
      ${totalRow}
    </div>

    <!-- QR -->
    ${qrUrl ? `
    <div style="text-align:center;padding:24px 0;border-top:1px solid #f0ede6;margin-top:20px;">
      <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:#aaa;margin-bottom:12px;">QR-Code zur Abholung vorzeigen</div>
      <img src="${qrUrl}" width="140" height="140" style="border-radius:10px;background:#eee;" alt="QR Code"/>
    </div>` : ''}

  </div>

  <!-- FOOTER -->
  <div style="background:#0b0e1a;padding:20px 40px;text-align:center;">
    <p style="color:#7a7468;font-size:0.72rem;line-height:1.8;margin:0;">
      <span style="color:#f5a623;">Indernational</span> · Edelhalde 46/1 · 72285 Pfalzgrafenweiler<br>
      Diese Rechnung wurde automatisch erstellt.
    </p>
  </div>

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
        subject: `✅ Deine Vorbestellung bei Indernational – ${dateStr}`,
        html
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Resend error');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: err.message });
  }
};
