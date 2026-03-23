const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware');

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada.' });

  const { system, messages, max_tokens } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages inválido.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: max_tokens || 4096,
        system: system || 'Você é um analista especializado em pesquisas de opinião. Responda sempre em português brasileiro.',
        messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '';
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
