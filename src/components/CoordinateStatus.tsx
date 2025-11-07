import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, MapPin, CheckCircle } from 'lucide-react';
import { Appointment } from '@/types/appointment';

interface CoordinateStatusProps {
  appointments: Appointment[];
}

export const CoordinateStatus = ({ appointments }: CoordinateStatusProps) => {
  const withCoords = appointments.filter(a => a.latitude && a.longitude);
  const withoutCoords = appointments.filter(a => !a.latitude || !a.longitude);
  
  const percentage = appointments.length > 0 
    ? Math.round((withCoords.length / appointments.length) * 100) 
    : 0;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5" />
          Location Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">With Location</span>
            </div>
            <p className="text-2xl font-bold text-success">{withCoords.length}</p>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Missing</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{withoutCoords.length}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Coverage</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-success transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {withoutCoords.length > 0 && (
          <div className="p-3 bg-warning/10 rounded-lg">
            <p className="text-xs font-medium text-warning mb-2">
              ⚠️ Add Lat/Long columns to your Google Sheet
            </p>
            <p className="text-xs text-muted-foreground">
              Appointments missing location data won't appear on the map. 
              Add "Lat" and "Long" columns to your sheet for best results.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
