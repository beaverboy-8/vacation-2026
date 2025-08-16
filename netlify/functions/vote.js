import { getStore } from '@netlify/blobs';
import { STORE_NAME, CAP, jsonResponse } from './_shared.js';

const CHOICES = new Set(['San Diego', 'Monterey', 'Hawaii', 'Other']);

export default async (req) => {
  if (req.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return jsonResponse({ message: 'Invalid JSON' }, 400); }

  const choice = String(body.choice || '').trim();
  let otherText = String(body.otherText || '').trim();
  if (!CHOICES.has(choice)) return jsonResponse({ message: 'Invalid choice' }, 400);
  if (choice === 'Other') {
    if (!otherText) return jsonResponse({ message: 'Other text required' }, 400);
    if (otherText.length > 80) otherText = otherText.slice(0, 80);
  } else {
    otherText = '';
  }

  const store = getStore(STORE_NAME);
  const key = 'data';
  const raw = await store.get(key, { consistency: 'strong' });
  const data = raw ? JSON.parse(raw) : { total: 0, votes: [], round: 1 };

  if ((data.total || 0) >= CAP) {
    return jsonResponse({ message: 'Voting cap reached', total: data.total }, 409);
  }

  const vote = { choice, otherText, ts: Date.now(), ua: req.headers.get('user-agent')?.slice(0, 60) || '' };
  const updated = {
    total: (data.total || 0) + 1,
    votes: [...(data.votes || []), vote],
    round: Number(data.round || 1)
  };

  await store.set(key, JSON.stringify(updated));

  const cookieName = `vacay2026_voted_r${updated.round}`;
  return new Response(JSON.stringify({ success: true, total: updated.total, round: updated.round }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${cookieName}=1; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  });
}
