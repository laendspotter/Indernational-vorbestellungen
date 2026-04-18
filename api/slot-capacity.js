const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { datum, typ, zeitslot_uhrzeit } = req.method === 'POST' ? req.body : req.query;
  if (!datum || !typ) return res.status(400).json({ error: 'datum und typ fehlen' });

  // alle slots für diesen tag + typ laden
  const { data: orders } = await db
    .from('vorbestellungen')
    .select('zeitslot_uhrzeit, anzahl')
    .eq('datum', datum)
    .eq('typ', typ)
    .not('zeitslot_uhrzeit', 'is', null);

  // kapazität pro slot berechnen
  const MAX_PER_SLOT = 15;
  const WAIT_PER_PERSON_MIN = 1.5;

  const slotCounts = {};
  (orders || []).forEach(o => {
    const slot = o.zeitslot_uhrzeit;
    if (slot) {
      slotCounts[slot] = (slotCounts[slot] || 0) + (parseInt(o.anzahl) || 1);
    }
  });

  if (zeitslot_uhrzeit) {
    // spezifischen slot abfragen
    const count = slotCounts[zeitslot_uhrzeit] || 0;
    const available = Math.max(0, MAX_PER_SLOT - count);
    const waitMin = Math.round(count * WAIT_PER_PERSON_MIN);
    return res.status(200).json({
      slot: zeitslot_uhrzeit,
      count,
      available,
      full: count >= MAX_PER_SLOT,
      waitMin,
      maxPerSlot: MAX_PER_SLOT
    });
  }

  // alle slots zurückgeben
  return res.status(200).json({ slotCounts, maxPerSlot: MAX_PER_SLOT, waitPerPerson: WAIT_PER_PERSON_MIN });
};
