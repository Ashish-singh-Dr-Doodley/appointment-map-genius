import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowUp, ArrowDown, MapPin, Clock, Calendar } from 'lucide-react';

interface DoctorScheduleListProps {
  doctors: Doctor[];
  appointments: Appointment[];
  onReorder: (doctorName: string, appointmentId: string, newOrder: number) => void;
}

export const DoctorScheduleList = ({ doctors, appointments, onReorder }: DoctorScheduleListProps) => {
  const getDoctorAppointments = (doctorName: string) => {
    return appointments
      .filter(a => a.doctorName === doctorName)
      .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
  };

  const handleMoveUp = (doctorName: string, appointmentId: string, currentOrder: number) => {
    if (currentOrder > 1) {
      onReorder(doctorName, appointmentId, currentOrder - 1);
    }
  };

  const handleMoveDown = (doctorName: string, appointmentId: string, currentOrder: number, maxOrder: number) => {
    if (currentOrder < maxOrder) {
      onReorder(doctorName, appointmentId, currentOrder + 1);
    }
  };

  return (
    <div className="space-y-6">
      {doctors.map((doctor) => {
        const doctorAppointments = getDoctorAppointments(doctor.name);
        
        if (doctorAppointments.length === 0) return null;

        return (
          <Card key={doctor.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: doctor.color }}
                  />
                  <div>
                    <CardTitle className="text-lg">{doctor.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {doctorAppointments.length} appointment{doctorAppointments.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {doctorAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveUp(doctor.name, apt.id, apt.orderNumber!)}
                        disabled={apt.orderNumber === 1}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveDown(doctor.name, apt.id, apt.orderNumber!, doctorAppointments.length)}
                        disabled={apt.orderNumber === doctorAppointments.length}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold">
                      {apt.orderNumber}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{apt.customerName}</p>
                        <Badge variant="outline" className="ml-2">
                          {apt.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {apt.petType} - {apt.subCategory}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {apt.visitDate}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.visitTime}
                        </div>
                        {apt.detailedAddress && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-xs">{apt.detailedAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {doctors.every(d => getDoctorAppointments(d.name).length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No appointments assigned yet. Assign appointments to doctors to see their schedules here.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
