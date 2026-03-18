const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const m = session.metadata;
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    await db.from('vorbestellungen').insert({
      name: m.name, datum: m.datum, menu: m.menu, typ: m.typ, user_email: m.user_email || null,
      getraenk: m.getraenk, getraenk_preis: parseFloat(m.getraenk_preis),
      preis: parseFloat(m.preis), zahlung: 'online',
      bezahlt: true, erledigt: false, stripe_session_id: session.id, notiz: m.notiz || '',
    });

    // send confirmation email
    if (m.user_email) {
      const qrData = JSON.stringify({ id: session.id, name: m.name, datum: m.datum, menu: m.menu, typ: m.typ });
      const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
      await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: m.user_email,
          bestellung: { name: m.name, datum: m.datum, menu: m.menu, typ: m.typ, getraenk: m.getraenk, getraenk_preis: m.getraenk_preis, preis: m.preis, zahlung: 'online' },
          qrData
        })
      }).catch(console.error);
    }
  }

  res.status(200).json({ received: true });
};
