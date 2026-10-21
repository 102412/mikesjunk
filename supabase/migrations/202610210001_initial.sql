-- Xpres.ai V1. Run through the Supabase migration CLI, never in the iOS client.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
 display_name text not null check (length(display_name) between 1 and 80),
 bio text not null default '' check (length(bio) <= 1000),
 tier text not null default 'lite' check (tier in ('lite','pro','superuser')),
 tools text[] not null default '{}', interests text[] not null default '{}',
 avatar_url text check (avatar_url is null or avatar_url ~ '^https://[^/@[:space:]]+'),
 created_at timestamptz not null default now(), removed_at timestamptz
);
create table public.user_interests (
 user_id uuid references public.profiles on delete cascade, interest text check (length(interest) between 1 and 80), primary key(user_id,interest)
);
create table public.blocks (
 blocker_id uuid references public.profiles on delete cascade, blocked_id uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id)
);
create index blocks_reverse on public.blocks(blocked_id,blocker_id);
create table public.follows (
 follower_id uuid references public.profiles on delete cascade, following_id uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id <> following_id)
);
create index follows_reverse on public.follows(following_id,follower_id);
create table public.projects (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles on delete cascade,
 name text not null check(length(name) between 1 and 120), description text not null check(length(description) between 1 and 5000),
 cover_url text, screenshots text[] not null default '{}', video_url text,
 status text not null default 'In development' check(status in ('In development','Looking for testers','Launched')),
 stack text[] not null default '{}', tools text[] not null default '{}', website_url text, repository_url text,
 created_at timestamptz not null default now(), removed_at timestamptz,
 check(website_url is null or website_url = '' or website_url ~ '^https://[^/@[:space:]]+'),
 check(repository_url is null or repository_url = '' or repository_url ~ '^https://[^/@[:space:]]+')
);
create table public.resources (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles on delete cascade,
 title text not null check(length(title) between 1 and 120), description text not null check(length(description) between 1 and 5000),
 category text not null check(category in ('Claude Skills','Codex Resources','MCP Servers','Agent Configurations','Other Resources')),
 tools text[] not null default '{}', repository_url text not null check(repository_url ~ '^https://[^/@[:space:]]+'),
 documentation_url text check(documentation_url is null or documentation_url = '' or documentation_url ~ '^https://[^/@[:space:]]+'),
 version text not null check(length(version) between 1 and 40), screenshots text[] not null default '{}',
 created_at timestamptz not null default now(), removed_at timestamptz
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles on delete cascade,
 project_id uuid references public.projects on delete set null, resource_id uuid references public.resources on delete set null,
 kind text not null check(kind in ('application','progress','resource','discussion','session')),
 title text not null check(length(trim(title)) between 1 and 120), body text not null check(length(trim(body)) between 1 and 5000),
 tools text[] not null default '{}', stack text[] not null default '{}', status text not null default 'In development',
 website_url text, repository_url text, duration_minutes integer check(duration_minutes between 1 and 1440),
 features text[] not null default '{}', commit_urls text[] not null default '{}',
 created_at timestamptz not null default now(), removed_at timestamptz,
 check(website_url is null or website_url = '' or website_url ~ '^https://[^/@[:space:]]+'),
 check(repository_url is null or repository_url = '' or repository_url ~ '^https://[^/@[:space:]]+'),
 check(kind <> 'session' or duration_minutes is not null)
);
create table public.post_media (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts on delete cascade,
 url text not null check(url ~ '^https://[^/@[:space:]]+'), kind text not null default 'image' check(kind in ('image','video')),
 position integer not null check(position between 0 and 5), unique(post_id,position)
);
create table public.project_updates (
 project_id uuid references public.projects on delete cascade, post_id uuid references public.posts on delete cascade,
 primary key(project_id,post_id)
);
create table public.comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000), created_at timestamptz not null default now(), removed_at timestamptz
);
create table public.likes (post_id uuid references public.posts on delete cascade, user_id uuid references public.profiles on delete cascade, primary key(post_id,user_id));
create table public.saves (post_id uuid references public.posts on delete cascade, user_id uuid references public.profiles on delete cascade, primary key(post_id,user_id));
create table public.resource_saves (resource_id uuid references public.resources on delete cascade, user_id uuid references public.profiles on delete cascade, primary key(resource_id,user_id));
create table public.resource_reviews (
 id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.resources on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,
 rating integer not null check(rating between 1 and 5), body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now(), removed_at timestamptz, unique(resource_id,author_id)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles on delete cascade,
 post_id uuid references public.posts on delete cascade, profile_id uuid references public.profiles on delete cascade,
 reason text not null check(length(trim(reason)) between 1 and 1000), status text not null default 'open' check(status in ('open','resolved','dismissed')),
 created_at timestamptz not null default now(), check(num_nonnulls(post_id,profile_id)=1)
);
create table public.ai_request_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now(), status text not null default 'reserved', token_count integer not null default 0
);
create index usage_window on public.ai_request_usage(user_id,created_at desc);
-- Cached answers are user-scoped and short lived. No question text is retained.
create table public.research_cache (
 user_id uuid references public.profiles on delete cascade, cache_key text not null, answer jsonb not null,
 expires_at timestamptz not null, primary key(user_id,cache_key)
);
create index posts_page on public.posts(created_at desc,id desc) where removed_at is null;
create index posts_author on public.posts(author_id,created_at desc);
create index posts_project on public.posts(project_id);
create index media_post on public.post_media(post_id);
create index comments_post on public.comments(post_id,created_at);
create index projects_creator on public.projects(creator_id);
create index resources_creator on public.resources(creator_id);
create index reports_open on public.reports(created_at) where status='open';
create index post_search on public.posts using gin(to_tsvector('english',title || ' ' || body));
create index project_search on public.projects using gin(to_tsvector('english',name || ' ' || description));
create index resource_search on public.resources using gin(to_tsvector('english',title || ' ' || description));

-- Security-definer predicates are narrowly scoped; they prevent recursive block/profile policies.
create function public.can_view_actor(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles p where p.id=actor and p.removed_at is null)
 and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=actor) or (b.blocker_id=actor and b.blocked_id=auth.uid()));
$$;
create function public.can_view_post(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.posts p where p.id=target and p.removed_at is null and public.can_view_actor(p.author_id));
$$;
create function public.can_view_resource(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.resources r where r.id=target and r.removed_at is null and public.can_view_actor(r.creator_id));
$$;
create function public.owns_post(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.posts p where p.id=target and p.author_id=auth.uid() and p.removed_at is null);
$$;

alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(public.can_view_actor(id));
create policy profile_insert on public.profiles for insert to authenticated with check(id=auth.uid() and removed_at is null);
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid() and removed_at is null) with check(id=auth.uid() and removed_at is null);
alter table public.blocks enable row level security;
create policy block_read on public.blocks for select to authenticated using(blocker_id=auth.uid());
create policy block_add on public.blocks for insert to authenticated with check(blocker_id=auth.uid());
create policy block_remove on public.blocks for delete to authenticated using(blocker_id=auth.uid());
alter table public.follows enable row level security;
create policy follow_read on public.follows for select to authenticated using(public.can_view_actor(follower_id) and public.can_view_actor(following_id));
create policy follow_add on public.follows for insert to authenticated with check(follower_id=auth.uid() and public.can_view_actor(following_id));
create policy follow_remove on public.follows for delete to authenticated using(follower_id=auth.uid());
alter table public.user_interests enable row level security;
create policy interests_owner on public.user_interests for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.projects enable row level security;
create policy project_read on public.projects for select to authenticated using(removed_at is null and public.can_view_actor(creator_id));
create policy project_add on public.projects for insert to authenticated with check(creator_id=auth.uid() and removed_at is null);
create policy project_edit on public.projects for update to authenticated using(creator_id=auth.uid() and removed_at is null) with check(creator_id=auth.uid() and removed_at is null);
create policy project_remove on public.projects for delete to authenticated using(creator_id=auth.uid());
alter table public.resources enable row level security;
create policy resource_read on public.resources for select to authenticated using(removed_at is null and public.can_view_actor(creator_id));
create policy resource_add on public.resources for insert to authenticated with check(creator_id=auth.uid() and removed_at is null);
create policy resource_edit on public.resources for update to authenticated using(creator_id=auth.uid() and removed_at is null) with check(creator_id=auth.uid() and removed_at is null);
create policy resource_remove on public.resources for delete to authenticated using(creator_id=auth.uid());
alter table public.posts enable row level security;
create policy post_read on public.posts for select to authenticated using(removed_at is null and public.can_view_actor(author_id));
create policy post_add on public.posts for insert to authenticated with check(author_id=auth.uid() and removed_at is null and (project_id is null or exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid())) and (resource_id is null or exists(select 1 from public.resources r where r.id=resource_id and r.creator_id=auth.uid())));
-- Post edits intentionally go through a future versioned endpoint; V1 allows deletion only.
create policy post_remove on public.posts for delete to authenticated using(author_id=auth.uid());
alter table public.post_media enable row level security;
create policy media_read on public.post_media for select to authenticated using(public.can_view_post(post_id));
create policy media_add on public.post_media for insert to authenticated with check(public.owns_post(post_id) and kind='image' and exists(select 1 from storage.objects o where o.bucket_id='post-media' and o.name=split_part(url,'/storage/v1/object/public/post-media/',2) and (storage.foldername(o.name))[1]=auth.uid()::text));
-- Media removals only via parent deletion to preserve showcase constraints.
alter table public.project_updates enable row level security;
create policy update_read on public.project_updates for select to authenticated using(public.can_view_post(post_id));
create policy update_add on public.project_updates for insert to authenticated with check(public.owns_post(post_id) and exists(select 1 from public.projects p where p.id=project_id and p.creator_id=auth.uid()));
alter table public.comments enable row level security;
create policy comment_read on public.comments for select to authenticated using(removed_at is null and public.can_view_post(post_id) and public.can_view_actor(author_id));
create policy comment_add on public.comments for insert to authenticated with check(author_id=auth.uid() and removed_at is null and public.can_view_post(post_id));
create policy comment_remove on public.comments for delete to authenticated using(author_id=auth.uid());
alter table public.likes enable row level security;
create policy like_read on public.likes for select to authenticated using(public.can_view_post(post_id) and public.can_view_actor(user_id));
create policy like_add on public.likes for insert to authenticated with check(user_id=auth.uid() and public.can_view_post(post_id));
create policy like_remove on public.likes for delete to authenticated using(user_id=auth.uid());
alter table public.saves enable row level security;
create policy save_owner on public.saves for all to authenticated using(user_id=auth.uid() and public.can_view_post(post_id)) with check(user_id=auth.uid() and public.can_view_post(post_id));
alter table public.resource_saves enable row level security;
create policy resource_save_owner on public.resource_saves for all to authenticated using(user_id=auth.uid() and public.can_view_resource(resource_id)) with check(user_id=auth.uid() and public.can_view_resource(resource_id));
alter table public.resource_reviews enable row level security;
create policy review_read on public.resource_reviews for select to authenticated using(removed_at is null and public.can_view_resource(resource_id) and public.can_view_actor(author_id));
create policy review_add on public.resource_reviews for insert to authenticated with check(author_id=auth.uid() and removed_at is null and public.can_view_resource(resource_id));
create policy review_edit on public.resource_reviews for update to authenticated using(author_id=auth.uid() and removed_at is null) with check(author_id=auth.uid() and removed_at is null and public.can_view_resource(resource_id));
create policy review_remove on public.resource_reviews for delete to authenticated using(author_id=auth.uid());
alter table public.reports enable row level security;
create policy report_add on public.reports for insert to authenticated with check(reporter_id=auth.uid() and status='open');
-- No client SELECT/UPDATE policy for reports. Service role is the initial moderator interface.
alter table public.ai_request_usage enable row level security;
alter table public.research_cache enable row level security;

-- Protect moderation flags and ownership even on tables that allow profile/detail edits.
create function public.protect_owned_fields() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user not in ('postgres','service_role','supabase_admin') then
   if to_jsonb(new)->'removed_at' is distinct from to_jsonb(old)->'removed_at'
      or to_jsonb(new)->'created_at' is distinct from to_jsonb(old)->'created_at'
      or to_jsonb(new)->'creator_id' is distinct from to_jsonb(old)->'creator_id'
      or to_jsonb(new)->'author_id' is distinct from to_jsonb(old)->'author_id'
      or to_jsonb(new)->'resource_id' is distinct from to_jsonb(old)->'resource_id' then
      raise exception 'Protected fields cannot be changed';
   end if;
 end if;
 return new;
end $$;
create trigger profile_protect before update on public.profiles for each row execute function public.protect_owned_fields();
create trigger project_protect before update on public.projects for each row execute function public.protect_owned_fields();
create trigger resource_protect before update on public.resources for each row execute function public.protect_owned_fields();
create trigger review_protect before update on public.resource_reviews for each row execute function public.protect_owned_fields();

-- Deferred constraint: an application can never commit without media, including direct REST inserts.
create function public.require_showcase_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.posts p where p.id=new.id and p.kind='application' and not exists(select 1 from public.post_media m where m.post_id=p.id)) then
   raise exception 'Application showcases require media';
 end if; return new;
end $$;
create constraint trigger showcase_media after insert or update on public.posts deferrable initially deferred for each row execute function public.require_showcase_media();

-- Basic spam limits serialize per user so concurrent requests cannot bypass counts.
create function public.limit_content() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; total integer; max_count integer;
begin
 actor := auth.uid(); if actor is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text || tg_table_name,0));
 if tg_table_name='posts' then select count(*) into total from public.posts where author_id=actor and created_at>now()-interval '1 hour'; max_count:=20;
 elsif tg_table_name='comments' then select count(*) into total from public.comments where author_id=actor and created_at>now()-interval '1 hour'; max_count:=60;
 elsif tg_table_name='reports' then select count(*) into total from public.reports where reporter_id=actor and created_at>now()-interval '1 hour'; max_count:=20;
 end if;
 if total>=max_count then raise exception 'Too many submissions. Try again later.'; end if;
 new.created_at:=now(); return new;
end $$;
create trigger limit_posts before insert on public.posts for each row execute function public.limit_content();
create trigger limit_comments before insert on public.comments for each row execute function public.limit_content();
create trigger limit_reports before insert on public.reports for each row execute function public.limit_content();

create function public.publish_post(p_post jsonb, p_media text[], p_project jsonb default null, p_resource jsonb default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare pid uuid; item text; ordinal integer:=0;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if cardinality(p_media)>6 then raise exception 'At most six images'; end if;
 if p_project is not null then
 insert into public.projects(id,creator_id,name,description,cover_url,screenshots,status,tools,stack,website_url,repository_url)
 values((p_project->>'id')::uuid,auth.uid(),p_project->>'name',p_project->>'description',p_project->>'cover_url',p_media,p_project->>'status',array(select jsonb_array_elements_text(p_project->'tools')),array(select jsonb_array_elements_text(p_project->'stack')),p_project->>'website_url',p_project->>'repository_url');
 end if;
 if p_resource is not null then
 insert into public.resources(id,creator_id,title,description,category,tools,repository_url,documentation_url,version,screenshots)
 values((p_resource->>'id')::uuid,auth.uid(),p_resource->>'title',p_resource->>'description',p_resource->>'category',array(select jsonb_array_elements_text(p_resource->'tools')),p_resource->>'repository_url',p_resource->>'documentation_url',p_resource->>'version',p_media);
 end if;
 pid:=(p_post->>'id')::uuid;
 insert into public.posts(id,author_id,project_id,resource_id,kind,title,body,tools,stack,status,website_url,repository_url,duration_minutes,features,commit_urls)
 values(pid,auth.uid(),(p_post->>'project_id')::uuid,(p_post->>'resource_id')::uuid,p_post->>'kind',p_post->>'title',p_post->>'body',array(select jsonb_array_elements_text(p_post->'tools')),array(select jsonb_array_elements_text(p_post->'stack')),p_post->>'status',p_post->>'website_url',p_post->>'repository_url',(p_post->>'duration_minutes')::integer,array(select jsonb_array_elements_text(p_post->'features')),array(select jsonb_array_elements_text(p_post->'commit_urls')));
 foreach item in array p_media loop
 insert into public.post_media(post_id,url,kind,position) values(pid,item,'image',ordinal); ordinal:=ordinal+1;
 end loop;
 if p_post->>'project_id' is not null then insert into public.project_updates values((p_post->>'project_id')::uuid,pid); end if;
 return pid;
end $$;

-- Retrieval is SECURITY INVOKER: block and removal policies apply before context leaves Postgres.
create function public.search_content(q text) returns table(id uuid,title text,body text,kind text) language sql stable security invoker set search_path='' as $$
 select p.id,p.title,p.body,'post'::text from public.posts p where to_tsvector('english',p.title || ' ' || p.body) @@ websearch_to_tsquery('english',left(q,2000))
 union all select p.id,p.name,p.description,'project'::text from public.projects p where to_tsvector('english',p.name || ' ' || p.description) @@ websearch_to_tsquery('english',left(q,2000))
 union all select r.id,r.title,r.description,'resource'::text from public.resources r where to_tsvector('english',r.title || ' ' || r.description) @@ websearch_to_tsquery('english',left(q,2000))
 union all select p.id,p.display_name,p.bio,'profile'::text from public.profiles p where to_tsvector('english',p.display_name || ' ' || p.bio) @@ websearch_to_tsquery('english',left(q,2000))
 union all select c.id,'Discussion comment',c.body,'comment'::text from public.comments c where to_tsvector('english',c.body) @@ websearch_to_tsquery('english',left(q,2000))
 limit 12;
$$;
-- Only the authenticated Edge Function (service role) may reserve quota or read cache.
create function public.reserve_research(p_user uuid,p_daily integer default 30) returns uuid language plpgsql security definer set search_path='' as $$
declare total integer; minute_count integer; result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from public.profiles where id=p_user and removed_at is null) then raise exception 'Profile unavailable'; end if;
 select count(*),count(*) filter(where created_at>now()-interval '1 minute') into total,minute_count from public.ai_request_usage where user_id=p_user and created_at>now()-interval '24 hours';
 if total>=least(greatest(p_daily,1),200) or minute_count>=5 then raise exception 'Research limit reached. Try later.'; end if;
 insert into public.ai_request_usage(user_id) values(p_user) returning id into result;
 return result;
end $$;

-- Storage rejects unsupported content types and limits each object. Object names are user scoped.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('post-media','post-media',true,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy media_upload on storage.objects for insert to authenticated with check(bucket_id='post-media' and (storage.foldername(name))[1]=auth.uid()::text and public.can_view_actor(auth.uid()));
create policy media_delete on storage.objects for delete to authenticated using(bucket_id='post-media' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.post_media m where split_part(m.url,'/storage/v1/object/public/post-media/',2)=name));
create policy media_owner_list on storage.objects for select to authenticated using(bucket_id='post-media' and (storage.foldername(name))[1]=auth.uid()::text);
-- Public bucket URLs are intentionally public and not a privacy boundary. See README.

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke all on public.ai_request_usage,public.research_cache from authenticated;
grant all on all tables in schema public to service_role;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.can_view_actor(uuid),public.can_view_post(uuid),public.can_view_resource(uuid),public.owns_post(uuid),public.publish_post(jsonb,text[],jsonb,jsonb),public.search_content(text) to authenticated;
grant execute on function public.reserve_research(uuid,integer) to service_role;

-- All authenticated image uploads pass through the decoder/re-encoder Edge Function.
drop policy media_upload on storage.objects;
create table public.media_upload_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 created_at timestamptz not null default now()
);
create index media_usage_window on public.media_upload_usage(user_id,created_at desc);
alter table public.media_upload_usage enable row level security;
grant all on public.media_upload_usage to service_role;
create function public.reserve_upload(p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare total integer; result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text || 'upload',0));
 if not exists(select 1 from public.profiles where id=p_user and removed_at is null) then raise exception 'Profile unavailable'; end if;
 select count(*) into total from public.media_upload_usage where user_id=p_user and created_at>now()-interval '24 hours';
 if total>=60 then raise exception 'Daily upload limit reached'; end if;
 insert into public.media_upload_usage(user_id) values(p_user) returning id into result;
 return result;
end $$;
revoke execute on function public.reserve_upload(uuid) from public,anon,authenticated;
grant execute on function public.reserve_upload(uuid) to service_role;

create function public.profile_counts(target uuid) returns table(follower_count bigint,following_count bigint)
language sql stable security invoker set search_path='' as $$
 select (select count(*) from public.follows where following_id=target),
        (select count(*) from public.follows where follower_id=target)
 where public.can_view_actor(target);
$$;
revoke execute on function public.profile_counts(uuid) from public,anon;
grant execute on function public.profile_counts(uuid) to authenticated;
