import { useState, useEffect } from 'react';
import { Appointment } from '@/types/appointment';
import { Progress } from '@/components/ui/progress';
import { Doctor } from '@/types/doctor';
import { FileUpload } from '@/components/FileUpload';
import { AppointmentMap } from '@/components/AppointmentMap';
import { DoctorOnboarding } from '@/components/DoctorOnboarding';
import { MapControls } from '@/components/MapControls';
import { CoordinateStatus } from '@/components/CoordinateStatus';
import { Stethoscope, RefreshCw, Download, RotateCcw, Map as MapIcon, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile } from '@/utils/excelParser';
import { fetchGoogleSheetData, refreshGoogleSheetData } from '@/utils/googleSheetsParser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    // Auto-load sample data on mount
    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    try {
      toast({
        title: "Loading Data",
        description: "Fetching appointments and coordinates from Google Sheets...",
      });
      
      const parsedAppointments = await fetchGoogleSheetData((current, total) => {
        setLoadingProgress({ current, total });
      });
      setAppointments(parsedAppointments);
      
      const withCoords = parsedAppointments.filter(a => a.latitude && a.longitude).length;
      
      toast({
        title: "Data Loaded",
        description: `${parsedAppointments.length} appointments loaded. ${withCoords} with map locations.`,
      });
    } catch (error) {
      console.error('Error loading Google Sheets data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Make sure the sheet is publicly accessible.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  const handleDataParsed = async (file: File) => {
    setIsLoading(true);
    try {
      toast({
        title: "Parsing Excel",
        description: "Reading file and extracting coordinates from Location URLs...",
      });
      
      const parsedAppointments = await parseExcelFile(file);
      setAppointments(parsedAppointments);
      
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

  const handleRefreshData = async () => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    try {
      const updatedAppointments = await refreshGoogleSheetData(appointments);
      const newCount = updatedAppointments.length - appointments.length;
      setAppointments(updatedAppointments);
      
      toast({
        title: "Data Refreshed",
        description: newCount > 0 
          ? `Added ${newCount} new appointment${newCount === 1 ? '' : 's'}` 
          : "No new appointments found",
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
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  const handleResetAll = async () => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    try {
      const freshData = await fetchGoogleSheetData((current, total) => {
        setLoadingProgress({ current, total });
      });
      setAppointments(freshData);
      setDoctors([]);
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
      setLoadingProgress({ current: 0, total: 0 });
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">
              {loadingProgress.total > 0 
                ? `Extracting coordinates... ${loadingProgress.current}/${loadingProgress.total}`
                : 'Loading appointments...'}
            </p>
            {loadingProgress.total > 0 && (
              <div className="max-w-md w-full px-4 space-y-2">
                <Progress value={(loadingProgress.current / loadingProgress.total) * 100} />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% complete
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">This may take a moment as we fetch coordinates from Google Maps</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <Tabs defaultValue="maps" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
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
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Scheduled Appointments Tab */}
              <TabsContent value="scheduled">
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Scheduled Appointments</h2>
                  <div className="space-y-2">
                    {appointments.filter(a => a.doctorName).map(apt => (
                      <div key={apt.id} className="p-4 bg-muted/20 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{apt.customerName}</p>
                            <p className="text-sm text-muted-foreground">{apt.petType} - {apt.subCategory}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary">{apt.doctorName}</p>
                            <p className="text-xs text-muted-foreground">{apt.visitDate} {apt.visitTime}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
