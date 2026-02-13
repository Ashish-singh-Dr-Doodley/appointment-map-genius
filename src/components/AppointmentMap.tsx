import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { getDoctorColor, getUniqueDoctorNames } from '@/utils/doctorColors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
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

interface AppointmentMapProps {
  appointments: Appointment[];
  doctors: Doctor[];
  onAppointmentSelect: (appointment: Appointment) => void;
  onDoctorSelect?: (doctor: Doctor) => void;
  onAssignDoctor?: (appointmentId: string, doctorName: string) => void;
  onUpdateAppointment?: (appointmentId: string, updates: Partial<Appointment>) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyAMqINyXLThCEcAQZB9xXqCNGZJOLXXIto';

export const AppointmentMap = ({ appointments, doctors, onAppointmentSelect, onDoctorSelect, onAssignDoctor, onUpdateAppointment }: AppointmentMapProps) => {
  const [selectedMarker, setSelectedMarker] = useState<Appointment | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<Appointment | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'google-map-script',
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!map) return;

    const validDoctors = doctors.filter(d => d.latitude && d.longitude);
    const allPoints = [
      ...appointments.filter(a => a.latitude && a.longitude).map(a => ({ lat: a.latitude!, lng: a.longitude! })),
      ...validDoctors.map(d => ({ lat: d.latitude!, lng: d.longitude! }))
    ];

    if (allPoints.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
    
    // Add some padding
    const padding = { top: 50, right: 50, bottom: 50, left: 50 };
    map.fitBounds(bounds, padding);
  }, [map, appointments, doctors]);

  const getMarkerColor = (appointment: Appointment): string => {
    // If appointment has a doctor assigned, use doctor's color
    if (appointment.doctorName) {
      return getDoctorColor(appointment.doctorName, doctors);
    }
    
    // Unassigned appointments are red for visibility
    return '#ef4444';
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center text-destructive">
          <p className="font-semibold">Error loading Google Maps</p>
          <p className="text-sm">Please check your API key and refresh the page</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Filter out completed appointments
  const validAppointments = appointments.filter(a => a.latitude && a.longitude && a.status !== 'Completed');

  // Get route lines for each doctor
  const getDoctorRoutes = () => {
    const routes: { doctor: Doctor; path: google.maps.LatLngLiteral[] }[] = [];

    doctors.forEach((doctor) => {
      const doctorAppointments = validAppointments
        .filter(a => a.doctorName === doctor.name)
        .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));

      if (doctorAppointments.length > 0) {
        const path: google.maps.LatLngLiteral[] = [];
        
        // Start from doctor's location if available
        if (doctor.latitude && doctor.longitude) {
          path.push({ lat: doctor.latitude, lng: doctor.longitude });
        }
        
        // Add appointments in order
        doctorAppointments.forEach(apt => {
          if (apt.latitude && apt.longitude) {
            path.push({ lat: apt.latitude, lng: apt.longitude });
          }
        });

        if (path.length > 1) {
          routes.push({ doctor, path });
        }
      }
    });

    return routes;
  };

  const routes = getDoctorRoutes();

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={11}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Doctor markers - only for doctors with locations */}
      {doctors.filter(d => d.latitude && d.longitude).map((doctor) => (
        <Marker
          key={doctor.id}
          position={{ lat: doctor.latitude!, lng: doctor.longitude! }}
          onClick={() => {
            setSelectedDoctor(doctor);
            setSelectedMarker(null);
            onDoctorSelect?.(doctor);
          }}
          icon={{
            path: 'M12 3L2 12h3v8h14v-8h3L12 3z', // House shape
            fillColor: doctor.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 1.8,
            anchor: new google.maps.Point(12, 20),
          }}
          title={`${doctor.name} - Starting Location`}
          zIndex={1000}
        />
      ))}

      {/* Route lines for each doctor */}
      {routes.map(({ doctor, path }) => (
        <Polyline
          key={`route-${doctor.id}`}
          path={path}
          options={{
            strokeColor: doctor.color,
            strokeOpacity: 0.7,
            strokeWeight: 3,
            geodesic: true,
          }}
        />
      ))}

      {/* Appointment markers */}
      {validAppointments.map((appointment) => (
        <Marker
          key={appointment.id}
          position={{ lat: appointment.latitude!, lng: appointment.longitude! }}
          onClick={() => {
            setSelectedMarker(appointment);
            setSelectedDoctor(null);
            onAppointmentSelect(appointment);
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: appointment.doctorName ? getMarkerColor(appointment) : '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
            scale: 14,
          }}
          label={appointment.doctorName && appointment.orderNumber ? {
            text: appointment.orderNumber.toString(),
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 'bold',
          } : {
            text: '?',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
          }}
          zIndex={appointment.doctorName ? 500 : 100}
        />
      ))}

      {/* Appointment InfoWindow */}
      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.latitude!, lng: selectedMarker.longitude! }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ minWidth: '260px', maxWidth: '320px', padding: '8px 4px' }}>
            {/* Customer Name with orange underline */}
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f59e0b', margin: '0 0 4px 0', paddingBottom: '6px', borderBottom: '2px solid #f59e0b' }}>
              {selectedMarker.customerName}
            </h3>

            {/* Status Badge */}
            <div style={{ margin: '10px 0', padding: '6px 12px', backgroundColor: selectedMarker.doctorName ? '#dcfce7' : '#fef9c3', borderLeft: `4px solid ${selectedMarker.doctorName ? '#22c55e' : '#f59e0b'}`, borderRadius: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: selectedMarker.doctorName ? '#16a34a' : '#b45309' }}>
                STATUS: {selectedMarker.doctorName ? 'ASSIGNED' : 'UNASSIGNED'}
              </span>
            </div>

            {/* Details Table */}
            <table style={{ width: '100%', fontSize: '13px', marginTop: '8px' }}>
              <tbody>
                <tr><td style={{ fontWeight: 700, padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Pet:</td><td style={{ padding: '3px 0' }}>{selectedMarker.petType}</td></tr>
                <tr><td style={{ fontWeight: 700, padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Service:</td><td style={{ padding: '3px 0' }}>{selectedMarker.subCategory}</td></tr>
                <tr><td style={{ fontWeight: 700, padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Issue:</td><td style={{ padding: '3px 0' }}>{selectedMarker.issue || '—'}</td></tr>
                <tr><td style={{ fontWeight: 700, padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Time:</td><td style={{ padding: '3px 0' }}>{selectedMarker.visitTime}</td></tr>
                <tr><td style={{ fontWeight: 700, padding: '3px 8px 3px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Location:</td><td style={{ padding: '3px 0', wordBreak: 'break-all', fontSize: '11px' }}>{selectedMarker.location}</td></tr>
              </tbody>
            </table>

            {/* Assign Doctor Dropdown */}
            <div style={{ marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
              <Select
                value={selectedMarker.doctorName || 'unassigned'}
                onValueChange={(value) => {
                  if (onAssignDoctor) {
                    const doctorName = value === 'unassigned' ? '' : value;
                    onAssignDoctor(selectedMarker.id, doctorName);
                    setSelectedMarker(null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Assign to doctor..." />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">✕ Unassign</span>
                  </SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.name}>
                      <span style={{ color: doctor.color }}>● {doctor.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mark Completed Button */}
            {selectedMarker.status !== 'Completed' && (
              <div style={{ marginTop: '8px' }}>
                <Button
                  className="w-full"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setAppointmentToComplete(selectedMarker);
                    setShowCompletionDialog(true);
                  }}
                >
                  Mark as Completed
                </Button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Doctor InfoWindow */}
      {selectedDoctor && selectedDoctor.latitude && selectedDoctor.longitude && (
        <InfoWindow
          position={{ lat: selectedDoctor.latitude, lng: selectedDoctor.longitude }}
          onCloseClick={() => setSelectedDoctor(null)}
        >
          <div className="p-2 min-w-[200px]">
            <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedDoctor.color }}
              />
              {selectedDoctor.name}
            </h3>
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-3 h-3" />
                Starting Location
              </p>
              {selectedDoctor.specialty && (
                <p className="text-gray-600">{selectedDoctor.specialty}</p>
              )}
              {selectedDoctor.phone && (
                <p className="text-gray-600">{selectedDoctor.phone}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Routes will start from this location
              </p>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Completion Confirmation Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this appointment as completed? 
              {appointmentToComplete && (
                <span className="block mt-2 font-medium">
                  Customer: {appointmentToComplete.customerName}
                </span>
              )}
              The appointment will be removed from the map.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToComplete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onUpdateAppointment && appointmentToComplete) {
                  onUpdateAppointment(appointmentToComplete.id, { status: 'Completed' });
                  setSelectedMarker(null);
                  setAppointmentToComplete(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GoogleMap>
  );
};
