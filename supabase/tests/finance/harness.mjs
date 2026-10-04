import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const migrationsDir = fileURLToPath(new URL("../../migrations", import.meta.url));

export async function createDb({ only } = {}) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create schema if not exists auth;
    create schema if not exists storage;
    create table if not exists auth.users(id uuid primary key, email text);
    create table if not exists storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
    alter table storage.objects enable row level security;
    create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    create or replace function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)] $$;
    grant usage on schema storage to anon, authenticated, service_role;
    create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
    create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
    create publication supabase_realtime;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
  `);
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort().filter((f) => !only || only(f));
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    try { await db.exec(sql); console.log("OK  ", file); }
    catch (error) { console.log("FAIL", file, error.message, error.position ?? ""); process.exit(1); }
  }
  await db.exec(`grant usage on schema public, private to authenticated, service_role; grant select, insert, update, delete on all tables in schema public to authenticated, service_role; grant usage, select on all sequences in schema public to authenticated, service_role;`);
  return db;
}

if (process.argv[2] === "run") { const db = await createDb(); await db.close(); }
