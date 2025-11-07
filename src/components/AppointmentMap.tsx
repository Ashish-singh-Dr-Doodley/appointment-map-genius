import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Appointment } from '@/types/appointment';
import { Input } from './ui/input';

interface AppointmentMapProps {
  appointments: Appointment[];
  onAppointmentSelect: (appointment: Appointment) => void;
}

export const AppointmentMap = ({ appointments, onAppointmentSelect }: AppointmentMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenEntered, setTokenEntered] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || !tokenEntered || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.5946, 12.9716], // Bangalore coordinates
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [tokenEntered, mapboxToken]);

  useEffect(() => {
    if (!map.current || !tokenEntered) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validAppointments = appointments.filter(a => a.latitude && a.longitude);
    
    if (validAppointments.length === 0) return;

    // Add markers
    validAppointments.forEach(appointment => {
      const statusColors: Record<string, string> = {
        Pending: '#facc15',
        Confirmed: '#22c55e',
        Completed: '#3b82f6',
        Cancelled: '#ef4444',
      };

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.backgroundColor = statusColors[appointment.status] || '#3b82f6';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([appointment.longitude!, appointment.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${appointment.customerName}</h3>
              <p class="text-sm text-gray-600">${appointment.petType} - ${appointment.subCategory}</p>
              <p class="text-sm">${appointment.visitDate} at ${appointment.visitTime}</p>
              <p class="text-sm font-medium mt-1">Status: ${appointment.status}</p>
            </div>
          `)
        )
        .addTo(map.current!);

      el.addEventListener('click', () => onAppointmentSelect(appointment));
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (validAppointments.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validAppointments.forEach(a => {
        bounds.extend([a.longitude!, a.latitude!]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [appointments, onAppointmentSelect, tokenEntered]);

  if (!tokenEntered) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="max-w-md w-full p-6 space-y-4">
          <h3 className="text-lg font-semibold text-center">Enter Mapbox Token</h3>
          <p className="text-sm text-muted-foreground text-center">
            Get your free token at{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
          <Input
            type="text"
            placeholder="pk.eyJ1..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <button
            onClick={() => setTokenEntered(true)}
            disabled={!mapboxToken}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full rounded-lg" />;
};
