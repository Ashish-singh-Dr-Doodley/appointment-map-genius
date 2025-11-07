import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, MapPin, User, Stethoscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DoctorAssignmentProps {
  appointment: Appointment | null;
  doctors: Doctor[];
  onAssign: (appointmentId: string, doctorName: string) => void;
}

export const DoctorAssignment = ({ appointment, doctors, onAssign }: DoctorAssignmentProps) => {
  const { toast } = useToast();

  const handleAssign = (doctorName: string) => {
    if (appointment) {
      onAssign(appointment.id, doctorName);
      toast({
        title: "Doctor Assigned",
        description: `${doctorName} has been assigned to ${appointment.customerName}'s appointment`,
      });
    }
  };

  if (!appointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select an appointment to assign a doctor</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    Pending: 'bg-warning text-warning-foreground',
    Confirmed: 'bg-success text-success-foreground',
    Completed: 'bg-primary text-primary-foreground',
    Cancelled: 'bg-destructive text-destructive-foreground',
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Appointment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{appointment.customerName}</h3>
              <p className="text-sm text-muted-foreground">
                {appointment.petType} - {appointment.subCategory}
              </p>
            </div>
            <Badge className={statusColors[appointment.status] || 'bg-muted'}>
              {appointment.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{appointment.visitDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{appointment.visitTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs">{appointment.detailedAddress || 'Address not available'}</span>
            </div>
          </div>

          {appointment.doctorName && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Currently Assigned:</p>
                  <p className="text-sm text-primary font-semibold">{appointment.doctorName}</p>
                </div>
                {appointment.orderNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Visit #</span>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {appointment.orderNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

         <div className="space-y-3">
           <h3 className="text-sm font-semibold text-muted-foreground">
             {appointment.doctorName ? 'Reassign Doctor' : 'Assign Doctor'}
           </h3>
           
           {doctors.length === 0 ? (
             <p className="text-sm text-muted-foreground">
               No doctors available. Please onboard doctors first.
             </p>
           ) : (
             <div className="space-y-2">
               {appointment.doctorName && (
                 <Button
                   variant="outline"
                   className="w-full justify-start border-destructive/50 hover:bg-destructive/10"
                   onClick={() => {
                     onAssign(appointment.id, '');
                     toast({
                       title: "Doctor Unassigned",
                       description: `${appointment.customerName}'s appointment is now unassigned`,
                     });
                   }}
                 >
                   <span className="text-destructive">✕ Unassign Doctor</span>
                 </Button>
               )}
               
               {doctors.map((doctor) => (
                 <Button
                   key={doctor.id}
                   variant={appointment.doctorName === doctor.name ? "default" : "outline"}
                   className="w-full justify-start"
                   onClick={() => handleAssign(doctor.name)}
                 >
                   <Stethoscope className="w-4 h-4 mr-2" />
                   <div className="flex-1 text-left">
                     <p className="font-medium">{doctor.name}</p>
                     <p className="text-xs opacity-70">{doctor.specialty}</p>
                   </div>
                 </Button>
               ))}
             </div>
           )}
         </div>
      </CardContent>
    </Card>
  );
};
