import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Doctor } from '@/types/doctor';

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors();

    const channel = supabase
      .channel('doctors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctors'
        },
        () => {
          fetchDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedDoctors: Doctor[] = (data || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        color: doc.color,
        specialty: doc.specialty || undefined,
        phone: doc.phone || undefined,
        startLocation: doc.start_location || undefined,
        latitude: doc.latitude || undefined,
        longitude: doc.longitude || undefined,
      }));

      setDoctors(mappedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDoctor = async (doctor: Omit<Doctor, 'id'>) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .insert({
          name: doctor.name,
          color: doctor.color,
          specialty: doctor.specialty,
          phone: doctor.phone,
          start_location: doctor.startLocation,
          latitude: doctor.latitude,
          longitude: doctor.longitude,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding doctor:', error);
      throw error;
    }
  };

  const removeDoctor = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing doctor:', error);
      throw error;
    }
  };

  return { doctors, loading, addDoctor, removeDoctor };
};