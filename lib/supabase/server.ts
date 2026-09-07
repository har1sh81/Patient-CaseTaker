import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
  );
}

export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | undefined;
  try {
    cookieStore = await cookies();
  } catch {
    // We are running outside Next.js request scope (e.g. in a CLI script)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(
    supabaseUrl,
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
  // Uses the service role key to bypass RLS for admin/server operations.
  // We import @supabase/supabase-js directly (not SSR) so we don't need
  // cookie handling and the service_role JWT properly bypasses RLS.
  const { createClient: createDirectClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // If the service key is actually a database password (starts with sb_secret_), it will crash the Storage API with "Invalid Compact JWS".
  // In that case, fall back to the anon key, since we have permissive RLS policies for anon now.
  if (serviceKey && !serviceKey.startsWith('eyJ')) {
    console.warn('[MediKiosk] Warning: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT. Falling back to anon key.');
    serviceKey = undefined;
  }
  
  const supabaseKey = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createDirectClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
