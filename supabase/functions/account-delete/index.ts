import { createClient } from 'npm:@supabase/supabase-js@2.108.1';
const reply = (status: number, error?: string) => new Response(JSON.stringify(error ? { error } : { deleted: true }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async req => {
  if (req.method !== 'POST') return reply(405, 'POST required.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!url || !key) return reply(503, 'Backend is not configured.');
  if (!token) return reply(401, 'Sign in to delete your account.');
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return reply(401, 'Invalid session.');
  // Only the caller's UUID is used. No target user identifier is accepted from the body.
  // Batches use offset zero because each batch is deleted. Flat UUID/image names only.
  for (let batch = 0; batch < 20; batch++) {
    const { data: files, error: listError } = await admin.storage.from('post-media').list(data.user.id, { limit: 100, offset: 0 });
    if (listError) return reply(503, 'Media cleanup failed. Account retained; retry deletion.');
    if (!files?.length) break;
    const { error: removeError } = await admin.storage.from('post-media').remove(files.map(file => `${data.user!.id}/${file.name}`));
    if (removeError) return reply(503, 'Media cleanup failed. Account retained; retry deletion.');
    if (batch === 19) return reply(503, 'Media cleanup in progress. Retry deletion.');
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return reply(503, 'Account deletion failed. Please retry.');
  return reply(200);
});
