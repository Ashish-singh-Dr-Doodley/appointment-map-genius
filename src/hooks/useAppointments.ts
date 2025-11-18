import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types/appointment';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedAppointments: Appointment[] = (data || []).map(apt => ({
        id: apt.id,
        srNo: apt.sr_no,
        petType: apt.pet_type,
        subCategory: apt.sub_category,
        queryDate: apt.query_date,
        mobileNumber: apt.mobile_number,
        customerName: apt.customer_name,
        doctorName: apt.doctor_name || undefined,
        orderNumber: apt.order_number || undefined,
        sourceOfOrder: apt.source_of_order,
        agentName: apt.agent_name,
        location: apt.location,
        detailedAddress: apt.detailed_address || undefined,
        issue: apt.issue,
        visitDate: apt.visit_date,
        visitTime: apt.visit_time,
        status: apt.status as Appointment['status'],
        baseCharges: Number(apt.base_charges),
        longitude: apt.longitude || undefined,
        latitude: apt.latitude || undefined,
      }));

      setAppointments(mappedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    try {
      const dbUpdates: any = {};
      
      if (updates.doctorName !== undefined) dbUpdates.doctor_name = updates.doctorName;
      if (updates.orderNumber !== undefined) dbUpdates.order_number = updates.orderNumber;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;

      const { error } = await supabase
        .from('appointments')
        .update(dbUpdates)
        .eq('id', appointmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  };

  const bulkUpdateAppointments = async (updates: { id: string; updates: Partial<Appointment> }[]) => {
    try {
      for (const { id, updates: aptUpdates } of updates) {
        await updateAppointment(id, aptUpdates);
      }
    } catch (error) {
      console.error('Error bulk updating appointments:', error);
      throw error;
    }
  };

  const addAppointments = async (newAppointments: Omit<Appointment, 'id'>[]) => {
    try {
      const dbAppointments = newAppointments.map(apt => ({
        sr_no: apt.srNo,
        pet_type: apt.petType,
        sub_category: apt.subCategory,
        query_date: apt.queryDate,
        mobile_number: apt.mobileNumber,
        customer_name: apt.customerName,
        doctor_name: apt.doctorName,
        order_number: apt.orderNumber,
        source_of_order: apt.sourceOfOrder,
        agent_name: apt.agentName,
        location: apt.location,
        detailed_address: apt.detailedAddress,
        issue: apt.issue,
        visit_date: apt.visitDate,
        visit_time: apt.visitTime,
        status: apt.status,
        base_charges: apt.baseCharges,
        longitude: apt.longitude,
        latitude: apt.latitude,
      }));

      const { error } = await supabase
        .from('appointments')
        .insert(dbAppointments);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding appointments:', error);
      throw error;
    }
  };

  return { appointments, loading, updateAppointment, bulkUpdateAppointments, addAppointments };
};