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
    
    const appointments: Appointment[] = [];
    
    for (let index = 0; index < jsonData.length; index++) {
      const row = jsonData[index];
      let coords = null;
      
      // First, check if Lat/Long columns exist
      const latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
      const lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
      
      if (latValue && lngValue) {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lngValue);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = { lat, lng };
          console.log(`Row ${index}: Found lat/lng in columns:`, coords);
        }
      }
      
      // If no coordinates yet, try to extract from Location URL
      if (!coords && row['Location']) {
        const locationUrl = row['Location'].trim();
        console.log(`Row ${index}: Trying to extract from URL:`, locationUrl);
        
        // Try direct extraction first
        coords = extractCoordinatesFromUrl(locationUrl);
        
        if (coords) {
          console.log(`Row ${index}: Extracted coordinates:`, coords);
        } else if (locationUrl.includes('maps.app.goo.gl') || locationUrl.includes('goo.gl')) {
          // For shortened URLs, try to fetch and expand
          try {
            console.log(`Row ${index}: Attempting to expand short URL...`);
            // Use a CORS proxy to fetch the redirected URL
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(locationUrl)}`;
            const response = await fetch(proxyUrl, { 
              method: 'HEAD',
              redirect: 'follow' 
            });
            
            const finalUrl = response.url;
            console.log(`Row ${index}: Expanded to:`, finalUrl);
            coords = extractCoordinatesFromUrl(finalUrl);
            
            if (coords) {
              console.log(`Row ${index}: Extracted from expanded URL:`, coords);
            }
          } catch (e) {
            console.error(`Row ${index}: Failed to expand URL:`, e);
          }
        }
        
        // If still no coords, try manual parsing of common Google Maps formats
        if (!coords && locationUrl.includes('google') && locationUrl.includes('maps')) {
          // Try to find coordinates in various parts of the URL
          const patterns = [
            /@(-?\d+\.\d+),(-?\d+\.\d+)/,
            /!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)/,
            /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
            /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
          ];
          
          for (const pattern of patterns) {
            const match = locationUrl.match(pattern);
            if (match) {
              coords = {
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2])
              };
              console.log(`Row ${index}: Matched pattern, coords:`, coords);
              break;
            }
          }
        }
      }
      
      const appointment = {
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
      
      appointments.push(appointment);
    }
    
    const withCoords = appointments.filter(a => a.latitude && a.longitude).length;
    console.log(`✅ Fetched ${appointments.length} appointments, ${withCoords} with valid coordinates`);
    
    if (withCoords === 0) {
      console.warn('⚠️ No coordinates found! Check if:');
      console.warn('1. Google Sheet has Lat/Long columns');
      console.warn('2. Location URLs are valid Google Maps links');
      console.warn('3. Sample location URL:', appointments[0]?.location);
    }
    
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
