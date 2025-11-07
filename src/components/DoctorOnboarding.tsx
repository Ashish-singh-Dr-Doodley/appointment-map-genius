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
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const { toast } = useToast();

  const extractCoordinates = (url: string): { lat: number; lng: number } | null => {
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    }
    return null;
  };

  const handleAddDoctor = () => {
    if (!name || !specialty || !phone || !startLocation) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const coords = extractCoordinates(startLocation);
    if (!coords) {
      toast({
        title: "Invalid Location",
        description: "Please enter a valid Google Maps URL",
        variant: "destructive",
      });
      return;
    }

    const newDoctor: Doctor = {
      id: `doctor-${Date.now()}`,
      name,
      specialty,
      phone,
      startLocation,
      latitude: coords.lat,
      longitude: coords.lng,
    };

    onAddDoctor(newDoctor);
    setName('');
    setSpecialty('');
    setPhone('');
    setStartLocation('');
    
    toast({
      title: "Doctor Added",
      description: `${name} has been successfully onboarded`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Doctor Onboarding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Doctor Name</Label>
          <Input
            id="name"
            placeholder="Dr. John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty">Specialty</Label>
          <Input
            id="specialty"
            placeholder="Veterinary Surgeon"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+1 234 567 8900"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Start Location (Google Maps URL)</Label>
          <Input
            id="location"
            placeholder="https://maps.google.com/..."
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
          />
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
                  <div className="flex-1">
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {doctor.phone}
                    </p>
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
