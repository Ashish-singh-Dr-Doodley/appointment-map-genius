export interface Appointment {
  id: string;
  srNo: number;
  petType: string;
  subCategory: string;
  queryDate: string;
  mobileNumber: string;
  customerName: string;
  doctorName?: string;
  sourceOfOrder: string;
  agentName: string;
  location: string;
  detailedAddress?: string;
  issue: string;
  visitDate: string;
  visitTime: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  baseCharges: number;
  longitude?: number;
  latitude?: number;
}
