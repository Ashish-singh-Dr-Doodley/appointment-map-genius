import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Appointment } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { DoctorScore } from '@/types/types-enhanced';
import { getTopDoctorSuggestions } from '@/services/doctorAssignmentService';
import { 
  Zap, 
  MapPin, 
  Clock, 
  User, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle,
  Trophy,
  Medal,
  Award,
  Loader2
} from 'lucide-react';

interface SmartAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  doctors: Doctor[];
  allAppointments: Appointment[];
  onAssign: (appointmentId: string, doctorName: string) => Promise<void>;
}

export function SmartAssignmentDialog({
  open,
  onOpenChange,
  appointment,
  doctors,
  allAppointments,
  onAssign,
}: SmartAssignmentDialogProps) {
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  
  if (!appointment) return null;

  const suggestions = getTopDoctorSuggestions(appointment, doctors, allAppointments, 5);

  const handleAssign = async (doctorName: string) => {
    setIsAssigning(doctorName);
    try {
      await onAssign(appointment.id, doctorName);
      onOpenChange(false);
    } finally {
      setIsAssigning(null);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Smart Doctor Assignment
          </DialogTitle>
          <DialogDescription>
            AI-powered suggestions based on distance, availability, skills, and workload balance
          </DialogDescription>
        </DialogHeader>

        {/* Appointment Info */}
        <Card className="p-4 bg-muted/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-lg">{appointment.customerName}</p>
              <p className="text-sm text-muted-foreground">
                {appointment.petType} - {appointment.subCategory}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{appointment.issue}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline">{appointment.visitDate}</Badge>
              <p className="text-sm text-muted-foreground mt-1">{appointment.visitTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {appointment.location}
          </div>
        </Card>

        {/* Suggestions */}
        <div className="space-y-3 mt-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No doctors available for assignment</p>
              <p className="text-sm">Add doctors with location data to get suggestions</p>
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <Card 
                key={suggestion.doctor.id}
                className={`p-4 transition-all hover:shadow-md ${
                  index === 0 ? 'border-2 border-primary/50 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getRankIcon(index)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{suggestion.doctor.name}</p>
                        <span className={`font-bold ${getScoreColor(suggestion.totalScore)}`}>
                          {suggestion.totalScore}/100
                        </span>
                      </div>
                      
                      {/* Guarantee Badge */}
                      <div className="flex items-center gap-2 mt-1">
                        {suggestion.details.canMeetGuarantee ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Can reach in {suggestion.details.estimatedMinutes} min
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            <Clock className="w-3 h-3 mr-1" />
                            ~{suggestion.details.estimatedMinutes} min travel
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {suggestion.details.distanceKm} km away
                        </span>
                        {suggestion.doctor.startLocation && (
                          <span>| {suggestion.doctor.startLocation}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {suggestion.details.casesToday} cases today
                        </span>
                        {suggestion.doctor.specialty && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {suggestion.doctor.specialty}
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      <p className="text-sm text-primary mt-2 flex items-center gap-1">
                        💡 {suggestion.details.reason}
                      </p>

                      {/* Score Breakdown */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-muted-foreground">Availability</span>
                          <Progress 
                            value={suggestion.breakdown.availability} 
                            className="h-1.5 flex-1"
                          />
                          <span className="w-8 text-right">{suggestion.breakdown.availability}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-muted-foreground">Distance</span>
                          <Progress 
                            value={suggestion.breakdown.distance} 
                            className="h-1.5 flex-1"
                          />
                          <span className="w-8 text-right">{suggestion.breakdown.distance}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-muted-foreground">Skill Match</span>
                          <Progress 
                            value={suggestion.breakdown.skillMatch} 
                            className="h-1.5 flex-1"
                          />
                          <span className="w-8 text-right">{suggestion.breakdown.skillMatch}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleAssign(suggestion.doctor.name)}
                    disabled={isAssigning !== null}
                    size="sm"
                    className={index === 0 ? '' : 'variant-outline'}
                    variant={index === 0 ? 'default' : 'outline'}
                  >
                    {isAssigning === suggestion.doctor.name ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Assign'
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Weight Legend */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium mb-2">Scoring Weights</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Availability: 35%</span>
            <span>Distance: 30%</span>
            <span>Skill Match: 20%</span>
            <span>Load Balance: 10%</span>
            <span>Performance: 5%</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
