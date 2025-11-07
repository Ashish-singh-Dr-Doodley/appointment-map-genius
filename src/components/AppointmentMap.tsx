import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { getDoctorColor, getUniqueDoctorNames } from '@/utils/doctorColors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface AppointmentMapProps {
  appointments: Appointment[];
  doctors: Doctor[];
  onAppointmentSelect: (appointment: Appointment) => void;
  onDoctorSelect?: (doctor: Doctor) => void;
  onAssignDoctor?: (appointmentId: string, doctorName: string) => void;
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

export const AppointmentMap = ({ appointments, doctors, onAppointmentSelect, onDoctorSelect, onAssignDoctor }: AppointmentMapProps) => {
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
    
    // Otherwise use status color
    const statusColors: Record<string, string> = {
      Pending: '#facc15',
      Confirmed: '#22c55e',
      Completed: '#3b82f6',
      Cancelled: '#ef4444',
    };
    return statusColors[appointment.status] || '#3b82f6';
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

  const validAppointments = appointments.filter(a => a.latitude && a.longitude);

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
            fillColor: '#8b5cf6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 12,
          }}
          label={{
            text: 'D',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
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
            fillColor: getMarkerColor(appointment),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: appointment.doctorName ? 12 : 10,
          }}
          label={appointment.doctorName ? {
            text: appointment.doctorName.charAt(0).toUpperCase(),
            color: '#ffffff',
            fontSize: '11px',
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
              <label className="text-sm font-medium">Assign Doctor:</label>
              <Select
                value={selectedMarker.doctorName || ''}
                onValueChange={(doctorName) => {
                  if (onAssignDoctor) {
                    onAssignDoctor(selectedMarker.id, doctorName);
                    setSelectedMarker(null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
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
          </div>
        </InfoWindow>
      )}

      {/* Doctor InfoWindow */}
      {selectedDoctor && selectedDoctor.latitude && selectedDoctor.longitude && (
        <InfoWindow
          position={{ lat: selectedDoctor.latitude, lng: selectedDoctor.longitude }}
          onCloseClick={() => setSelectedDoctor(null)}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-semibold text-base mb-1">{selectedDoctor.name}</h3>
            {selectedDoctor.specialty && (
              <p className="text-sm text-gray-600 mb-1">{selectedDoctor.specialty}</p>
            )}
            {selectedDoctor.phone && (
              <p className="text-sm">{selectedDoctor.phone}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};
