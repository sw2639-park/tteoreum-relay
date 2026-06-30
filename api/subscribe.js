// POST /api/subscribe — PWA에서 push 구독 정보를 저장
// 단일 사용자 앱이라 Vercel KV에 단 하나의 구독 정보만 보관
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS: tteoreum.vercel.app 에서만 허용
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const subscription = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'invalid subscription' });

  await kv.set('push_subscription', JSON.stringify(subscription));
  return res.status(200).json({ ok: true });
}
