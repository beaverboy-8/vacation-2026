import { getStore } from '@netlify/blobs';
import { STORE_NAME, jsonResponse } from './_shared.js';

export default async (req) => {
  const key = req.headers.get('x-admin-key') || '';
  if (!key || key !== (process.env.ADMIN_KEY || '')) return jsonResponse({ message: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405);

  const store = getStore(STORE_NAME);
  const raw = await store.get('data', { consistency: 'strong' });
  const data = raw ? JSON.parse(raw) : { round: 1 };

  const nextRound = Number(data.round || 1) + 1;
  await store.set('data', JSON.stringify({ total: 0, votes: [], round: nextRound }));
  return jsonResponse({ ok: true, total: 0, round: nextRound });
};
