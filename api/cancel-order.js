const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id, user_email } = req.body;
  if (!order_id || !user_email) return res.status(400).json({ error: 'Fehlende Parameter' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // fetch order and verify ownership
  const { data: order, error: fetchErr } = await db
    .from('vorbestellungen')
    .select('*')
    .eq('id', order_id)
    .eq('user_email', user_email)
    .single();

  if (fetchErr || !order) return res.status(404).json({ error: 'Bestellung nicht gefunden' });

  // check if still cancellable (before pickup day)
  const today = new Date().toISOString().split('T')[0];
  if (order.datum < today) return res.status(400).json({ error: 'Bestellung kann nicht mehr storniert werden' });

  // stripe refund if paid online
  if (order.zahlung === 'online' && order.bezahlt && order.stripe_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_intent) {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
      }
    } catch (err) {
      console.error('Stripe refund error:', err);
      return res.status(500).json({ error: 'Rückerstattung fehlgeschlagen: ' + err.message });
    }
  }

  // delete from supabase
  const { error: deleteErr } = await db.from('vorbestellungen').delete().eq('id', order_id);
  if (deleteErr) return res.status(500).json({ error: 'Fehler beim Löschen' });

  res.status(200).json({ ok: true, refunded: order.zahlung === 'online' && order.bezahlt });
};
