import { Appointment } from '@/types/appointment';
import { extractCoordinatesFromUrl } from './excelParser';

const SHEET_ID = '1qBQy51cOe7D06gWFskQxar3oB8ZtGzeyBnkQUIcZ8iw';
const GID = '0';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Geocode using Google Geocoding API (if available) or use a free alternative
const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!address) return null;
  
  try {
    // Using Nominatim (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
  
  return null;
};

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
    
    for (let index = 0; index < Math.min(jsonData.length, 50); index++) {
      const row = jsonData[index];
      let coords = null;
      
      console.log(`\n--- Processing Row ${index + 1} ---`);
      console.log('Customer:', row['Customer Name']);
      console.log('Location URL:', row['Location']);
      console.log('Address:', row['Detailed address']);
      
      // Method 1: Check for Lat/Long columns
      const latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
      const lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
      
      if (latValue && lngValue) {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lngValue);
        if (!isNaN(lat) && !isNaN(lng)) {
          coords = { lat, lng };
          console.log('✅ Method 1: Found in Lat/Long columns:', coords);
        }
      }
      
      // Method 2: Extract from Location URL
      if (!coords && row['Location']) {
        coords = extractCoordinatesFromUrl(row['Location']);
        if (coords) {
          console.log('✅ Method 2: Extracted from URL:', coords);
        } else {
          console.log('❌ Method 2: Could not extract from URL');
        }
      }
      
      // Method 3: Geocode the detailed address as fallback
      if (!coords && row['Detailed address']) {
        console.log('🔍 Method 3: Trying to geocode address...');
        coords = await geocodeAddress(row['Detailed address'] + ', Bengaluru, India');
        if (coords) {
          console.log('✅ Method 3: Geocoded from address:', coords);
        } else {
          console.log('❌ Method 3: Geocoding failed');
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (coords) {
        console.log('✅ FINAL: Coordinates found:', coords);
      } else {
        console.log('❌ FINAL: No coordinates found for this row');
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
    console.log(`\n✅ SUMMARY: ${appointments.length} appointments total, ${withCoords} with coordinates`);
    
    if (withCoords === 0) {
      console.error('⚠️ NO COORDINATES FOUND!');
      console.error('Possible issues:');
      console.error('1. Sheet needs Lat/Long columns');
      console.error('2. Location URLs are shortened and cannot be expanded');
      console.error('3. Detailed addresses could not be geocoded');
      console.error('\n💡 SOLUTION: Add Lat and Long columns to your Google Sheet');
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
