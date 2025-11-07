import { Appointment } from '@/types/appointment';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Phone, MapPin, Calendar, Clock } from 'lucide-react';

interface AppointmentListProps {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  onSelectAppointment: (appointment: Appointment) => void;
}

export const AppointmentList = ({
  appointments,
  selectedAppointment,
  onSelectAppointment,
}: AppointmentListProps) => {
  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Pending: 'outline',
    Confirmed: 'default',
    Completed: 'secondary',
    Cancelled: 'destructive',
  };

  return (
    <div className="space-y-3 h-full">
      <h2 className="text-lg font-semibold">Appointments ({appointments.length})</h2>
      <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              selectedAppointment?.id === appointment.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/50'
            }`}
            onClick={() => onSelectAppointment(appointment)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-base">{appointment.customerName}</h3>
                <p className="text-sm text-muted-foreground">
                  {appointment.petType} - {appointment.subCategory}
                </p>
              </div>
              <Badge variant={statusVariants[appointment.status]}>
                {appointment.status}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{appointment.visitDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{appointment.visitTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{appointment.mobileNumber}</span>
              </div>
              {appointment.latitude && appointment.longitude && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">
                    {appointment.latitude.toFixed(4)}, {appointment.longitude.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {appointment.doctorName && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm">
                  <span className="font-medium">Doctor:</span> {appointment.doctorName}
                </p>
              </div>
            )}

            <div className="mt-2 pt-2 border-t">
              <p className="text-sm">
                <span className="font-medium">Issue:</span> {appointment.issue}
              </p>
            </div>

            <div className="mt-1">
              <p className="text-sm font-medium text-primary">₹{appointment.baseCharges}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
