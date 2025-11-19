import { useState } from 'react';
import { Doctor } from '@/types/doctor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { UserPlus, MapPin, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchCoordinatesFromGoogleMapsUrl } from '@/utils/coordinateFetcher';

interface DoctorOnboardingProps {
  doctors: Doctor[];
  onAddDoctor: (doctor: Doctor) => void;
  onRemoveDoctor: (doctorId: string) => void;
  onUpdateDoctor: (doctorId: string, updates: Partial<Doctor>) => void;
}

export const DoctorOnboarding = ({ doctors, onAddDoctor, onRemoveDoctor, onUpdateDoctor }: DoctorOnboardingProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [startLocationUrl, setStartLocationUrl] = useState('');
  const [isExtractingCoords, setIsExtractingCoords] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<string | null>(null);
  const [editLocationUrl, setEditLocationUrl] = useState('');
  const { toast } = useToast();

  const handleAddDoctor = async () => {
    if (!name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter doctor name",
        variant: "destructive",
      });
      return;
    }

    setIsExtractingCoords(true);
    
    let coordinates = null;
    if (startLocationUrl.trim()) {
      try {
        coordinates = await fetchCoordinatesFromGoogleMapsUrl(startLocationUrl.trim());
        
        if (!coordinates) {
          toast({
            title: "Location Error",
            description: "Could not extract coordinates from the Google Maps link. Please verify the URL.",
            variant: "destructive",
          });
          setIsExtractingCoords(false);
          return;
        }
      } catch (error) {
        console.error('Error extracting coordinates:', error);
        toast({
          title: "Location Error",
          description: "Failed to process the Google Maps link",
          variant: "destructive",
        });
        setIsExtractingCoords(false);
        return;
      }
    }

    const newDoctor: Doctor = {
      id: `doctor-${Date.now()}`,
      name: name.trim(),
      color: color,
      startLocation: startLocationUrl.trim() || undefined,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
    };

    try {
      await onAddDoctor(newDoctor);
      setName('');
      setColor('#3b82f6');
      setStartLocationUrl('');
      
      toast({
        title: "Doctor Added",
        description: `${name} has been successfully added${coordinates ? ' with starting location' : ''}`,
      });
    } finally {
      setIsExtractingCoords(false);
    }
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

        <div className="space-y-2">
          <Label htmlFor="startLocation">
            Starting Location (Google Maps Link)
            <span className="text-xs text-muted-foreground ml-2">Optional</span>
          </Label>
          <Input
            id="startLocation"
            placeholder="https://maps.app.goo.gl/..."
            value={startLocationUrl}
            onChange={(e) => setStartLocationUrl(e.target.value)}
            disabled={isExtractingCoords}
          />
          <p className="text-xs text-muted-foreground">
            Paste a Google Maps link to set the doctor's starting point
          </p>
        </div>

        <Button onClick={handleAddDoctor} className="w-full" disabled={isExtractingCoords}>
          <UserPlus className="w-4 h-4 mr-2" />
          {isExtractingCoords ? 'Processing Location...' : 'Add Doctor'}
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
                    <div className="flex-1">
                      <p className="font-medium">{doctor.name}</p>
                      {editingDoctor === doctor.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="url"
                            placeholder="New Google Maps Link"
                            value={editLocationUrl}
                            onChange={(e) => setEditLocationUrl(e.target.value)}
                            disabled={isExtractingCoords}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!editLocationUrl) {
                                toast({
                                  title: "Error",
                                  description: "Please enter a Google Maps link",
                                  variant: "destructive"
                                });
                                return;
                              }
                              setIsExtractingCoords(true);
                              try {
                                const coords = await fetchCoordinatesFromGoogleMapsUrl(editLocationUrl);
                                if (coords) {
                                  await onUpdateDoctor(doctor.id, {
                                    startLocation: editLocationUrl,
                                    latitude: coords.lat,
                                    longitude: coords.lng
                                  });
                                  toast({
                                    title: "Location Updated",
                                    description: "Starting location has been updated successfully"
                                  });
                                  setEditingDoctor(null);
                                  setEditLocationUrl('');
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Could not extract coordinates from the link",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to extract coordinates",
                                  variant: "destructive"
                                });
                              } finally {
                                setIsExtractingCoords(false);
                              }
                            }}
                            disabled={isExtractingCoords}
                          >
                            {isExtractingCoords ? 'Processing...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDoctor(null);
                              setEditLocationUrl('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          {doctor.startLocation && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>Starting location set</span>
                            </div>
                          )}
                          {doctor.specialty && (
                            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingDoctor !== doctor.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDoctor(doctor.id);
                          setEditLocationUrl(doctor.startLocation || '');
                        }}
                      >
                        Edit Location
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveDoctor(doctor.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
