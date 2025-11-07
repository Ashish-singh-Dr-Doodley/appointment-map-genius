import * as XLSX from 'xlsx';
import { Appointment } from '@/types/appointment';
import { fetchCoordinatesFromGoogleMapsUrl } from './coordinateFetcher';

export const parseExcelFile = async (file: File): Promise<Appointment[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const appointments: Appointment[] = await Promise.all(
          jsonData.map(async (row: any, index) => {
            let coords = null;
            
            // First, check if Lat/Long columns exist
            // Try both normal and potentially swapped columns
            let latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
            let lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
            
            // If one is missing, try swapped column names (some sheets swap Lat/Long)
            if (!latValue && lngValue) {
              latValue = lngValue;
              lngValue = row['Lat'] || row['lat'];
            }
            
            if (latValue && lngValue) {
              const lat = parseFloat(latValue);
              const lng = parseFloat(lngValue);
              
              // Validate coordinates are in proper range
              if (!isNaN(lat) && !isNaN(lng) && 
                  lat >= -90 && lat <= 90 && 
                  lng >= -180 && lng <= 180) {
                coords = { lat, lng };
                console.log(`✅ Row ${index + 1}: Using Lat/Long - ${lat}, ${lng}`);
              } else {
                console.warn(`⚠️ Row ${index + 1}: Invalid coordinates - Lat: ${lat}, Lng: ${lng}`);
              }
            }
            
            // If no coordinates yet, try to fetch from Location URL or geocode address
            if (!coords) {
              const locationUrl = row['Location'];
              const detailedAddress = row['Detailed address'] || row['Detailed Address'];
              
              if (locationUrl) {
                coords = await fetchCoordinatesFromGoogleMapsUrl(locationUrl);
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // If still no coords and we have a detailed address, try geocoding
              if (!coords && detailedAddress) {
                const { geocodeAddress } = await import('./coordinateFetcher');
                coords = await geocodeAddress(detailedAddress);
                if (coords) {
                  console.log(`✅ Row ${index + 1}: Geocoded from address - ${coords.lat}, ${coords.lng}`);
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }
            }
            
            return {
              id: `${row['Sr No'] || index}`,
              srNo: row['Sr No'] || index,
              petType: row['Pet Type'] || '',
              subCategory: row['Sub- category'] || '',
              queryDate: row['Query Date'] || '',
              mobileNumber: row['Mobile Number'] || '',
              customerName: row['Customer Name'] || '',
              doctorName: row['Doctor Name'] || undefined,
              sourceOfOrder: row['Source of order'] || '',
              agentName: row['Agent Name'] || '',
              location: row['Location'] || '',
              detailedAddress: row['Detailed address'] || undefined,
              issue: row['Issue'] || '',
              visitDate: row['Visit Date'] || '',
              visitTime: row['Visit Time'] || '',
              status: (row['Status'] || 'Pending') as Appointment['status'],
              baseCharges: parseFloat(row['Base Charges']) || 0,
              latitude: coords?.lat,
              longitude: coords?.lng,
            };
          })
        );
        
        console.log('Parsed appointments:', appointments.filter(a => a.latitude && a.longitude).length, 'with coordinates');
        resolve(appointments);
      } catch (error) {
        console.error('Parse error:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
