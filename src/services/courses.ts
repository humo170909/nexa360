import { supabase } from "../lib/supabaseClient";
import type { Course, CourseWithTeacher } from "../types/course";

export interface CourseInput {
  name: string;
  teacher_id?: string | null;
  description?: string | null;
  price?: number | null;
  notes?: string | null;
}

// Trae los cursos con el nombre del profesor a cargo ya resuelto (join
// manual contra teachers, mismo enfoque que listGrades).
export async function listCourses(
  companyId: string,
  options?: { search?: string },
): Promise<CourseWithTeacher[]> {
  let query = supabase
    .from("courses")
    .select("*, teacher:teachers(full_name)")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (options?.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const { teacher, ...course } = row as Course & { teacher: { full_name: string } | null };
    return { ...course, teacher_name: teacher?.full_name ?? "Sin asignar" };
  });
}

export async function createCourse(companyId: string, input: CourseInput) {
  const { data, error } = await supabase
    .from("courses")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  return { data: data as Course | null, error: error?.message ?? null };
}

export async function updateCourse(id: string, input: CourseInput) {
  const { data, error } = await supabase
    .from("courses")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as Course | null, error: error?.message ?? null };
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  return { error: error?.message ?? null };
}
