import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      // Cas du pré-rendu statique sans variables chargées : les vraies
      // requêtes n'arrivent que dans le navigateur.
      client = createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
    } else {
      client = createClient(url, key);
    }
  }
  return client;
}

// Export d'un proxy pour garder l'API `supabase.from(...)` sans exécuter
// createClient au moment de l'import (rendu statique).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});
