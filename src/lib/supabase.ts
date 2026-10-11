import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  const raw = (import.meta.env as Record<string, unknown>)[name];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

const url = readEnv("VITE_SUPABASE_URL");
const anonKey = readEnv("VITE_SUPABASE_ANON_KEY");

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
  url !== undefined && anonKey !== undefined && isValidSupabaseUrl(url)
);

function createSupabaseClient(): SupabaseClient | null {
  if (url === undefined || anonKey === undefined || !isValidSupabaseUrl(url)) {
    return null;
  }
  const validUrl: string = url;
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
