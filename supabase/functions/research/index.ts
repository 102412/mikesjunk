import { createClient } from 'npm:@supabase/supabase-js@2.108.1';
import { HttpError, validateInput, searchProvider, buildSources, infer, integer, digest, readRequestBytes } from '../_shared/research.mjs';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async req => {
  if (req.method !== 'POST') return reply(405, { error: 'POST required.' });
  const config = Deno.env.toObject();
  const url = config.SUPABASE_URL;
  const anon = config.SUPABASE_ANON_KEY;
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !serviceKey) return reply(503, { error: 'Backend configuration unavailable.' });
  const header = req.headers.get('Authorization') ?? '';
  if (!/^Bearer \S+$/i.test(header)) return reply(401, { error: 'Sign in to research.' });
  const client = createClient(url, anon, { global: { headers: { Authorization: header } }, auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await client.auth.getUser(header.slice(7));
  if (authError || !auth.user) return reply(401, { error: 'Invalid or expired session.' });
  let usageID: string | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  req.signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const raw = new TextDecoder().decode(await readRequestBytes(req, 12000, controller.signal));
    if (raw.length > 12000) throw new HttpError(413, 'Request too large.');
    let parsed; try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, 'Invalid JSON.'); }
    const input = validateInput(parsed);
    if (!config.GROQ_API_KEY || !(input.media_id ? config.GROQ_VISION_MODEL : config.GROQ_TEXT_MODEL)) throw new HttpError(503, input.media_id ? 'Vision research is not configured.' : 'Groq research is not configured.');
    const { data: reservation, error: limitError } = await admin.rpc('reserve_research', { p_user: auth.user.id, p_daily: integer(config.RESEARCH_DAILY_LIMIT, 30, 1, 200) });
    if (limitError) throw new HttpError(429, 'Research limit reached or quota unavailable. Try later.');
    usageID = reservation;
    // Every content query uses the caller JWT, never the service-role retrieval path.
    const { data: matches, error: retrievalError } = await client.rpc('search_content', { q: input.question }).abortSignal(controller.signal);
    if (retrievalError) throw new HttpError(503, 'Platform search is temporarily unavailable.');
    let internal = matches ?? [];
    let imageURL: string | undefined;
    if (input.post_id) {
      const { data: post, error } = await client.from('posts').select('id,title,body').eq('id', input.post_id).abortSignal(controller.signal).maybeSingle();
      if (error || !post) throw new HttpError(404, 'The attached post is unavailable.');
      internal = [{ ...post, kind: 'post' }, ...internal.filter((r: { id: string }) => r.id !== post.id)];
      if (input.media_id) {
        const { data: image } = await client.from('post_media').select('url,kind').eq('id', input.media_id).eq('post_id', input.post_id).abortSignal(controller.signal).maybeSingle();
        const prefix = url + '/storage/v1/object/public/post-media/';
        if (!image || image.kind !== 'image' || !image.url.startsWith(prefix)) throw new HttpError(400, 'Only attached platform screenshots can be analyzed.');
        imageURL = image.url;
      }
    }
    let external: { title: string; body: string; url: string; provenance: string }[] = [];
    let externalStatus = 'Not requested';
    if (input.external) {
      const provider = searchProvider(config);
      if (!provider) externalStatus = 'Unavailable · search provider is not configured';
      else {
        try { external = await provider.search(input.question, controller.signal); externalStatus = external.length ? 'Retrieved public search snippets' : 'No public results found'; }
        catch { if (controller.signal.aborted) throw new HttpError(504, 'Research timed out.'); externalStatus = 'Unavailable · search provider failed; using platform context only'; }
      }
    }
    const sources = buildSources(internal, external);
    const cacheKey = await digest({ user: auth.user.id, input, sources, model: config.GROQ_TEXT_MODEL, max: config.RESEARCH_MAX_TOKENS });
    if (!imageURL) {
      // Retrieve context before cache lookup: deleted/blocked/changed content changes the key.
      const { data: cached } = await admin.from('research_cache').select('answer').eq('user_id', auth.user.id).eq('cache_key', cacheKey).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (cached) {
        await admin.from('ai_request_usage').update({ status: 'cached' }).eq('id', usageID);
        return reply(200, { ...cached.answer, external_status: externalStatus, cached: true });
      }
    }
    const result = await infer({ question: input.question, sources, imageURL, config, signal: controller.signal });
    const response = { answer: result.answer, sources: sources.map(({ body: _body, ...source }) => source), external_status: externalStatus, cached: false };
    await admin.from('ai_request_usage').update({ status: 'completed', token_count: result.tokens }).eq('id', usageID);
    if (!imageURL) {
      await admin.from('research_cache').delete().lt('expires_at', new Date().toISOString());
      await admin.from('research_cache').upsert({ user_id: auth.user.id, cache_key: cacheKey, answer: response, expires_at: new Date(Date.now() + 5 * 60000).toISOString() });
    }
    return reply(200, response);
  } catch (error) {
    if (usageID) await admin.from('ai_request_usage').update({ status: controller.signal.aborted ? 'timeout' : 'failed' }).eq('id', usageID);
    if (controller.signal.aborted) return reply(504, { error: 'Research timed out. Please try again.' });
    return reply(error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : 'Research could not complete. Please try again.' });
  } finally { clearTimeout(timeout); }
});
