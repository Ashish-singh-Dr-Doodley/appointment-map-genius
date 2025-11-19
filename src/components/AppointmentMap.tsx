import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { getDoctorColor, getUniqueDoctorNames } from '@/utils/doctorColors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

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
    
    // Unassigned appointments are grey
    return '#9ca3af';
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
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: doctor.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 14,
          }}
          label={{
            text: '🏥',
            color: '#ffffff',
            fontSize: '16px',
          }}
          title={`${doctor.name} - Starting Location`}
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
            path: appointment.doctorName 
              ? 'M -8,-8 L 8,-8 L 8,8 L -8,8 Z' // Square for assigned
              : google.maps.SymbolPath.CIRCLE, // Circle for unassigned
            fillColor: getMarkerColor(appointment),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: appointment.doctorName ? 1 : 10,
          }}
          label={appointment.doctorName && appointment.orderNumber ? {
            text: appointment.orderNumber.toString(),
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
          } : undefined}
        />
      ))}

      {/* Appointment InfoWindow */}
      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.latitude!, lng: selectedMarker.longitude! }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div className="p-3 max-w-sm">
            <h3 className="font-semibold text-base mb-2">{selectedMarker.customerName}</h3>
            <p className="text-sm text-gray-600 mb-1">
              {selectedMarker.petType} - {selectedMarker.subCategory}
            </p>
            <p className="text-sm mb-1">
              {selectedMarker.visitDate} at {selectedMarker.visitTime}
            </p>
            <p className="text-sm mb-2">
              <span className="font-medium">Status:</span>{' '}
              <span 
                className="font-semibold"
                style={{ color: selectedMarker.doctorName 
                  ? getDoctorColor(selectedMarker.doctorName, doctors)
                  : getMarkerColor(selectedMarker) 
                }}
              >
                {selectedMarker.status}
              </span>
            </p>
            
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-sm font-medium">Assign Doctor:</label>
                <Select
                  value={selectedMarker.doctorName || 'unassigned'}
                  onValueChange={(value) => {
                    if (onAssignDoctor) {
                      // If "unassigned" is selected, pass empty string to unassign
                      const doctorName = value === 'unassigned' ? '' : value;
                      onAssignDoctor(selectedMarker.id, doctorName);
                      setSelectedMarker(null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select a doctor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">
                        ✕ Unassign
                      </span>
                    </SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>
                        <span style={{ color: doctor.color }}>
                          ● {doctor.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedMarker.status !== 'Completed' && (
                <Button 
                  className="w-full"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (onUpdateAppointment) {
                      onUpdateAppointment(selectedMarker.id, { status: 'Completed' });
                      setSelectedMarker(null);
                    }
                  }}
                >
                  Mark as Completed
                </Button>
              )}
            </div>
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
    </GoogleMap>
  );
};
