import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { FileUpload } from '@/components/FileUpload';
import { AppointmentMap } from '@/components/AppointmentMap';
import { AppointmentList } from '@/components/AppointmentList';
import { DoctorAssignment } from '@/components/DoctorAssignment';
import { Stethoscope } from 'lucide-react';

const Index = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleDataParsed = (parsedAppointments: Appointment[]) => {
    setAppointments(parsedAppointments);
  };

  const handleAssignDoctor = (appointmentId: string, doctorName: string) => {
    setAppointments(prev =>
      prev.map(apt =>
        apt.id === appointmentId ? { ...apt, doctorName } : apt
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground shadow-elegant">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">VetRoute Manager</h1>
              <p className="text-primary-foreground/90 text-sm">Veterinary Appointment & Route Planning</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {appointments.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <FileUpload onDataParsed={handleDataParsed} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Appointments List */}
            <div className="lg:col-span-3">
              <AppointmentList
                appointments={appointments}
                selectedAppointment={selectedAppointment}
                onSelectAppointment={setSelectedAppointment}
              />
            </div>

            {/* Center Panel - Map */}
            <div className="lg:col-span-6 h-[600px]">
              <AppointmentMap
                appointments={appointments}
                onAppointmentSelect={setSelectedAppointment}
              />
            </div>

            {/* Right Panel - Doctor Assignment */}
            <div className="lg:col-span-3">
              <DoctorAssignment
                appointment={selectedAppointment}
                onAssign={handleAssignDoctor}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
