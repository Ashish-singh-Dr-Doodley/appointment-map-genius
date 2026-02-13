import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { AppointmentMap } from '@/components/AppointmentMap';
import { DoctorOnboarding } from '@/components/DoctorOnboarding';
import { MapControls } from '@/components/MapControls';
// CoordinateStatus removed from map overlay for cleaner UI
import { DoctorScheduleList } from '@/components/DoctorScheduleList';
import { SmartAssignmentDialog } from '@/components/SmartAssignmentDialog';
import { Stethoscope, RefreshCw, Download, RotateCcw, Map as MapIcon, Calendar, MapPin, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchGoogleSheetData } from '@/utils/googleSheetsParser';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDoctors } from '@/hooks/useDoctors';
import { useAppointments } from '@/hooks/useAppointments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Index = () => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showSmartAssign, setShowSmartAssign] = useState(false);
  const [smartAssignAppointment, setSmartAssignAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();
  
  // Use real-time hooks for doctors and appointments
  const { doctors, loading: doctorsLoading, addDoctor, removeDoctor, updateDoctor } = useDoctors();
  const { 
    appointments, 
    loading: appointmentsLoading, 
    updateAppointment, 
    bulkUpdateAppointments,
    addAppointments 
  } = useAppointments();


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
        updates: { doctorName: null, orderNumber: null }
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

  const handleUpdateDoctor = async (doctorId: string, updates: Partial<Doctor>) => {
    await updateDoctor(doctorId, updates);
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
      const freshData = await fetchGoogleSheetData();
      
      // Find only NEW appointments by comparing Sr No
      const existingSrNos = new Set(appointments.map(a => a.srNo));
      const newAppointments = freshData.filter(apt => !existingSrNos.has(apt.srNo));
      
      if (newAppointments.length > 0) {
        await addAppointments(newAppointments);
        toast({
          title: "Data Refreshed",
          description: `Added ${newAppointments.length} new appointment${newAppointments.length > 1 ? 's' : ''} from Google Sheets. ${freshData.length - newAppointments.length} existing appointment${freshData.length - newAppointments.length !== 1 ? 's' : ''} skipped.`,
        });
      } else {
        toast({
          title: "No New Data",
          description: "All appointments from Google Sheets are already in the system.",
        });
      }
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
      // Only delete appointments, keep doctors
      const { error: deleteApptsError } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteApptsError) throw deleteApptsError;
      
      setSelectedAppointment(null);
      
      toast({
        title: "Appointments Cleared",
        description: "All appointments have been cleared. Doctors are preserved. Click 'Refresh Data' to load appointments from Google Sheets.",
      });
    } catch (error) {
      console.error('Error clearing appointments:', error);
      toast({
        title: "Error",
        description: "Failed to clear appointments",
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
                variant="default" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh from Google Sheets
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowClearDialog(true)}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Appointments
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
                <div className="flex items-center gap-2 mb-2">
                  <MapIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">Interactive Route Map</h2>
                    <p className="text-sm text-muted-foreground">View and manage doctor routes with real-time assignment capabilities</p>
                  </div>
                </div>

                <div className="relative rounded-lg overflow-hidden border h-[calc(100vh-280px)] min-h-[500px]">
                  {/* Full-width Map */}
                  <AppointmentMap
                    key={mapKey}
                    appointments={filteredAppointments}
                    doctors={doctors}
                    onAppointmentSelect={setSelectedAppointment}
                    onAssignDoctor={handleAssignDoctor}
                    onUpdateAppointment={updateAppointment}
                  />

                  {/* Floating Map Controls Overlay */}
                  <div className="absolute top-3 left-3 z-10 w-[280px] max-h-[calc(100%-24px)]">
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Unassigned Appointments</h2>
                    <p className="text-sm text-muted-foreground">
                      Click "Smart Assign" on any appointment for AI-powered doctor suggestions
                    </p>
                  </div>
                  <div className="space-y-2">
                    {appointments.filter(a => !a.doctorName).map(apt => (
                      <div key={apt.id} className="p-4 bg-warning/10 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{apt.customerName}</p>
                            <p className="text-sm text-muted-foreground">{apt.petType} - {apt.subCategory}</p>
                            <p className="text-xs text-muted-foreground mt-1">{apt.location}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <p className="text-xs text-muted-foreground">{apt.visitDate} {apt.visitTime}</p>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSmartAssignAppointment(apt);
                                setShowSmartAssign(true);
                              }}
                              className="gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              Smart Assign
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {appointments.filter(a => !a.doctorName).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No unassigned appointments
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Doctors Tab */}
              <TabsContent value="doctors">
                <div className="max-w-2xl mx-auto space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        Data Source: Google Sheets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This application syncs with your Google Sheet. Update your sheet and click <strong>"Refresh from Google Sheets"</strong> in the header to load new appointments.
                      </p>
                      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="mt-0.5">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-1">Smart Sync</p>
                          <p className="text-xs text-muted-foreground">
                            Only new appointments with unique Sr No will be added. Existing appointments and all doctors will be preserved.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <DoctorOnboarding
                    doctors={doctors}
                    onAddDoctor={handleAddDoctor}
                    onRemoveDoctor={handleRemoveDoctor}
                    onUpdateDoctor={handleUpdateDoctor}
                  />
                </div>
              </TabsContent>
              </Tabs>
      </main>

      {/* Clear Appointments Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Appointments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all appointments? This action cannot be undone.
              <span className="block mt-2 font-medium text-destructive">
                All appointment data will be permanently deleted.
              </span>
              <span className="block mt-1 text-sm">
                Doctors will be preserved. You can reload appointments by clicking "Refresh from Google Sheets".
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleResetAll}
            >
              Clear All Appointments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Assignment Dialog */}
      <SmartAssignmentDialog
        open={showSmartAssign}
        onOpenChange={setShowSmartAssign}
        appointment={smartAssignAppointment}
        doctors={doctors}
        allAppointments={appointments}
        onAssign={handleAssignDoctor}
      />
    </div>
  );
};

export default Index;
