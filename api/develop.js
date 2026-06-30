import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://tteoreum.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `다음 메모를 발전시켜줘. 핵심 아이디어를 구체화하고, 실행 가능한 다음 단계나 연관 아이디어를 제안해줘. 3~5문장으로 간결하게.\n\n메모: ${content}`,
    }],
  });

  return res.status(200).json({ summary: msg.content[0].text.trim() });
}
