import { Appointment } from '@/types/appointment';
import { extractCoordinatesFromUrl } from './excelParser';

const SHEET_ID = '1qBQy51cOe7D06gWFskQxar3oB8ZtGzeyBnkQUIcZ8iw';
const GID = '0';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Parse CSV text to JSON
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
};

// Fetch data from Google Sheets
export const fetchGoogleSheetData = async (): Promise<Appointment[]> => {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheet data. Make sure the sheet is publicly accessible.');
    }
    
    const csvText = await response.text();
    const jsonData = parseCSV(csvText);
    
    const appointments: Appointment[] = await Promise.all(
      jsonData.map(async (row: any, index) => {
        let coords = null;
        
        // First, check if Lat/Long columns exist
        const latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
        const lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
        
        if (latValue && lngValue) {
          const lat = parseFloat(latValue);
          const lng = parseFloat(lngValue);
          if (!isNaN(lat) && !isNaN(lng)) {
            coords = { lat, lng };
          }
        }
        
        // If no coordinates yet, try to extract from Location URL
        if (!coords && row['Location']) {
          coords = extractCoordinatesFromUrl(row['Location']);
          
          // If URL extraction failed, try fetching the full URL for shortened links
          if (!coords && (row['Location'].includes('goo.gl') || row['Location'].includes('maps.app.goo.gl'))) {
            try {
              // Extract from shortened URL by making a request
              const shortUrl = row['Location'];
              const response = await fetch(`https://unshorten.me/json/${encodeURIComponent(shortUrl)}`);
              const data = await response.json();
              if (data.resolved_url) {
                coords = extractCoordinatesFromUrl(data.resolved_url);
              }
            } catch (e) {
              console.error('Failed to expand short URL:', row['Location']);
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
    
    const withCoords = appointments.filter(a => a.latitude && a.longitude).length;
    console.log(`Fetched ${appointments.length} appointments, ${withCoords} with coordinates`);
    return appointments;
  } catch (error) {
    console.error('Error fetching Google Sheet data:', error);
    throw error;
  }
};

// Refresh data - only add new records
export const refreshGoogleSheetData = async (existingAppointments: Appointment[]): Promise<Appointment[]> => {
  const freshData = await fetchGoogleSheetData();
  
  // Get existing Sr Nos
  const existingSrNos = new Set(existingAppointments.map(apt => apt.srNo.toString()));
  
  // Filter only new records
  const newRecords = freshData.filter(apt => !existingSrNos.has(apt.srNo.toString()));
  
  console.log(`Refresh: Found ${newRecords.length} new records out of ${freshData.length} total`);
  
  // Return existing + new records
  return [...existingAppointments, ...newRecords];
};
