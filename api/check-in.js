// GET /api/check-in — Vercel Cron (매일 22:30 UTC = 07:30 KST)
// push payload에는 내용 없음 — 미처리 카운트는 SW가 IndexedDB에서 직접 셈
import { kv } from '@vercel/kv';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_CONTACT || 's01025232639@gmail.com'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Vercel cron 인증
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const raw = await kv.get('push_subscription');
  if (!raw) return res.status(200).json({ ok: true, skipped: 'no subscription' });

  const subscription = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // 일요일(KST) 여부 — cron은 UTC 22:30이므로 KST 07:30 = 같은 날 오전
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const isSunday = nowKST.getUTCDay() === 0;

  const payload = JSON.stringify({
    type: 'check-in',
    weeklySummary: isSunday ? true : false,
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ ok: true, isSunday });
  } catch (err) {
    if (err.statusCode === 410) {
      // 구독이 만료됨 — 삭제
      await kv.del('push_subscription');
      return res.status(200).json({ ok: true, expired: true });
    }
    console.error('push failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
