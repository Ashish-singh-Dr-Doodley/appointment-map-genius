import { useState } from 'react';
import { Doctor } from '@/types/doctor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { UserPlus, MapPin, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DoctorOnboardingProps {
  doctors: Doctor[];
  onAddDoctor: (doctor: Doctor) => void;
  onRemoveDoctor: (doctorId: string) => void;
}

export const DoctorOnboarding = ({ doctors, onAddDoctor, onRemoveDoctor }: DoctorOnboardingProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const { toast } = useToast();

  const handleAddDoctor = () => {
    if (!name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter doctor name",
        variant: "destructive",
      });
      return;
    }

    const newDoctor: Doctor = {
      id: `doctor-${Date.now()}`,
      name: name.trim(),
      color: color,
    };

    onAddDoctor(newDoctor);
    setName('');
    setColor('#3b82f6');
    
    toast({
      title: "Doctor Added",
      description: `${name} has been successfully added`,
    });
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="w-5 h-5" />
          Doctor Onboarding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Doctor Name *</Label>
          <Input
            id="name"
            placeholder="Dr. John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDoctor()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Doctor Color *</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-10 cursor-pointer"
            />
            <div 
              className="flex-1 h-10 rounded-md border flex items-center px-3"
              style={{ backgroundColor: color }}
            >
              <span className="text-sm font-medium text-white mix-blend-difference">
                {color}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleAddDoctor} className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>

        {doctors.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Active Doctors ({doctors.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: doctor.color }}
                    />
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      {doctor.specialty && (
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveDoctor(doctor.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
