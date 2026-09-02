export type GuardianRelationship = "madre" | "padre" | "tutor" | "otro";

export const RELATIONSHIP_LABEL: Record<GuardianRelationship, string> = {
  madre: "Madre",
  padre: "Padre",
  tutor: "Tutor",
  otro: "Otro",
};

export interface Guardian {
  id: string;
  company_id: string;
  owner_id: string;
  full_name: string;
  relationship: GuardianRelationship | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface GuardianWithStudent extends Guardian {
  student_name: string;
}
