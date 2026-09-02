export interface Course {
  id: string;
  company_id: string;
  name: string;
  teacher_id: string | null;
  description: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
}

export interface CourseWithTeacher extends Course {
  teacher_name: string;
}
