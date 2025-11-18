import { Appointment } from '@/types/appointment';
import { fetchCoordinatesFromGoogleMapsUrl, geocodeAddress } from './coordinateFetcher';

const SHEET_ID = '1bDXAgS6AXf3c3hOW1HGOaI8eWq9PP7hxtfkgEo7rrYs';
const GID = '0';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// Parse CSV text to JSON
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  console.log('📋 CSV Headers:', headers);
  console.log('📋 Header count:', headers.length);
  
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
    
    console.log(`Row ${i} - Values count: ${values.length}`, values.slice(-2)); // Log last 2 values (should be Long, Lat)
    
    const row: any = {};
    headers.forEach((header, index) => {
      if (header) { // Only map non-empty headers
        row[header] = values[index] || '';
      }
    });
    
    console.log(`Row ${i} - Long: "${row['Long']}", Lat: "${row['Lat']}"`);
    data.push(row);
  }
  
  return data;
};

// Fetch data from Google Sheets
export const fetchGoogleSheetData = async (onProgress?: (current: number, total: number) => void): Promise<Appointment[]> => {
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
      if (onProgress) {
        onProgress(processedCount, totalRows);
      }
      if (processedCount % 5 === 0 || processedCount === totalRows) {
        console.log(`⏳ Progress: ${processedCount}/${totalRows} appointments processed`);
      }
      
      // Method 1: Check for Lat/Long columns (fastest)
      // Handle various column name variations including typos
      let latValue = row['Lat'] || row['lat'] || row['Latitude'] || row['latitude'];
      let lngValue = row['Long'] || row['long'] || row['Longitude'] || row['longitude'];
      
      // Special case: Google Sheet has "Longitude" and "Latitutde" (with typo) but they're SWAPPED!
      // The "Longitude" column actually contains latitude values
      const longitudeCol = row['Longitude'];
      const latitudeCol = row['Latitutde'] || row['latitutde'];
      
      if (longitudeCol && latitudeCol) {
        // These columns are swapped in the sheet, so we swap them back
        latValue = longitudeCol; // "Longitude" column has lat values
        lngValue = latitudeCol;  // "Latitutde" column has lng values
        console.log(`🔄 Row ${index + 1}: Using swapped Longitude/Latitutde columns`);
      }
      
      console.log(`Row ${index + 1} - Customer: ${row['Customer Name']}, Lat: ${latValue}, Long: ${lngValue}`);
      
      // Validate and parse the coordinates
      if (latValue && lngValue) {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lngValue);
        
        // Validate coordinates are in correct range
        if (!isNaN(lat) && !isNaN(lng) && 
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180) {
          coords = { lat, lng };
          console.log(`✅ Row ${index + 1} (${row['Customer Name']}): Using coordinates - Lat: ${lat}, Lng: ${lng}`);
        } else {
          console.warn(`⚠️ Row ${index + 1}: Invalid coordinates - Lat: ${lat}, Lng: ${lng}`);
        }
      }
      
      // Method 2: Fetch from Google Maps URL or geocode address
      if (!coords && row['Location']) {
        const locationUrl = row['Location'].trim();
        
        if (locationUrl) {
          // Always try URL extraction first (handles both full and shortened URLs)
          coords = await fetchCoordinatesFromGoogleMapsUrl(locationUrl);
          if (coords) {
            console.log(`✅ Row ${index + 1} (${row['Customer Name']}): URL extraction - ${coords.lat}, ${coords.lng}`);
          }
          
          // If URL extraction failed, try geocoding the detailed address as fallback
          if (!coords) {
            console.warn(`⚠️ Row ${index + 1} (${row['Customer Name']}): URL extraction failed, trying geocoding...`);
            const addressToGeocode = row['Detailed address'] || row['Detailed Address'];
            if (addressToGeocode && addressToGeocode.trim()) {
              coords = await geocodeAddress(addressToGeocode);
              if (coords) {
                console.log(`✅ Row ${index + 1} (${row['Customer Name']}): Geocoded from address - ${coords.lat}, ${coords.lng}`);
              } else {
                console.warn(`⚠️ Row ${index + 1} (${row['Customer Name']}): Geocoding failed for address: ${addressToGeocode}`);
              }
            } else {
              console.warn(`⚠️ Row ${index + 1} (${row['Customer Name']}): No detailed address available for geocoding`);
            }
          }
          
          // Add small delay to avoid rate limiting (reduced from 500ms to 200ms)
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      const appointment: Appointment = {
        id: `${row['Sr No'] || index}`,
        srNo: parseInt(row['Sr No']) || index,
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
      
      console.log(`Row ${index + 1} final appointment:`, {
        customerName: appointment.customerName,
        latitude: appointment.latitude,
        longitude: appointment.longitude
      });
      
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
