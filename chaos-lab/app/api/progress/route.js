import { auth } from '@clerk/nextjs/server';
import { BlobError, get, put } from '@vercel/blob';
import { encodeProgress, mergeProgress, restoreProgress } from '../../../src/lessons.js';

export const runtime = 'nodejs';
const maxBytes = 1024 * 1024;
const cacheHeaders = { 'Cache-Control': 'no-store' };

function pathname(userId) {
  return `little-circuit/progress/${encodeURIComponent(userId)}.json`;
}

function validProgress(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && value.version === 5 &&
    Array.isArray(value.completed) && value.completed.every(id => typeof id === 'string') &&
    value.boards && typeof value.boards === 'object' && !Array.isArray(value.boards) &&
    (!('sandboxSlots' in value) || value.sandboxSlots === null || (typeof value.sandboxSlots === 'object' && !Array.isArray(value.sandboxSlots) && Array.isArray(value.sandboxSlots.slots))) &&
    (!('lastLevel' in value) || value.lastLevel === null || typeof value.lastLevel === 'string') &&
    (!('unlockAll' in value) || typeof value.unlockAll === 'boolean') &&
    (!('updatedAt' in value) || (typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)));
}

function canonicalProgress(value) {
  if (!validProgress(value)) return null;
  const { completed, boards, sandboxSlots, lastLevel, unlockAll, updatedAt } = restoreProgress(value);
  return encodeProgress(completed, boards, sandboxSlots, { lastLevel, unlockAll, updatedAt });
}

function storageUnavailable(error) {
  if (!(error instanceof BlobError)) throw error;
  console.error('Vercel Blob progress storage request failed.', error.message);
  return Response.json({ error: 'Cloud progress storage is unavailable.' }, { status: 503, headers: cacheHeaders });
}

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  const xfHost = request.headers.get('x-forwarded-host');
  if (xfHost) {
    const xfProto = request.headers.get('x-forwarded-proto') || 'https';
    allowed.add(`${xfProto}://${xfHost}`);
  }
  return allowed.has(origin);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in to load cloud progress.' }, { status: 401, headers: cacheHeaders });
  let blob;
  try {
    blob = await get(pathname(userId), { access: 'private', useCache: false });
  } catch (error) {
    return storageUnavailable(error);
  }
  if (!blob) return Response.json({ progress: null }, { headers: cacheHeaders });
  if (blob.statusCode !== 200 || !blob.stream || blob.blob.size > maxBytes) {
    return Response.json({ error: 'Stored progress is invalid.' }, { status: 500, headers: cacheHeaders });
  }
  const text = await new Response(blob.stream).text();
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: 'Stored progress is unreadable.' }, { status: 500, headers: cacheHeaders });
    throw error;
  }
  const progress = canonicalProgress(raw);
  if (!progress) return Response.json({ error: 'Stored progress has an unsupported format.' }, { status: 500, headers: cacheHeaders });
  return Response.json({ progress }, { headers: cacheHeaders });
}

export async function PUT(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in to save cloud progress.' }, { status: 401, headers: cacheHeaders });
  if (!isSameOrigin(request)) return Response.json({ error: 'Same-origin requests only.' }, { status: 403, headers: cacheHeaders });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'Expected JSON.' }, { status: 415, headers: cacheHeaders });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) return Response.json({ error: 'Progress payload is too large.' }, { status: 413, headers: cacheHeaders });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return Response.json({ error: 'Progress payload is too large.' }, { status: 413, headers: cacheHeaders });
  let input;
  try {
    input = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: 'Invalid JSON.' }, { status: 400, headers: cacheHeaders });
    throw error;
  }
  if (input?.userId !== userId) return Response.json({ error: 'Account mismatch.' }, { status: 403, headers: cacheHeaders });
  const skipMerge = input?.skipMerge === true;
  const progress = canonicalProgress(input.progress);
  if (!progress) return Response.json({ error: 'Invalid progress format.' }, { status: 400, headers: cacheHeaders });

  let toSave = progress;
  if (!skipMerge) {
    // Merge monotonically against any existing server blob so stale tabs never overwrite newer completions
    let existingProgress = null;
    try {
      const existing = await get(pathname(userId), { access: 'private', useCache: false });
      if (existing?.statusCode === 200 && existing.stream && existing.blob.size <= maxBytes) {
        const rawExisting = JSON.parse(await new Response(existing.stream).text());
        existingProgress = canonicalProgress(rawExisting);
      }
    } catch (error) {
      if (error instanceof BlobError) return storageUnavailable(error);
    }
    toSave = existingProgress ? mergeProgress(existingProgress, progress) : progress;
  }

  try {
    await put(pathname(userId), JSON.stringify(toSave), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0 });
  } catch (error) {
    return storageUnavailable(error);
  }
  return Response.json(
    skipMerge ? { saved: true, updatedAt: toSave.updatedAt } : { saved: true, progress: toSave },
    { headers: cacheHeaders }
  );
}
