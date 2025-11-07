import * as XLSX from 'xlsx';
import { Appointment } from '@/types/appointment';

// Extract coordinates from Google Maps URL
export const extractCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
  if (!url) return null;
  
  try {
    // Clean the URL
    const cleanUrl = url.trim();
    
    // Pattern 1: @lat,lng format (most common in Google Maps URLs)
    const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = cleanUrl.match(atPattern);
    if (atMatch) {
      console.log('Matched @ pattern:', atMatch[1], atMatch[2]);
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 2: !3d format (lat) and !4d format (lng) - common in embedded maps
    const d3Pattern = /!3d(-?\d+\.\d+)/;
    const d4Pattern = /!4d(-?\d+\.\d+)/;
    const latMatch = cleanUrl.match(d3Pattern);
    const lngMatch = cleanUrl.match(d4Pattern);
    if (latMatch && lngMatch) {
      console.log('Matched !3d/!4d pattern:', latMatch[1], lngMatch[1]);
      return { lat: parseFloat(latMatch[1]), lng: parseFloat(lngMatch[1]) };
    }

    // Pattern 3: q=lat,lng format
    const qPattern = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qMatch = cleanUrl.match(qPattern);
    if (qMatch) {
      console.log('Matched q= pattern:', qMatch[1], qMatch[2]);
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    
    // Pattern 4: ll=lat,lng format
    const llPattern = /ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const llMatch = cleanUrl.match(llPattern);
    if (llMatch) {
      console.log('Matched ll= pattern:', llMatch[1], llMatch[2]);
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }
    
    // Pattern 5: center=lat,lng format
    const centerPattern = /center=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const centerMatch = cleanUrl.match(centerPattern);
    if (centerMatch) {
      console.log('Matched center= pattern:', centerMatch[1], centerMatch[2]);
      return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };
    }
  } catch (error) {
    console.error('Error extracting coordinates from URL:', url, error);
  }
  
  console.warn('No coordinate pattern matched for URL:', url);
  return null;
};

// Fetch actual coordinates by expanding shortened URL
const fetchCoordinatesFromShortUrl = async (url: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // For goo.gl shortened URLs, we need to make a request to get the full URL
    // However, due to CORS, we'll use a proxy approach
    const response = await fetch(`https://unshorten.me/json/${encodeURIComponent(url)}`);
    const data = await response.json();
    if (data.resolved_url) {
      return extractCoordinatesFromUrl(data.resolved_url);
    }
  } catch (error) {
    console.error('Error fetching coordinates from short URL:', error);
  }
  return null;
};

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
            
            // If no coordinates yet, try to extract from Location URL
            if (!coords && row['Location']) {
              coords = extractCoordinatesFromUrl(row['Location']);
              
              // If still no coordinates and it's a shortened URL, try to expand it
              if (!coords && row['Location'].includes('goo.gl')) {
                coords = await fetchCoordinatesFromShortUrl(row['Location']);
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
