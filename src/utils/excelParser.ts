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
            if (row['Lat'] && row['Long']) {
              coords = {
                lat: parseFloat(row['Lat']),
                lng: parseFloat(row['Long'])
              };
            }
            
            // If no coordinates yet, try to fetch from Location URL using coordinateFetcher
            if (!coords && row['Location']) {
              coords = await fetchCoordinatesFromGoogleMapsUrl(row['Location']);
              
              // Add delay to avoid rate limiting
              if (coords) {
                await new Promise(resolve => setTimeout(resolve, 300));
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
