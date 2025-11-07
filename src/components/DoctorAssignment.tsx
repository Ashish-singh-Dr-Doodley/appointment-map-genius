import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { UserCheck, Phone, Mail, Calendar } from 'lucide-react';

interface DoctorAssignmentProps {
  appointment: Appointment | null;
  onAssign: (appointmentId: string, doctorName: string) => void;
}

export const DoctorAssignment = ({ appointment, onAssign }: DoctorAssignmentProps) => {
  const [doctorName, setDoctorName] = useState('');

  if (!appointment) {
    return (
      <Card className="p-8 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select an appointment to assign a doctor</p>
        </div>
      </Card>
    );
  }

  const handleAssign = () => {
    if (!doctorName.trim()) {
      toast.error('Please enter a doctor name');
      return;
    }
    onAssign(appointment.id, doctorName);
    toast.success(`Dr. ${doctorName} assigned to ${appointment.customerName}'s appointment`);
    setDoctorName('');
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Appointment Details</h2>
        <p className="text-muted-foreground">Review and assign doctor</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">{appointment.customerName}</h3>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Pet Type</p>
              <p className="font-medium">{appointment.petType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{appointment.subCategory}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">{appointment.mobileNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">{appointment.visitDate}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <p className="text-muted-foreground text-xs mb-1">Issue</p>
            <p className="text-sm">{appointment.issue}</p>
          </div>

          {appointment.detailedAddress && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-muted-foreground text-xs mb-1">Address</p>
              <p className="text-sm">{appointment.detailedAddress}</p>
            </div>
          )}

          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Base Charges</span>
            <span className="font-semibold text-lg text-primary">₹{appointment.baseCharges}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="doctor-name" className="text-base">Assign Doctor</Label>
          <Input
            id="doctor-name"
            placeholder="Enter doctor's name"
            value={appointment.doctorName || doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            disabled={!!appointment.doctorName}
          />
          {appointment.doctorName && (
            <p className="text-sm text-muted-foreground">
              Currently assigned to: <span className="font-medium">Dr. {appointment.doctorName}</span>
            </p>
          )}
        </div>

        <Button 
          onClick={handleAssign} 
          className="w-full"
          disabled={!!appointment.doctorName}
        >
          {appointment.doctorName ? 'Doctor Already Assigned' : 'Assign Doctor'}
        </Button>
      </div>
    </Card>
  );
};
