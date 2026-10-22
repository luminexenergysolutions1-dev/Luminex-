-- =====================================================================
-- LUMINEX ENERGY SOLUTIONS - media bucket MIME allow-list
--
-- Symptom: uploading an MP4 (or WebM) in the Admin Portal fails with
--   {"statusCode":"415","error":"invalid_mime_type",
--    "message":"mime type video/mp4 is not supported","code":"InvalidMimeType"}
--
-- Cause: the "media" storage bucket only allows images and PDF, so Supabase
-- Storage rejects every video before the file is written. The website code
-- already accepts MP4/WebM (see src/utils/media.ts) - the bucket is the
-- component that has to be brought in line.
--
-- Run in Supabase -> SQL Editor. Safe to run more than once.
-- =====================================================================

update storage.buckets
set allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/mpeg',
    'video/x-msvideo',
    'application/pdf'
  ],
  file_size_limit = 104857600, -- 100 MB, matches the admin upload limit
  public = true
where id = 'media';

-- Verification: the list must contain video/mp4 and video/webm.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'media';
