import { getStore } from '@netlify/blobs';
import { STORE_NAME, CAP, jsonResponse } from './_shared.js';

export default async (req, context) => {
  const key = req.headers.get('x-admin-key') || '';
  if (!key || key !== (process.env.ADMIN_KEY || '')) {
    return jsonResponse({ message: 'Unauthorized' }, 401);
  }

  const store = getStore(STORE_NAME);
  const raw = await store.get('data', { consistency: 'strong' });
  const data = raw ? JSON.parse(raw) : { total: 0, votes: [] };

  const breakdown = { 'San Diego': 0, 'Monterey': 0, 'Hawaii': 0, 'Other': 0 };
  const otherSuggestions = [];

  for (const v of (data.votes || [])) {
    if (breakdown[v.choice] !== undefined) breakdown[v.choice]++;
    if (v.choice === 'Other' && v.otherText) otherSuggestions.push(v.otherText);
  }

  return jsonResponse({
    total: data.total || 0,
    cap: CAP,
    breakdown,
    otherSuggestions,
    votes: data.votes || []
  });
}
