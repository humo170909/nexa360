export interface EyeMeasurement {
  id: string;
  company_id: string;
  owner_id: string;
  measured_at: string;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  os_sphere: number | null;
  os_cylinder: number | null;
  os_axis: number | null;
  pupillary_distance: number | null;
  notes: string | null;
  created_at: string;
}

export interface EyeMeasurementWithOwner extends EyeMeasurement {
  owner_name: string;
}
