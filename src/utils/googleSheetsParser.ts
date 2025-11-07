import { Appointment } from '@/types/appointment';
import { fetchCoordinatesFromGoogleMapsUrl } from './coordinateFetcher';

const SHEET_ID = '1qBQy51cOe7D06gWFskQxar3oB8ZtGzeyBnkQUIcZ8iw';
const GID = '0';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Parse CSV text to JSON
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  console.log('📋 CSV Headers:', headers);
  
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
    console.log('🔄 Fetching data from Google Sheets...');
    const response = await fetch(SHEET_CSV_URL);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheet. Make sure it\'s publicly accessible.');
    }
    
    const csvText = await response.text();
    const jsonData = parseCSV(csvText);
    
    console.log(`📊 Parsed ${jsonData.length} rows from sheet`);
    
    const appointments: Appointment[] = [];
    let processedCount = 0;
    const totalRows = jsonData.length;
    
    console.log(`📊 Processing ${totalRows} appointments...`);
    
    for (let index = 0; index < totalRows; index++) {
      const row = jsonData[index];
      let coords = null;
      
      // Progress indicator
      processedCount++;
      if (processedCount % 5 === 0 || processedCount === totalRows) {
        console.log(`⏳ Progress: ${processedCount}/${totalRows} appointments processed`);
      }
      
      // Method 1: Check for Lat/Long columns (fastest)
      const latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
      const lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
      
      if (latValue && lngValue) {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lngValue);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = { lat, lng };
        }
      }
      
      // Method 2: Fetch from Google Maps URL (if no lat/long columns)
      if (!coords && row['Location']) {
        const locationUrl = row['Location'].trim();
        
        if (locationUrl) {
          coords = await fetchCoordinatesFromGoogleMapsUrl(locationUrl);
          
          if (coords) {
            console.log(`✅ Row ${index + 1} (${row['Customer Name']}): Coordinates found - ${coords.lat}, ${coords.lng}`);
          } else {
            console.warn(`⚠️ Row ${index + 1} (${row['Customer Name']}): Could not fetch coordinates from URL: ${locationUrl}`);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      const appointment: Appointment = {
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
    console.log(`\n✅ COMPLETE: ${appointments.length} appointments loaded, ${withCoords} with coordinates (${Math.round(withCoords/appointments.length*100)}%)`);
    
    if (withCoords === 0) {
      console.error('\n⚠️ NO COORDINATES FOUND!');
      console.error('💡 SOLUTION: Add "Lat" and "Long" columns to your Google Sheet with coordinate values');
      console.error('   Example: Lat: 12.9716, Long: 77.5946');
    } else if (withCoords < appointments.length) {
      console.warn(`\n⚠️ ${appointments.length - withCoords} appointments are missing coordinates`);
      console.warn('💡 Add Lat/Long columns to improve coverage');
    }
    
    return appointments;
  } catch (error) {
    console.error('❌ Error fetching Google Sheet data:', error);
    throw error;
  }
};

// Refresh data - only add new records
export const refreshGoogleSheetData = async (existingAppointments: Appointment[]): Promise<Appointment[]> => {
  const freshData = await fetchGoogleSheetData();
  
  const existingSrNos = new Set(existingAppointments.map(apt => apt.srNo.toString()));
  const newRecords = freshData.filter(apt => !existingSrNos.has(apt.srNo.toString()));
  
  console.log(`🔄 Refresh: ${newRecords.length} new records found`);
  
  return [...existingAppointments, ...newRecords];
};
