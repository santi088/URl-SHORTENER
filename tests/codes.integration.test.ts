import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import { router as codeRouter } from '../src/routes/codes.route.js';
import { codesServices } from '../src/services/codes.services.js';
import pool from '../src/db.js';

const app = express();
app.use(express.json());
app.use('/api/code', codeRouter);

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const createdCodes: string[] = [];
const directCodeIds: number[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  for (const id of directCodeIds) {
    await pool.query('DELETE FROM clicks WHERE code_id = $1', [id]);
    await pool.query('DELETE FROM codes WHERE id = $1', [id]);
  }
  for (const code of createdCodes) {
    const r = await pool.query('SELECT id FROM codes WHERE code = $1', [code]);
    const id = r.rows[0]?.id;
    if (id) {
      await pool.query('DELETE FROM clicks WHERE code_id = $1', [id]);
    }
    await pool.query('DELETE FROM codes WHERE code = $1', [code]);
  }
  await new Promise((r) => setTimeout(r, 200));
  server.close();
  await pool.end();
});

async function postCode(body: unknown) {
  const res = await fetch(`${baseUrl}/api/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (data?.code) createdCodes.push(data.code);
  return { res, data };
}

async function insertCode(code: string, expiresAt: string) {
  const r = await pool.query(
    'INSERT INTO codes (code, url, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [code, 'https://example.com/direct', expiresAt],
  );
  const id = Number(r.rows[0].id);
  directCodeIds.push(id);
  return id;
}

async function insertClick(codeId: number, createdAt: string) {
  await pool.query('INSERT INTO clicks (code_id, created_at) VALUES ($1, $2)', [codeId, createdAt]);
}

describe('POST /api/code', () => {
  it('creates a code for a valid url', async () => {
    const { res, data } = await postCode({ url: 'https://example.com' });
    expect(res.status).toBe(201);
    expect(data).toEqual({
      code: expect.stringMatching(/^[a-zA-Z0-9]{7}$/),
      expires_at: expect.any(String),
    });
    const expires = new Date(data.expires_at).getTime();
    expect(expires).toBeGreaterThan(Date.now());
    expect(expires).toBeLessThanOrEqual(Date.now() + 31 * 24 * 60 * 60 * 1000 + 1000);
    expect(typeof data.code).toBe('string');
  });

  it('accepts expires_at', async () => {
    const { res, data } = await postCode({ url: 'https://example.com/x', expires_at: 7 });
    expect(res.status).toBe(201);
    expect(data.code).toHaveLength(7);
    const expires = new Date(data.expires_at).getTime();
    expect(expires).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(expires).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000 + 1000);
  });

  it('rejects invalid url', async () => {
    const { res, data } = await postCode({ url: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(data).toEqual({ message: 'bad request' });
  });

  it('rejects missing url', async () => {
    const { res, data } = await postCode({});
    expect(res.status).toBe(400);
    expect(data).toEqual({ message: 'bad request' });
  });

  it('rejects invalid expires_at (0)', async () => {
    const { res, data } = await postCode({ url: 'https://example.com', expires_at: 0 });
    expect(res.status).toBe(400);
    expect(data).toEqual({ message: 'bad request' });
  });

  it('rejects invalid expires_at (32)', async () => {
    const { res, data } = await postCode({ url: 'https://example.com', expires_at: 32 });
    expect(res.status).toBe(400);
    expect(data).toEqual({ message: 'bad request' });
  });
});

describe('POST /api/code collision retry', () => {
  it('retries when generator returns a taken code first', async () => {
    const taken = 'taken01';
    const fresh = 'fresh01';
    await insertCode(taken, '2027-01-01T00:00:00.000Z');

    let calls = 0;
    const gen = () => (calls++ === 0 ? taken : fresh);

    const result = await codesServices.post({ url: 'https://example.com/collision' }, gen);
    createdCodes.push(result.code);
    expect(result.code).toBe(fresh);
  });
});

describe('GET /api/code/:code', () => {
  it('redirects for existing code', async () => {
    const { data } = await postCode({ url: 'https://example.com/redirect' });
    const res = await fetch(`${baseUrl}/api/code/${data.code}`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://example.com/redirect');
  });

  it('returns 404 for unknown code', async () => {
    const res = await fetch(`${baseUrl}/api/code/zzzzzzz`, { redirect: 'manual' });
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data).toEqual({ message: 'not found...' });
  });

  it('returns 404 and logs no click for expired code', async () => {
    const code = 'e'+Date.now().toString(36).slice(-6);
    const id = await insertCode(code, '2020-01-01T00:00:00.000Z');
    const res = await fetch(`${baseUrl}/api/code/${code}`, { redirect: 'manual' });
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data).toEqual({ message: 'not found...' });
    const clicks = await pool.query('SELECT COUNT(*)::int AS c FROM clicks WHERE code_id = $1', [id]);
    expect(clicks.rows[0].c).toBe(0);
  });
});

describe('GET /api/code/:code/stats', () => {
  it('returns stats for existing code (no query)', async () => {
    const { data } = await postCode({ url: 'https://example.com/stats' });
    const res = await fetch(`${baseUrl}/api/code/${data.code}/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ count: 0 });
    expect(typeof body.count).toBe('number');
  });

  it('counts clicks after redirect', async () => {
    const { data } = await postCode({ url: 'https://example.com/clicked' });
    await fetch(`${baseUrl}/api/code/${data.code}`, { redirect: 'manual' });
    await new Promise((r) => setTimeout(r, 100));
    const res = await fetch(`${baseUrl}/api/code/${data.code}/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ count: 1 });
    expect(typeof body.count).toBe('number');
  });

  it('boundary: month 10 vs month 11', async () => {
    const code = 'b'+Date.now().toString(36).slice(-6);
    const id = await insertCode(code, '2027-01-01T00:00:00.000Z');
    await insertClick(id, '2026-10-31T23:59:59+08:00');
    await insertClick(id, '2026-11-01T00:00:00+08:00');

    const oct = await fetch(`${baseUrl}/api/code/${code}/stats?year=2026&month=10`);
    expect(oct.status).toBe(200);
    expect(await oct.json()).toEqual({ count: 1 });

    const nov = await fetch(`${baseUrl}/api/code/${code}/stats?year=2026&month=11`);
    expect(nov.status).toBe(200);
    expect(await nov.json()).toEqual({ count: 1 });
  });

  it('period=today counts only today clicks', async () => {
    const code = 't'+Date.now().toString(36).slice(-6);
    const id = await insertCode(code, '2027-01-01T00:00:00.000Z');
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    await insertClick(id, now.toISOString());
    await insertClick(id, twoDaysAgo.toISOString());

    const res = await fetch(`${baseUrl}/api/code/${code}/stats?period=today`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 1 });
  });

  it('rejects invalid period', async () => {
    const { data } = await postCode({ url: 'https://example.com/stats4' });
    const res = await fetch(`${baseUrl}/api/code/${data.code}/stats?period=yearly`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'bad request' });
  });

  it('rejects invalid year (below 2026)', async () => {
    const { data } = await postCode({ url: 'https://example.com/stats5' });
    const res = await fetch(`${baseUrl}/api/code/${data.code}/stats?year=2020`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'bad request' });
  });

  it('rejects invalid month', async () => {
    const { data } = await postCode({ url: 'https://example.com/stats6' });
    const res = await fetch(`${baseUrl}/api/code/${data.code}/stats?month=13`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'bad request' });
  });
});
