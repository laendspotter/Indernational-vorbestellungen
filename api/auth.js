const crypto = require('crypto');
const { setCors } = require('./_cors');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
  setCors(req, res);
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

  if (timingSafeEqual(password, expected)) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
};
