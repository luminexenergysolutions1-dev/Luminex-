import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  const raw = (import.meta.env as Record<string, unknown>)[name];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

const url = readEnv("VITE_SUPABASE_URL");
const anonKey = readEnv("VITE_SUPABASE_ANON_KEY");

/** The Supabase client expects the project base URL (https://<ref>.supabase.co).
 * A REST base URL (https://<ref>.supabase.co/rest/v1/) is also accepted in the
 * dashboard's "Data API" copy block, so strip it before building the client. */
function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

const projectUrl = normalizeSupabaseUrl(url);

/** Base URL of the project, used for direct storage API calls (uploads). */
export const supabaseProjectUrl = projectUrl;

/** The public anon/publishable key. It is safe to ship to the browser. */
export const supabaseAnonKey = anonKey;

/** Only absolute http(s) URLs are usable. `createClient` throws for anything else,
 * and it used to throw during module evaluation, which crashed the whole app
 * before React could mount. */
function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  projectUrl !== undefined && anonKey !== undefined && isValidSupabaseUrl(projectUrl)
);

function createSupabaseClient(): SupabaseClient | null {
  if (projectUrl === undefined || anonKey === undefined || !isValidSupabaseUrl(projectUrl)) {
    return null;
  }
  const validUrl: string = projectUrl;
  const validKey: string = anonKey;
  try {
    return createClient(validUrl, validKey);
  } catch (error) {
    console.error("Supabase client could not be initialised:", error);
    return null;
  }
}

export const supabase: SupabaseClient | null = createSupabaseClient();

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}
