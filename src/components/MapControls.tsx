import { useState } from 'react';
import { Clock, Filter, Satellite, EyeOff, Eye } from 'lucide-react';
import { Button } from './ui/button';
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
  const [collapsed, setCollapsed] = useState(false);
  const uniqueDoctorNames = getUniqueDoctorNames(appointments);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Map Controls</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Satellite className="w-3 h-3 mr-1" />
            Sat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {collapsed ? 'Show' : 'Hide'}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Calculate ETAs */}
          <Button
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={onCalculateETAs}
          >
            <Clock className="w-3 h-3 mr-1.5" />
            Calculate ETAs
          </Button>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-1 text-center">
            <div className="py-2 px-1 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">{totalAppointments}</div>
            </div>
            <div className="py-2 px-1 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">Assigned</div>
              <div className="text-lg font-bold text-success">{assignedCount}</div>
            </div>
            <div className="py-2 px-1 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">Unassigned</div>
              <div className="text-lg font-bold text-destructive">{unassignedCount}</div>
            </div>
            <div className="py-2 px-1 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">Doctors</div>
              <div className="text-lg font-bold text-primary">{doctorsCount}</div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Status Filter</label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="h-8 text-xs">
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
          <div className="space-y-1">
            <label className="text-xs font-medium">Doctor Filter</label>
            <Select value={doctorFilter} onValueChange={onDoctorFilterChange}>
              <SelectTrigger className="h-8 text-xs">
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

          {/* Active Doctors */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <h4 className="text-xs font-semibold">Active Doctors</h4>
            <div className="space-y-1.5">
              {uniqueDoctorNames.map((doctorName) => {
                const doctor = doctors.find(d => d.name === doctorName);
                const doctorColor = doctor?.color || getDoctorColor(doctorName, uniqueDoctorNames);
                const appointmentCount = appointments.filter(a => a.doctorName === doctorName).length;

                return (
                  <div
                    key={doctorName}
                    className="flex items-center justify-between p-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: doctorColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doctorName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {appointmentCount} apt
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-destructive font-medium shrink-0 ml-2">
                      ETA: --
                    </span>
                  </div>
                );
              })}
              {uniqueDoctorNames.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No active doctors
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
