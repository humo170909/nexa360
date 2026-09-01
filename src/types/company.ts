// Debe coincidir exactamente con el enum "business_type" de database/schema.sql
export type BusinessType =
  | "odontologia"
  | "optica"
  | "barberia"
  | "belleza"
  | "estetica"
  | "veterinaria"
  | "taller"
  | "consultorio"
  | "fisioterapia"
  | "psicologia"
  | "gimnasio"
  | "academia"
  | "colegio"
  | "masajes"
  | "servicios_tecnicos"
  | "lavadero"
  | "mantenimiento"
  | "otro";

export type CompanyPlan = "basic" | "pro" | "enterprise";

export interface Company {
  id: string;
  name: string;
  business_type: BusinessType;
  plan: CompanyPlan;
  is_active: boolean;
  owner_id: string | null;
  created_at: string;
}

export type CompanyRole = "ADMIN" | "USUARIO";
