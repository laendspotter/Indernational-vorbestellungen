const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const m = session.metadata;

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    await db.from('vorbestellungen').insert({
      name: m.name,
      datum: m.datum,
      menu: m.menu,
      typ: m.typ,
      getraenk: m.getraenk,
      getraenk_preis: parseFloat(m.getraenk_preis),
      preis: parseFloat(m.preis),
      zahlung: 'online',
      bezahlt: true,
      erledigt: false,
      stripe_session_id: session.id,
    });
  }

  res.status(200).json({ received: true });
};
