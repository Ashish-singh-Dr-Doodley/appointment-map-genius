import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { FileUpload } from '@/components/FileUpload';
import { AppointmentMap } from '@/components/AppointmentMap';
import { AppointmentList } from '@/components/AppointmentList';
import { DoctorAssignment } from '@/components/DoctorAssignment';
import { DoctorOnboarding } from '@/components/DoctorOnboarding';
import { Stethoscope, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapKey, setMapKey] = useState(0);

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

  const handleAddDoctor = (doctor: Doctor) => {
    setDoctors(prev => [...prev, doctor]);
  };

  const handleRemoveDoctor = (doctorId: string) => {
    setDoctors(prev => prev.filter(d => d.id !== doctorId));
  };

  const handleRefreshMap = () => {
    setMapKey(prev => prev + 1);
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
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Appointments</TabsTrigger>
                <TabsTrigger value="doctors">Manage Doctors</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <FileUpload onDataParsed={handleDataParsed} />
              </TabsContent>
              <TabsContent value="doctors">
                <DoctorOnboarding
                  doctors={doctors}
                  onAddDoctor={handleAddDoctor}
                  onRemoveDoctor={handleRemoveDoctor}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Section - Doctors and Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DoctorOnboarding
                doctors={doctors}
                onAddDoctor={handleAddDoctor}
                onRemoveDoctor={handleRemoveDoctor}
              />
              <div className="space-y-4">
                <FileUpload onDataParsed={handleDataParsed} />
                <Button 
                  onClick={handleRefreshMap} 
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Map
                </Button>
              </div>
            </div>

            {/* Main Section - Map and Assignment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel - Appointments */}
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
                  key={mapKey}
                  appointments={appointments}
                  doctors={doctors}
                  onAppointmentSelect={setSelectedAppointment}
                />
              </div>

              {/* Right Panel - Assignment */}
              <div className="lg:col-span-3">
                <DoctorAssignment
                  appointment={selectedAppointment}
                  doctors={doctors}
                  onAssign={handleAssignDoctor}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
