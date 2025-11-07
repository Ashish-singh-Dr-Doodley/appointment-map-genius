import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Appointment } from '@/types/appointment';

interface AppointmentMapProps {
  appointments: Appointment[];
  onAppointmentSelect: (appointment: Appointment) => void;
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

export const AppointmentMap = ({ appointments, onAppointmentSelect }: AppointmentMapProps) => {
  const [selectedMarker, setSelectedMarker] = useState<Appointment | null>(null);
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
    if (!map || appointments.length === 0) return;

    const validAppointments = appointments.filter(a => a.latitude && a.longitude);
    if (validAppointments.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    validAppointments.forEach(appointment => {
      bounds.extend({ lat: appointment.latitude!, lng: appointment.longitude! });
    });
    map.fitBounds(bounds);
  }, [map, appointments]);

  const getMarkerColor = (status: string): string => {
    const colors: Record<string, string> = {
      Pending: '#facc15',
      Confirmed: '#22c55e',
      Completed: '#3b82f6',
      Cancelled: '#ef4444',
    };
    return colors[status] || '#3b82f6';
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
      {validAppointments.map((appointment) => (
        <Marker
          key={appointment.id}
          position={{ lat: appointment.latitude!, lng: appointment.longitude! }}
          onClick={() => {
            setSelectedMarker(appointment);
            onAppointmentSelect(appointment);
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: getMarkerColor(appointment.status),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 10,
          }}
        />
      ))}

      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.latitude!, lng: selectedMarker.longitude! }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-semibold text-base mb-1">{selectedMarker.customerName}</h3>
            <p className="text-sm text-gray-600 mb-1">
              {selectedMarker.petType} - {selectedMarker.subCategory}
            </p>
            <p className="text-sm mb-1">
              {selectedMarker.visitDate} at {selectedMarker.visitTime}
            </p>
            <p className="text-sm">
              <span className="font-medium">Status:</span>{' '}
              <span 
                className="font-semibold"
                style={{ color: getMarkerColor(selectedMarker.status) }}
              >
                {selectedMarker.status}
              </span>
            </p>
            {selectedMarker.doctorName && (
              <p className="text-sm mt-1">
                <span className="font-medium">Doctor:</span> {selectedMarker.doctorName}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};
