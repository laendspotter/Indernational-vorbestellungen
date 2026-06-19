const { setCors } = require('./_cors');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { imageBase64, imageType, weekStart } = req.body;
  if (!imageBase64 || !imageType || !weekStart) return res.status(400).json({ error: 'Fehlende Parameter' });

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
  if (!ALLOWED_TYPES.includes(imageType)) return res.status(400).json({ error: 'Ungültiger Dateityp' });

  const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const ws = new Date(weekStart + 'T00:00:00');
  if (isNaN(ws.getTime())) return res.status(400).json({ error: 'Ungültiges Datum' });
  const dayDates = [0,1,2,3,4].map(i => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return `${DAY_NAMES[d.getDay()]} (${d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})})`;
  }).join(', ');

  const prompt = `Du siehst einen Speiseplan. Extrahiere für jeden Wochentag (Montag bis Freitag): Menü 1 = Fleischgericht, Menü 2 = Vegetarisch/Vegan. Die Wochentage: ${dayDates}. Antworte NUR mit JSON ohne Markdown:\n{"mo":{"menu1":"...","menu2":"...","preis1":0,"preis2":0},"di":{},"mi":{},"do":{},"fr":{}}`;

  const contentBlock = imageType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }]
    })
  });

  const data = await response.json();
  res.status(response.status).json(data);
};
