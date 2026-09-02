export interface Pet {
  id: string;
  company_id: string;
  owner_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PetWithOwner extends Pet {
  owner_name: string;
}
