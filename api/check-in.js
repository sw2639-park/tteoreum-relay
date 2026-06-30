import { Redis } from '@upstash/redis';
import webpush from 'web-push';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

webpush.setVapidDetails(
  'mailto:s01025232639@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const raw = await redis.get('push_subscription');
  if (!raw) return res.status(200).json({ ok: true, skipped: 'no subscription' });

  const subscription = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // 일요일(KST) 여부
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const isSunday = nowKST.getUTCDay() === 0;

  const payload = JSON.stringify({ type: 'check-in', weeklySummary: isSunday });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ ok: true, isSunday });
  } catch (err) {
    if (err.statusCode === 410) {
      await redis.del('push_subscription');
      return res.status(200).json({ ok: true, expired: true });
    }
    console.error('push failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
