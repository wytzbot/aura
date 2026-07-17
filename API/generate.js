// /api/generate.js
export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userId, isPro } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // 1. WORD LIMIT CHECK: 3000 words for free users
  const lastUserMessage = messages[messages.length - 1]?.parts[0]?.text || "";
  const wordCount = lastUserMessage.trim().split(/\s+/).length;
  if (!isPro && wordCount > 3000) {
    return res.status(400).json({ error: `Free limit: 3000 words. You sent ${wordCount}. Upgrade to Pro for unlimited.` });
  }

  // 2. CALL GEMINI 2.5 FLASH - FREE
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:streamGenerateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: messages })
    });

    if (!geminiRes.ok) throw new Error('Gemini API error');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = geminiRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (error) {
    res.status(500).json({ error: 'Gemini API failed. Please try again.' });
  }
    }
