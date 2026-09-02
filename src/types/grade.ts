export interface Grade {
  id: string;
  company_id: string;
  name: string;
  teacher_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface GradeWithTeacher extends Grade {
  teacher_name: string;
}
