const ALLOWED_ORIGINS = [
  'https://indernational.vercel.app',
  'https://indernational.laendspotter.com',
  'https://vorbestellen.indernational.food',
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { setCors, ALLOWED_ORIGINS };
