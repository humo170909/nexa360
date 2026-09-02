import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types/profile";

export async function updateProfile(userId: string, fullName: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select()
    .single();
  return { data: data as Profile | null, error: error?.message ?? null };
}
