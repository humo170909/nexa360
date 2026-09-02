import { supabase } from "../lib/supabaseClient";
import type { Grade, GradeWithTeacher } from "../types/grade";

export interface GradeInput {
  name: string;
  teacher_id?: string | null;
  notes?: string | null;
}

// Trae los grados con el nombre del docente a cargo ya resuelto (join
// manual contra teachers, mismo enfoque que listPets/listVehicles).
export async function listGrades(
  companyId: string,
  options?: { search?: string },
): Promise<GradeWithTeacher[]> {
  let query = supabase
    .from("grades")
    .select("*, teacher:teachers(full_name)")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const { teacher, ...grade } = row as Grade & { teacher: { full_name: string } | null };
    return { ...grade, teacher_name: teacher?.full_name ?? "Sin asignar" };
  });
}

export async function createGrade(companyId: string, input: GradeInput) {
  const { data, error } = await supabase
    .from("grades")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Grade | null, error: error?.message ?? null };
}

export async function updateGrade(id: string, input: GradeInput) {
  const { data, error } = await supabase
    .from("grades")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Grade | null, error: error?.message ?? null };
}

export async function deleteGrade(id: string) {
  const { error } = await supabase.from("grades").delete().eq("id", id);
  return { error: error?.message ?? null };
}
