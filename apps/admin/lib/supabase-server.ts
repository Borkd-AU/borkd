import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type SetCookieArg = { name: string; value: string; options: CookieOptions };

/**
 * Reads a required environment variable and throws a readable error if it's
 * missing. Preferred over `process.env.X!` non-null assertions so that a
 * misconfigured environment surfaces at app-start with a message the operator
 * can actually act on, instead of a cryptic crash deep inside supabase-js.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Set it in apps/admin/.env.local or your deployment environment.`,
    );
  }
  return value;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: SetCookieArg[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This is safe to ignore if middleware
            // handles session refresh.
          }
        },
      },
    },
  );
}
