const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id, user_email, menu, getraenk, getraenk_preis } = req.body;
  if (!order_id || !user_email) return res.status(400).json({ error: 'Fehlende Parameter' });

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // verify ownership
  const { data: order } = await db.from('vorbestellungen').select('*').eq('id', order_id).eq('user_email', user_email).single();
  if (!order) return res.status(404).json({ error: 'Bestellung nicht gefunden' });

  const today = new Date().toISOString().split('T')[0];
  if (order.datum < today) return res.status(400).json({ error: 'Bestellung kann nicht mehr geändert werden' });

  const { error } = await db.from('vorbestellungen').update({
    menu: menu || order.menu,
    getraenk: getraenk !== undefined ? getraenk : order.getraenk,
    getraenk_preis: getraenk_preis !== undefined ? getraenk_preis : order.getraenk_preis,
  }).eq('id', order_id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
};
