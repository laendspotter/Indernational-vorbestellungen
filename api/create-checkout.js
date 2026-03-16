const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, bestellung } = req.body;
    // items: [{ name, amount_cents }]
    // bestellung: wird als metadata gespeichert

    const line_items = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.name },
        unit_amount: item.amount_cents,
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.headers.origin || bestellung.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&typ=${bestellung.typ}`,
      cancel_url: `${req.headers.origin || bestellung.origin}/${bestellung.typ}.html`,
      metadata: {
        name: bestellung.name,
        datum: bestellung.datum,
        menu: bestellung.menu,
        typ: bestellung.typ,
        getraenk: bestellung.getraenk || '',
        getraenk_preis: String(bestellung.getraenk_preis || 0),
        preis: String(bestellung.preis || 0),
      },
    });

    res.status(200).json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
