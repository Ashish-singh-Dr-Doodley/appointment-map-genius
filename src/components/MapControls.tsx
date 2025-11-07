import { Clock, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { getDoctorColor, getUniqueDoctorNames } from '@/utils/doctorColors';
import { Appointment } from '@/types/appointment';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Doctor } from '@/types/doctor';

interface MapControlsProps {
  totalAppointments: number;
  assignedCount: number;
  unassignedCount: number;
  doctorsCount: number;
  doctors: Doctor[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  doctorFilter: string;
  onDoctorFilterChange: (value: string) => void;
  onCalculateETAs: () => void;
  appointments: Appointment[];
}

export const MapControls = ({
  totalAppointments,
  assignedCount,
  unassignedCount,
  doctorsCount,
  doctors,
  statusFilter,
  onStatusFilterChange,
  doctorFilter,
  onDoctorFilterChange,
  onCalculateETAs,
  appointments,
}: MapControlsProps) => {
  const uniqueDoctorNames = getUniqueDoctorNames(appointments);

  return (
    <Card className="h-full p-4 space-y-4 overflow-y-auto">
      {/* Map Controls Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <h3 className="font-semibold">Map Controls</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Sat</Button>
          <Button variant="ghost" size="sm">Hide</Button>
        </div>
      </div>

      {/* Calculate ETAs Button */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={onCalculateETAs}
      >
        <Clock className="w-4 h-4 mr-2" />
        Calculate ETAs
      </Button>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Total</div>
          <div className="text-2xl font-bold text-primary">{totalAppointments}</div>
        </div>
        <div className="text-center p-3 bg-success/10 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Assigned</div>
          <div className="text-2xl font-bold text-success">{assignedCount}</div>
        </div>
        <div className="text-center p-3 bg-warning/10 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Unassigned</div>
          <div className="text-2xl font-bold text-warning">{unassignedCount}</div>
        </div>
        <div className="text-center p-3 bg-accent/10 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Doctors</div>
          <div className="text-2xl font-bold text-accent">{doctorsCount}</div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Status Filter</label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Doctor Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Doctor Filter</label>
        <Select value={doctorFilter} onValueChange={onDoctorFilterChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Doctors List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Active Doctors</h4>
        <div className="space-y-2">
          {uniqueDoctorNames.map((doctorName, index) => {
            const doctorColor = getDoctorColor(doctorName, uniqueDoctorNames);
            const appointmentCount = appointments.filter(a => a.doctorName === doctorName).length;
            
            return (
              <div 
                key={doctorName}
                className="flex items-center justify-between p-2 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: doctorColor }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{doctorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary font-medium">ETA: --</p>
                </div>
              </div>
            );
          })}
          {uniqueDoctorNames.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active doctors
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
