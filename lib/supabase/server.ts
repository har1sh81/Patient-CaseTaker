import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // We are running outside Next.js request scope (e.g. in a CLI script)
  }

  // Use service role key to bypass RLS policies if present and it is a valid JWT
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const useAdminKey = !!serviceKey && !serviceKey.startsWith('sb_secret_') && serviceKey.includes('.');
  const supabaseKey = useAdminKey
    ? serviceKey!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  // Uses the service role key to bypass RLS for admin operations like Audit Logs.
  // Falls back to anon key if the service key is not a valid JWT.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const useAdminKey = !!serviceKey && !serviceKey.startsWith('sb_secret_') && serviceKey.includes('.');
  const supabaseKey = useAdminKey
    ? serviceKey!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
