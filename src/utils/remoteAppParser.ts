import { Appointment } from '@/types/appointment';
import { supabase } from '@/integrations/supabase/client';

interface RemoteAppointment {
  id?: string;
  sr_no?: number;
  contact_name?: string;
  customer_name?: string;
  pet_name?: string;
  pet_type?: string;
  pet_species?: string;
  sub_category?: string;
  reason?: string;
  issue?: string;
  contact_phone?: string;
  mobile_number?: string;
  scheduled_date?: string;
  visit_date?: string;
  scheduled_time?: string;
  visit_time?: string;
  status?: string;
  location?: string;
  address?: string;
  detailed_address?: string;
  latitude?: number;
  longitude?: number;
  source_of_order?: string;
  agent_name?: string;
  assigned_doctor_name?: string;
  doctor_name?: string;
  base_charges?: number;
  query_date?: string;
  clinic_name?: string;
}

const mapRemoteToAppointment = (remote: RemoteAppointment, index: number): Omit<Appointment, 'id'> => {
  return {
    srNo: remote.sr_no || index + 1,
    customerName: remote.contact_name || remote.customer_name || remote.pet_name || 'Unknown',
    petType: remote.pet_species || remote.pet_type || '',
    subCategory: remote.sub_category || '',
    issue: remote.reason || remote.issue || '',
    mobileNumber: remote.contact_phone || remote.mobile_number || '',
    visitDate: remote.scheduled_date || remote.visit_date || '',
    visitTime: remote.scheduled_time || remote.visit_time || '',
    status: mapStatus(remote.status),
    location: remote.address || remote.location || '',
    detailedAddress: remote.detailed_address || remote.address || undefined,
    latitude: remote.latitude,
    longitude: remote.longitude,
    sourceOfOrder: remote.source_of_order || 'Booking App',
    agentName: remote.agent_name || '',
    doctorName: remote.assigned_doctor_name || remote.doctor_name || undefined,
    baseCharges: remote.base_charges || 0,
    queryDate: remote.query_date || remote.scheduled_date || '',
  };
};

const mapStatus = (status?: string): Appointment['status'] => {
  if (!status) return 'Pending';
  const s = status.toLowerCase();
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'confirmed' || s === 'booked' || s === 'checked_in' || s === 'in_progress') return 'Confirmed';
  return 'Pending';
};

export const fetchRemoteAppointments = async (): Promise<Omit<Appointment, 'id'>[]> => {
  console.log('🔄 Fetching appointments from booking app...');

  const { data, error } = await supabase.functions.invoke('fetch-remote-appointments');

  if (error) {
    console.error('❌ Error calling fetch-remote-appointments:', error);
    throw new Error(`Failed to fetch from booking app: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    console.error('❌ Unexpected response format:', data);
    throw new Error(data?.error || 'Unexpected response from booking app');
  }

  console.log(`📊 Received ${data.length} appointments from booking app`);

  const appointments = data.map((item: RemoteAppointment, index: number) => 
    mapRemoteToAppointment(item, index)
  );

  const withCoords = appointments.filter(a => a.latitude && a.longitude).length;
  console.log(`✅ Mapped ${appointments.length} appointments, ${withCoords} with coordinates`);

  return appointments;
};
