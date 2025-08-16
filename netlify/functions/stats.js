import { getStore } from '@netlify/blobs';
import { STORE_NAME, CAP, jsonResponse } from './_shared.js';

export default async () => {
  const store = getStore(STORE_NAME);
  const raw = await store.get('data', { consistency: 'strong' });
  const data = raw ? JSON.parse(raw) : { total: 0, votes: [], round: 1 };
  const total = Number(data.total || 0);
  const round = Number(data.round || 1);
  return jsonResponse({ total, remaining: Math.max(0, CAP - total), cap: CAP, round });
}
