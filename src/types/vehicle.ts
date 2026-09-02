export interface Vehicle {
  id: string;
  company_id: string;
  owner_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  notes: string | null;
  created_at: string;
}

export interface VehicleWithOwner extends Vehicle {
  owner_name: string;
}
