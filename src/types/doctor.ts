export interface Doctor {
  id: string;
  name: string;
  color: string;
  specialty?: string;
  phone?: string;
  startLocation?: string;
  latitude?: number;
  longitude?: number;
}
