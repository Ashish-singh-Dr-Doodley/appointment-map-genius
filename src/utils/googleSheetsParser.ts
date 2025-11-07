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
        if (row['Lat'] && row['Long']) {
          coords = {
            lat: parseFloat(row['Lat']),
            lng: parseFloat(row['Long'])
          };
        }
        
        // If no coordinates yet, try to extract from Location URL
        if (!coords && row['Location']) {
          coords = extractCoordinatesFromUrl(row['Location']);
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
    
    console.log('Fetched appointments from Google Sheets:', appointments.length);
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
