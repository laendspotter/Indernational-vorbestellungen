module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { role, password } = req.body || {};
  if (!role || !password) return res.status(400).json({ ok: false });

  const envMap = {
    truck: process.env.ADMIN_PW_TRUCK,
    kantine: process.env.ADMIN_PW_KANTINE,
    main: process.env.ADMIN_PW_MAIN,
    loyalty: process.env.ADMIN_PW_LOYALTY,
  };

  const expected = envMap[role];
  if (!expected) return res.status(400).json({ ok: false });

  if (password === expected) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
};
