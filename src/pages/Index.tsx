import { useState, useEffect } from 'react';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { FileUpload } from '@/components/FileUpload';
import { AppointmentMap } from '@/components/AppointmentMap';
import { AppointmentList } from '@/components/AppointmentList';
import { DoctorAssignment } from '@/components/DoctorAssignment';
import { DoctorOnboarding } from '@/components/DoctorOnboarding';
import { Stethoscope, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile } from '@/utils/excelParser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-load sample data on mount
    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/sample-data.xlsx');
      const blob = await response.blob();
      const file = new File([blob], 'sample-data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const parsedAppointments = await parseExcelFile(file);
      setAppointments(parsedAppointments);
    } catch (error) {
      console.error('Error loading sample data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">VetRoute Manager</h1>
              <p className="text-muted-foreground text-xs">Veterinary Appointment & Route Planning</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Loading sample appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
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
