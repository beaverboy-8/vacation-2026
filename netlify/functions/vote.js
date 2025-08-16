import { getStore } from '@netlify/blobs';
import { STORE_NAME, CAP, jsonResponse } from './_shared.js';

const CHOICES = new Set(['San Diego', 'Monterey', 'Hawaii', 'Other']);

export default async (req, context) => {
  if (req.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ message: 'Invalid JSON' }, 400);
  }

  const choice = (body.choice || '').trim();
  let otherText = (body.otherText || '').trim();
  if (!CHOICES.has(choice)) {
    return jsonResponse({ message: 'Invalid choice' }, 400);
  }
  if (choice === 'Other') {
    if (!otherText) return jsonResponse({ message: 'Other text required' }, 400);
    if (otherText.length > 80) otherText = otherText.slice(0, 80);
  } else {
    otherText = '';
  }

  const store = getStore(STORE_NAME);
  const key = 'data';

  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.getWithMetadata(key, { consistency: 'strong' });
    const existing = current?.value ? JSON.parse(current.value) : { total: 0, votes: [] };

    if ((existing.total || 0) >= CAP) {
      return jsonResponse({ message: 'Voting cap reached', total: existing.total }, 409);
    }

    const vote = {
      choice,
      otherText,
      ts: Date.now(),
      ua: req.headers.get('user-agent')?.slice(0, 60) || ''
    };

    const updated = {
      total: (existing.total || 0) + 1,
      votes: Array.isArray(existing.votes) ? [...existing.votes, vote] : [vote]
    };

    const options = current?.etag
      ? { onlyIfMatch: current.etag }
      : { onlyIfNew: true };

    const result = await store.set(key, JSON.stringify(updated), options);

    if (result?.modified) {
      return new Response(JSON.stringify({ success: true, total: updated.total, remaining: Math.max(0, CAP - updated.total) }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Set-Cookie': 'vacay2026_voted=1; Path=/; Max-Age=31536000; SameSite=Lax'
        }
      });
    }
  }

  return jsonResponse({ message: 'Please try again' }, 409);
}
