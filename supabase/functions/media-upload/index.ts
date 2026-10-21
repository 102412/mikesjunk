import { createClient } from 'npm:@supabase/supabase-js@2.108.1';
import jpeg from 'npm:jpeg-js@0.4.4';
import { HttpError, readRequestBytes } from '../_shared/research.mjs';
import { sanitizeJPEG } from '../_shared/media.mjs';
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method !== 'POST') return reply(405, { error: 'POST required.' });
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply(503, { error: 'Upload service is not configured.' });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return reply(401, { error: 'Sign in to upload.' });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply(401, { error: 'Invalid session.' });
  const { data: uploadID, error: quotaError } = await admin.rpc('reserve_upload', { p_user: data.user.id });
  if (quotaError) return reply(429, { error: 'Daily upload limit reached. Try later.' });
  try {
    const bytes = await readRequestBytes(req, 8388608, AbortSignal.timeout(15000));
    const clean = sanitizeJPEG(bytes, jpeg);
    const path = `${data.user.id}/${uploadID}.jpg`;
    const { error: storageError } = await admin.storage.from('post-media').upload(path, clean, { contentType: 'image/jpeg', upsert: false });
    if (storageError) return reply(503, { error: 'Could not store the image.' });
    return reply(200, { url: `${url}/storage/v1/object/public/post-media/${path}` });
  } catch (error) { return reply(error instanceof HttpError ? error.status : 400, { error: error instanceof HttpError ? error.message : 'Image could not be decoded safely. Choose another screenshot.' }); }
});
