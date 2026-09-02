import { supabase } from "../lib/supabaseClient";
import type { Enrollment, EnrollmentInput, EnrollmentWithDetails } from "../types/enrollment";

// Trae las matrículas con el nombre del alumno y del curso ya resueltos
// (doble join manual, mismo enfoque que listPets/listGrades).
export async function listEnrollments(
  companyId: string,
  options?: { search?: string },
): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, student:clients(full_name), course:courses(name)")
    .eq("company_id", companyId)
    .order("enrolled_at", { ascending: false });

  if (error || !data) return [];

  let rows = data.map((row) => {
    const { student, course, ...enrollment } = row as Enrollment & {
      student: { full_name: string } | null;
      course: { name: string } | null;
    };
    return {
      ...enrollment,
      student_name: student?.full_name ?? "—",
      course_name: course?.name ?? "—",
    };
  });

  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.student_name.toLowerCase().includes(term) || r.course_name.toLowerCase().includes(term),
    );
  }
  return rows;
}

export async function createEnrollment(companyId: string, input: EnrollmentInput) {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({ company_id: companyId, ...input })
    .select()
    .single();
  if (error?.code === "23505") {
    return { data: null, error: "Este alumno ya está matriculado en ese curso." };
  }
  return { data: data as Enrollment | null, error: error?.message ?? null };
}

export async function updateEnrollment(id: string, input: EnrollmentInput) {
  const { data, error } = await supabase
    .from("enrollments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error?.code === "23505") {
    return { data: null, error: "Este alumno ya está matriculado en ese curso." };
  }
  return { data: data as Enrollment | null, error: error?.message ?? null };
}

export async function deleteEnrollment(id: string) {
  const { error } = await supabase.from("enrollments").delete().eq("id", id);
  return { error: error?.message ?? null };
}
