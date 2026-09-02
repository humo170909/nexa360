export interface Sale {
  id: string;
  company_id: string;
  owner_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  sold_at: string;
  notes: string | null;
  created_at: string;
}

export interface SaleWithOwner extends Sale {
  owner_name: string;
}
