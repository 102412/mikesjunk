import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const c = '00000000-0000-4000-8000-000000000003';
const p = '00000000-0000-4000-8000-000000000010';
async function user(id, action) {
  return db.transaction(async tx => {
    await tx.exec('SET LOCAL ROLE authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    return action(tx);
  });
}
test('migration executes against PostgreSQL and RLS enforces social permissions', async t => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    grant usage on schema public,auth,storage to authenticated,anon,service_role;
    grant execute on function auth.uid() to authenticated,anon,service_role;
    grant select,insert,delete on storage.objects to authenticated;
  `);
  // PGlite includes gen_random_uuid natively, but does not bundle the pgcrypto extension.
  const migration = (await readFile(new URL('../supabase/migrations/202610210001_initial.sql', import.meta.url), 'utf8')).replace('create extension if not exists pgcrypto;', '');
  await db.exec(migration);
  await db.query('insert into auth.users values ($1),($2),($3)', [a,b,c]);
  await db.query("insert into profiles(id,username,display_name) values ($1,'alice','Alice'),($2,'bob','Bob'),($3,'carol','Carol')", [a,b,c]);
  await user(a, tx => tx.query("insert into posts(id,author_id,kind,title,body) values($1,$2,'discussion','SwiftUI journal','Built with SwiftUI')", [p,a]));
  await t.test('other users can read public posts but cannot impersonate authors', async () => {
    const read = await user(b, tx => tx.query('select * from posts')); assert.equal(read.rows.length, 1);
    await assert.rejects(user(b, tx => tx.query("insert into posts(author_id,kind,title,body) values($1,'discussion','Fake','Fake')", [a])), /row-level security/);
    const removed = await user(b, tx => tx.query('delete from posts where id=$1 returning id', [p])); assert.equal(removed.rows.length, 0);
  });
  await t.test('showcases require media even when bypassing publish RPC', async () => {
    await assert.rejects(user(a, tx => tx.query("insert into posts(author_id,kind,title,body) values($1,'application','App','Missing media')", [a])), /require media/);
  });
  await t.test('likes are unique and saves and reports are private', async () => {
    await user(b, tx => tx.query('insert into likes values($1,$2)', [p,b]));
    await assert.rejects(user(b, tx => tx.query('insert into likes values($1,$2)', [p,b])), /unique constraint/);
    await user(b, tx => tx.query('insert into saves values($1,$2)', [p,b]));
    assert.equal((await user(a, tx => tx.query('select * from saves'))).rows.length, 0);
    await user(b, tx => tx.query("insert into reports(reporter_id,post_id,reason) values($1,$2,'Spam')", [b,p]));
    assert.equal((await user(b, tx => tx.query('select * from reports'))).rows.length, 0);
    await assert.rejects(user(a, tx => tx.query("insert into reports(reporter_id,post_id,reason,status) values($1,$2,'Fake','resolved')", [a,p])), /row-level security/);
  });
  await t.test('blocking is symmetric across feeds, search, profiles, and interactions', async () => {
    await user(b, tx => tx.query('insert into blocks(blocker_id,blocked_id) values($1,$2)', [b,a]));
    for (const [viewer, hidden] of [[b,a],[a,b]]) {
      assert.equal((await user(viewer, tx => tx.query('select * from profiles where id=$1', [hidden]))).rows.length, 0);
    }
    assert.equal((await user(b, tx => tx.query('select * from posts'))).rows.length, 0);
    assert.equal((await user(b, tx => tx.query("select * from search_content('SwiftUI')"))).rows.length, 0);
    await assert.rejects(user(b, tx => tx.query('insert into follows(follower_id,following_id) values($1,$2)', [b,a])), /row-level security/);
    await assert.rejects(user(b, tx => tx.query("insert into comments(post_id,author_id,body) values($1,$2,'Blocked')", [p,b])), /row-level security/);
    await user(b, tx => tx.query('delete from blocks where blocker_id=$1 and blocked_id=$2', [b,a]));
    assert.ok((await user(b, tx => tx.query("select * from search_content('SwiftUI')"))).rows.length > 0);
  });
  await t.test('publish RPC creates media transactionally and rejects unowned uploads', async () => {
    const id = '00000000-0000-4000-8000-000000000011';
    const post = { id, kind: 'application', title: 'Journal', body: 'A calm app', status: 'Launched', tools: [], stack: [], features: [], commit_urls: [] };
    await assert.rejects(user(a, tx => tx.query('select publish_post($1::jsonb,$2::text[])', [JSON.stringify(post), ['https://project.supabase.co/storage/v1/object/public/post-media/' + b + '/fake.jpg']])), /row-level security/);
    assert.equal((await db.query('select * from posts where id=$1', [id])).rows.length, 0);
    await db.query("insert into storage.objects(bucket_id,name) values('post-media',$1)", [a + '/test.jpg']);
    await user(a, tx => tx.query('select publish_post($1::jsonb,$2::text[])', [JSON.stringify(post), ['https://project.supabase.co/storage/v1/object/public/post-media/' + a + '/test.jpg']]));
    assert.equal((await user(b, tx => tx.query('select * from post_media'))).rows.length, 1);
  });
  await t.test('moderation flags cannot be changed by owners', async () => {
    await assert.rejects(user(a, tx => tx.query('update profiles set removed_at=now() where id=$1', [a])), /Protected|security/);
    await db.query('update posts set removed_at=now() where id=$1', [p]);
    assert.equal((await user(a, tx => tx.query('select * from posts where id=$1', [p]))).rows.length, 0);
  });
  await t.test('quota cannot be invoked by clients and limits are enforced', async () => {
    await assert.rejects(user(a, tx => tx.query('select reserve_research($1,2)', [a])), /permission denied/);
    await db.query('select reserve_research($1,2)', [a]); await db.query('select reserve_research($1,2)', [a]);
    await assert.rejects(db.query('select reserve_research($1,2)', [a]), /limit reached/);
    await assert.rejects(user(a, tx => tx.query("insert into ai_request_usage(user_id) values($1)", [a])), /permission denied/);
  });
  await t.test('uploads reject direct storage writes and enforce daily reservations', async () => {
    await assert.rejects(user(a, tx => tx.query("insert into storage.objects(bucket_id,name) values('post-media',$1)", [a + '/bypass.jpg'])), /row-level security/);
    await assert.rejects(user(a, tx => tx.query('select reserve_upload($1)', [a])), /permission denied/);
    await db.query('select reserve_upload($1)', [a]);
    await db.query("insert into media_upload_usage(user_id) select $1 from generate_series(1,59)", [a]);
    await assert.rejects(db.query('select reserve_upload($1)', [a]), /upload limit/);
  });
  await t.test('removed media cannot break a published application', async () => {
    assert.equal((await user(a, tx => tx.query('delete from post_media returning id'))).rows.length, 0);
    assert.equal((await user(a, tx => tx.query("delete from storage.objects where name=$1 returning id", [a + '/test.jpg']))).rows.length, 0);
  });
  await t.test('account deletion cascades authored data', async () => {
    await db.query('delete from auth.users where id=$1', [a]);
    for (const table of ['posts','post_media','likes','saves','ai_request_usage']) assert.equal((await db.query(`select * from ${table}`)).rows.length, 0, table);
  });
  await db.close();
});
