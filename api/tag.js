import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://tteoreum.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { items, existingTags } = req.body; // items: [{ id, content }], existingTags: string[]
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'items required' });

  const prompt = items.map((it, i) => `[${i}] ${it.content}`).join('\n');
  const tagVocab = Array.isArray(existingTags) ? existingTags.slice(0, 40) : [];
  const vocabHint = tagVocab.length > 0
    ? `이미 쓰이고 있는 태그 목록: ${tagVocab.join(', ')}\n의미가 맞으면 반드시 이 목록의 단어를 그대로 재사용해. 새 태그는 이 목록으로 표현이 안 될 때만 만들어.\n\n`
    : '';

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `다음 메모 항목 각각에 태그를 1~3개 붙여줘. 한국어 단어로, 짧게.\n${vocabHint}JSON 배열로만 응답해. 형식: [{"id":"...","tags":["태그1","태그2"]},...]\n\n${prompt}`,
    }],
  });

  const text = msg.content[0].text.trim();
  // JSON 파싱 시도
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return res.status(500).json({ error: 'parse failed', raw: text });

  const rawResult = JSON.parse(match[0]);
  // id를 items 배열 인덱스로 매핑
  const result = rawResult.map((r, i) => ({
    id: items[i]?.id ?? r.id,
    tags: Array.isArray(r.tags) ? r.tags.slice(0, 3) : [],
  }));

  return res.status(200).json({ result });
}
