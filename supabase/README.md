# Luminex Energy Solutions — Backend Setup (Supabase)

The website reads all business content from Supabase (PostgreSQL + Auth + Storage).
Until Supabase is connected, the public website renders the built-in default content
and the Admin Portal shows a configuration notice (no fake login exists).

## 1. Create a Supabase project
https://supabase.com → New project.

## 2. Run the schema
Open **SQL Editor** and run the full contents of `supabase/schema.sql`.
This creates all tables, Row Level Security policies, the `media` storage bucket and seed settings.

## 2a. Video uploads (MP4 / WebM / MOV / MKV / AVI / …)
The `media` bucket only stores the file types listed in `allowed_mime_types`.
If an MP4 upload fails with `mime type video/mp4 is not supported`, the bucket
was created from an older schema version. Run `supabase/fix-media-bucket.sql`
once - it updates the existing bucket (no new bucket is created) so that
`video/mp4`, `video/x-m4v`, `video/quicktime`, `video/webm`, `video/x-matroska`,
`video/x-msvideo`, `video/mpeg`, `video/3gpp`, `video/x-ms-wmv` and
`video/x-flv` are accepted alongside the image types and PDF.
The bucket size limit is 50 MB, which is the maximum the platform accepts for
this project (`file_size_limit` above 52428800 is rejected with
`413 Payload too large`, and a resumable upload above it is rejected with
`Maximum size exceeded`), so video uploads are capped at 50 MB in the admin
portal as well. Larger files need a bigger project plan.

The upload allow-list in `src/utils/media.ts` is kept in sync with that bucket
configuration, and every uploaded file is identified by its magic bytes rather
than by the browser supplied MIME type. Files of 4 MB or more are uploaded with
the storage provider's resumable protocol, so an interrupted connection only
restarts the current chunk.

## 3. Configure environment variables
Create a `.env` file in the project root (never commit it):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # the public "anon" key only
```

Never put the `service_role` key in the frontend. The anon key is safe to expose because
every table is protected by Row Level Security — only users listed in `admin_users` can write.

## 4. Create the administrator (no credentials in code)
1. Supabase → **Authentication → Users → Add user** (email + strong password, "Auto confirm").
2. Copy the user's UUID, then in the SQL Editor:

```sql
insert into public.admin_users (user_id, email)
values ('PASTE-USER-UUID-HERE', 'admin@example.com');
```

Only users present in `admin_users` can access `/#/admin`. Anyone else is signed out automatically.

## 5. First-time content
Log in at `/#/admin`:
- **Services** → "Import defaults into database" (then edit freely)
- **FAQs** → "Import defaults into database"
- **Homepage / Website Content / Contact / Social / SEO** → review and Save

Every save is immediately reflected across the whole website (header, footer, WhatsApp button, pages).

## Security summary
- Authentication: Supabase Auth (email + password). Enable MFA/leaked-password protection in the dashboard if desired.
- Authorization: `admin_users` table + `is_admin()` checked by RLS on every write.
- Public visitors: read-only on content, insert-only on `quote_requests` (server-side validation via CHECK constraints and a rate-limit trigger).
- Storage: public read on `media`; admins manage; anonymous users may only upload into `media/quotes/*` (5MB, images/PDF).
