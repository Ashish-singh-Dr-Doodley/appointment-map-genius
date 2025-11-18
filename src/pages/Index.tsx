import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { FileUpload } from '@/components/FileUpload';
import { AppointmentMap } from '@/components/AppointmentMap';
import { DoctorOnboarding } from '@/components/DoctorOnboarding';
import { MapControls } from '@/components/MapControls';
import { CoordinateStatus } from '@/components/CoordinateStatus';
import { DoctorScheduleList } from '@/components/DoctorScheduleList';
import { Stethoscope, RefreshCw, Download, RotateCcw, Map as MapIcon, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile } from '@/utils/excelParser';
import { fetchGoogleSheetData } from '@/utils/googleSheetsParser';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDoctors } from '@/hooks/useDoctors';
import { useAppointments } from '@/hooks/useAppointments';

const Index = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const { toast } = useToast();
  
  // Use real-time hooks for doctors and appointments
  const { doctors, loading: doctorsLoading, addDoctor, removeDoctor } = useDoctors();
  const { 
    appointments, 
    loading: appointmentsLoading, 
    updateAppointment, 
    bulkUpdateAppointments,
    addAppointments 
  } = useAppointments();

  const handleDataParsed = async (file: File) => {
    setIsLoading(true);
    try {
      toast({
        title: "Parsing Excel",
        description: "Reading file and extracting coordinates from Location URLs...",
      });
      
      const parsedAppointments = await parseExcelFile(file);
      await addAppointments(parsedAppointments);
      
      const withCoords = parsedAppointments.filter(a => a.latitude && a.longitude).length;
      
      toast({
        title: "Upload Complete",
        description: `${parsedAppointments.length} appointments loaded. ${withCoords} with map locations.`,
      });
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast({
        title: "Error",
        description: "Failed to parse Excel file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDoctor = async (appointmentId: string, doctorName: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const oldDoctorName = appointment.doctorName;
    const newDoctorName = doctorName || undefined;

    const updates: { id: string; updates: Partial<Appointment> }[] = [];

    // If unassigning
    if (!newDoctorName) {
      updates.push({
        id: appointmentId,
        updates: { doctorName: undefined, orderNumber: undefined }
      });
      
      // Renumber remaining appointments for the old doctor
      appointments.forEach(apt => {
        if (apt.doctorName === oldDoctorName && apt.orderNumber && appointment.orderNumber && apt.orderNumber > appointment.orderNumber) {
          updates.push({
            id: apt.id,
            updates: { orderNumber: apt.orderNumber - 1 }
          });
        }
      });
    }
    // If assigning or reassigning
    else {
      const doctorAppointments = appointments.filter(a => a.doctorName === newDoctorName);
      const nextOrderNumber = doctorAppointments.length > 0
        ? Math.max(...doctorAppointments.map(a => a.orderNumber || 0)) + 1
        : 1;

      updates.push({
        id: appointmentId,
        updates: { doctorName: newDoctorName, orderNumber: nextOrderNumber }
      });

      // If reassigning from another doctor, renumber that doctor's list
      if (oldDoctorName) {
        appointments.forEach(apt => {
          if (apt.doctorName === oldDoctorName && apt.orderNumber && appointment.orderNumber && apt.orderNumber > appointment.orderNumber) {
            updates.push({
              id: apt.id,
              updates: { orderNumber: apt.orderNumber - 1 }
            });
          }
        });
      }
    }

    await bulkUpdateAppointments(updates);
  };

  const handleAddDoctor = async (doctor: Doctor) => {
    await addDoctor(doctor);
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    const doctorToRemove = doctors.find(d => d.id === doctorId);
    
    await removeDoctor(doctorId);
    
    // Unassign all appointments from this doctor
    if (doctorToRemove) {
      const updates = appointments
        .filter(apt => apt.doctorName === doctorToRemove.name)
        .map(apt => ({
          id: apt.id,
          updates: { doctorName: undefined, orderNumber: undefined } as Partial<Appointment>
        }));
      
      if (updates.length > 0) {
        await bulkUpdateAppointments(updates);
      }
    }
  };

  const handleReorderAppointments = async (doctorName: string, appointmentId: string, newOrder: number) => {
    const doctorAppointments = appointments
      .filter(a => a.doctorName === doctorName)
      .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    
    const appointmentIndex = doctorAppointments.findIndex(a => a.id === appointmentId);
    if (appointmentIndex === -1) return;

    // Remove from old position
    const [movedAppointment] = doctorAppointments.splice(appointmentIndex, 1);
    
    // Insert at new position
    doctorAppointments.splice(newOrder - 1, 0, movedAppointment);

    // Renumber all appointments for this doctor
    const updates = doctorAppointments.map((apt, index) => ({
      id: apt.id,
      updates: { orderNumber: index + 1 } as Partial<Appointment>
    }));

    await bulkUpdateAppointments(updates);
  };

  const handleRefreshMap = () => {
    setMapKey(prev => prev + 1);
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      const refreshedData = await fetchGoogleSheetData();
      await addAppointments(refreshedData);
      
      toast({
        title: "Data Refreshed",
        description: `Updated with ${refreshedData.length} appointments from Google Sheets`,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data from Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAll = async () => {
    setIsLoading(true);
    try {
      // Delete all current data
      const { error: deleteApptsError } = await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: deleteDocsError } = await supabase.from('doctors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteApptsError) throw deleteApptsError;
      if (deleteDocsError) throw deleteDocsError;
      
      // Load fresh data from Google Sheets
      const freshData = await fetchGoogleSheetData();
      await addAppointments(freshData);
      
      setSelectedAppointment(null);
      
      toast({
        title: "Data Reset",
        description: `Loaded fresh data: ${freshData.length} appointments`,
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset data from Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Export logic would go here
    console.log('Export CSV');
  };

  const handleCalculateETAs = () => {
    // ETA calculation logic would go here
    console.log('Calculate ETAs');
  };

  const assignedCount = appointments.filter(a => a.doctorName).length;
  const unassignedCount = appointments.length - assignedCount;
  const lastUpdated = new Date().toLocaleTimeString();

  const filteredAppointments = appointments.filter(apt => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (doctorFilter !== 'all' && apt.doctorName !== doctors.find(d => d.id === doctorFilter)?.name) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Veterinary Route Management</h1>
                <p className="text-sm text-muted-foreground">Manage doctors, appointments, and optimize routes efficiently</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleResetAll}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Data
              </Button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="mt-4 text-xs text-muted-foreground">
            Last updated: {lastUpdated} | Total: {appointments.length} | Assigned: {assignedCount} | Unassigned: {unassignedCount}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <Tabs defaultValue="maps" className="w-full">
              <TabsList className="inline-flex w-full max-w-4xl mb-6 h-auto flex-wrap gap-2 p-2">
                <TabsTrigger value="maps" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Maps View
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled Appointments
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4" />
                  Unassigned Appointments
                </TabsTrigger>
                <TabsTrigger value="doctors" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Doctors
                </TabsTrigger>
              </TabsList>

              {/* Maps View Tab */}
              <TabsContent value="maps" className="space-y-4">
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold">Interactive Route Map</h2>
                      <p className="text-sm text-muted-foreground">View and manage doctor routes with real-time assignment capabilities</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Map Controls Sidebar */}
                    <div className="col-span-3 space-y-4">
                      <CoordinateStatus appointments={appointments} />
                      
                      <MapControls
                        totalAppointments={filteredAppointments.length}
                        assignedCount={assignedCount}
                        unassignedCount={unassignedCount}
                        doctorsCount={doctors.length}
                        doctors={doctors}
                        appointments={appointments}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        doctorFilter={doctorFilter}
                        onDoctorFilterChange={setDoctorFilter}
                        onCalculateETAs={handleCalculateETAs}
                      />
                    </div>

                    {/* Map Area */}
                    <div className="col-span-9 h-[600px] rounded-lg overflow-hidden border">
                      <AppointmentMap
                        key={mapKey}
                        appointments={filteredAppointments}
                        doctors={doctors}
                        onAppointmentSelect={setSelectedAppointment}
                        onAssignDoctor={handleAssignDoctor}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Scheduled Appointments Tab */}
              <TabsContent value="scheduled">
                <div className="bg-card rounded-lg border p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold">Scheduled Appointments by Doctor</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      View and reorder appointments for each doctor. Use the arrows to adjust visit sequence.
                    </p>
                  </div>
                  <DoctorScheduleList
                    doctors={doctors}
                    appointments={appointments}
                    onReorder={handleReorderAppointments}
                  />
                </div>
              </TabsContent>

              {/* Unassigned Appointments Tab */}
              <TabsContent value="unassigned">
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Unassigned Appointments</h2>
                  <div className="space-y-2">
                    {appointments.filter(a => !a.doctorName).map(apt => (
                      <div key={apt.id} className="p-4 bg-warning/10 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{apt.customerName}</p>
                            <p className="text-sm text-muted-foreground">{apt.petType} - {apt.subCategory}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{apt.visitDate} {apt.visitTime}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Doctors Tab */}
              <TabsContent value="doctors">
                <div className="max-w-2xl mx-auto space-y-6">
                  <FileUpload onDataParsed={handleDataParsed} />
                  <DoctorOnboarding
                    doctors={doctors}
                    onAddDoctor={handleAddDoctor}
                    onRemoveDoctor={handleRemoveDoctor}
                  />
                </div>
              </TabsContent>
            </Tabs>
      </main>
    </div>
  );
};

export default Index;
