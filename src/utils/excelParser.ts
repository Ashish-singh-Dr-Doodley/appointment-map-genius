import * as XLSX from 'xlsx';
import { Appointment } from '@/types/appointment';

// Extract coordinates from Google Maps URL
export const extractCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
  if (!url) return null;
  
  try {
    // Pattern 1: @lat,lng format
    const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = url.match(atPattern);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 2: !3d format (lat) and !4d format (lng)
    const d3Pattern = /!3d(-?\d+\.\d+)/;
    const d4Pattern = /!4d(-?\d+\.\d+)/;
    const latMatch = url.match(d3Pattern);
    const lngMatch = url.match(d4Pattern);
    if (latMatch && lngMatch) {
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }

    // Pattern 3: q=lat,lng format
    const qPattern = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qMatch = url.match(qPattern);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
  } catch (error) {
    console.error('Error extracting coordinates:', error);
  }
  
  return null;
};

export const parseExcelFile = async (file: File): Promise<Appointment[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const appointments: Appointment[] = jsonData.map((row: any, index) => {
          const coords = extractCoordinatesFromUrl(row['Location'] || '');
          
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
        });
        
        resolve(appointments);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
