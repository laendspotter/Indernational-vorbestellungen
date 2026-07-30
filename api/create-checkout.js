const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { setCors, ALLOWED_ORIGINS } = require('./_cors');

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}
function getDayKey(dateStr) {
  return ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'][new Date(dateStr + 'T00:00:00').getDay()];
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bestellung } = req.body;
    if (!bestellung || !['kantine', 'truck'].includes(bestellung.typ) || !bestellung.datum || !bestellung.menu) {
      return res.status(400).json({ error: 'Fehlende oder ungültige Bestelldaten' });
    }

    // Preise NIE aus dem Client übernehmen — immer serverseitig aus der DB berechnen,
    // sonst könnte der Betrag beim Checkout manipuliert werden.
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const dk = getDayKey(bestellung.datum);

    const { data: menuRow } = await db.from('menus').select('*')
      .eq('typ', bestellung.typ).eq('woche_start', getWeekStart(bestellung.datum)).maybeSingle();
    const menuPreis = menuRow ? parseFloat(menuRow[`${dk}_${bestellung.menu}_preis`] || 0) : 0;

    let getraenkPreis = 0;
    if (bestellung.getraenk) {
      const { data: drink } = await db.from('getraenke').select('preis')
        .eq('typ', bestellung.typ).eq('name', bestellung.getraenk).eq('verfuegbar', true).maybeSingle();
      getraenkPreis = drink ? parseFloat(drink.preis || 0) : 0;
    }

    const totalPreis = menuPreis + getraenkPreis;
    if (totalPreis <= 0) return res.status(400).json({ error: 'Für diese Bestellung ist keine Online-Zahlung möglich' });

    const line_items = [{
      price_data: {
        currency: 'eur',
        product_data: { name: `${bestellung.menu === 'menu1' ? 'Menü 1' : 'Menü 2'}${bestellung.getraenk ? ' + ' + bestellung.getraenk : ''}` },
        unit_amount: Math.round(totalPreis * 100),
      },
      quantity: 1,
    }];

    const origin = ALLOWED_ORIGINS.includes(req.headers.origin) ? req.headers.origin : ALLOWED_ORIGINS[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&typ=${bestellung.typ}`,
      cancel_url: `${origin}/${bestellung.typ}.html`,
      metadata: {
        name: bestellung.name || '',
        datum: bestellung.datum,
        menu: bestellung.menu,
        typ: bestellung.typ,
        getraenk: bestellung.getraenk || '',
        getraenk_preis: String(getraenkPreis),
        preis: String(totalPreis),
        user_email: bestellung.user_email || '',
        notiz: bestellung.notiz || '',
      },
    });

    res.status(200).json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
