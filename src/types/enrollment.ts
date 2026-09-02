export type EnrollmentStatus = "activa" | "completada" | "cancelada";

export interface Enrollment {
  id: string;
  company_id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  notes: string | null;
  created_at: string;
}

export interface EnrollmentWithDetails extends Enrollment {
  student_name: string;
  course_name: string;
}

export interface EnrollmentInput {
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  notes?: string | null;
}

export const STATUS_TONE: Record<EnrollmentStatus, "neutral" | "success" | "error"> = {
  activa: "success",
  completada: "neutral",
  cancelada: "error",
};

export const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  activa: "Activa",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const STATUS_OPTIONS: EnrollmentStatus[] = ["activa", "completada", "cancelada"];
