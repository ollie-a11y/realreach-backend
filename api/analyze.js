export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { website, linkedin, apiKey } = req.body;

  if (!website || !linkedin || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const prompt = `Analyze this company and provide insights for personalized outreach. Return ONLY a valid JSON object (no markdown, no extra text):

WEBSITE: ${website}

LINKEDIN ABOUT:
${linkedin}

Extract and return as JSON:
{
  "industry": "their main industry",
  "services": "what they do/sell",
  "differentiators": "what makes them unique",
  "tone": "their communication style (professional/friendly/direct/consultative)",
  "proofPoints": "any results/metrics mentioned",
  "painPoints": "problems they solve for customers"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250805',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Error');
    }

    const data = await response.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse response');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    res.status(200).json({ success: true, data: extracted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}