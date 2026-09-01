import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Sin esto, createClient() lanza una excepción y toda la app se cae en
  // blanco solo por no tener .env.local todavía. Preferimos que la
  // interfaz se pueda ver e iterar igual; cualquier llamada real a
  // Supabase fallará con un error de red hasta que configures las claves
  // reales. Ver docs/supabase.md.
  console.error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa los valores (ver docs/supabase.md). Usando valores de relleno mientras tanto.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
