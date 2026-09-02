import { supabase } from "../lib/supabaseClient";
import type { Teacher } from "../types/teacher";

export interface TeacherInput {
  full_name: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export async function listTeachers(
  companyId: string,
  options?: { search?: string },
): Promise<Teacher[]> {
  let query = supabase
    .from("teachers")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("full_name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Teacher[];
}

export async function createTeacher(companyId: string, input: TeacherInput) {
  const { data, error } = await supabase
    .from("teachers")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Teacher | null, error: error?.message ?? null };
}

export async function updateTeacher(id: string, input: TeacherInput) {
  const { data, error } = await supabase
    .from("teachers")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Teacher | null, error: error?.message ?? null };
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  return { error: error?.message ?? null };
}
