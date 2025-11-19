const GOOGLE_MAPS_API_KEY = 'AIzaSyAMqINyXLThCEcAQZB9xXqCNGZJOLXXIto';

// Retry logic wrapper
const retryFetch = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`⚠️ Attempt ${i + 1}/${retries} failed, retrying...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ All ${retries} attempts failed:`, error);
        return null;
      }
    }
  }
  return null;
};

// Fallback geocoding using Google Geocoding API with address
export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!address || address.trim() === '') return null;
  
  try {
    console.log('🌍 Attempting geocoding for address:', address);
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✅ Geocoding successful:', location);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn('⚠️ Geocoding failed:', data.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
};

// Expand shortened Google Maps URL and extract coordinates with retry logic
export const fetchCoordinatesFromGoogleMapsUrl = async (url: string): Promise<{ lat: number; lng: number } | null> => {
  if (!url || !url.includes('maps')) return null;

  try {
    console.log('🔍 Fetching coordinates from URL:', url);
    
    // Try direct extraction first for all URLs
    const directCoords = extractCoordinatesFromExpandedUrl(url);
    if (directCoords) {
      console.log('✅ Coordinates extracted directly from URL:', directCoords);
      return directCoords;
    }
    
    // For shortened URLs (goo.gl or maps.app.goo.gl), try multiple proxies with retries
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.log('📍 Shortened URL detected, trying to expand...');
      
      // Try multiple proxies in sequence
      const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
      ];
      
      for (const proxyUrl of proxies) {
        try {
          console.log('🔄 Trying proxy:', proxyUrl.split('?')[0]);
          const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(8000) // 8 seconds per proxy
          });
          
          if (response.ok) {
            const htmlContent = await response.text();
            console.log('✅ Fetched HTML from proxy');
            
            // Extract coordinates from the HTML
            const extractedCoords = extractCoordinatesFromHtml(htmlContent);
            if (extractedCoords) {
              console.log('✅ Coordinates extracted from proxy HTML:', extractedCoords);
              return extractedCoords;
            }
          }
        } catch (proxyError) {
          console.log('⚠️ Proxy failed, trying next one...');
        }
        
        // Small delay between proxy attempts
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('❌ Could not extract coordinates from URL');
    return null;
  } catch (error) {
    console.error('❌ Error fetching coordinates:', error);
    return null;
  }
};

// Extract coordinates from HTML content (including CAPTCHA pages)
const extractCoordinatesFromHtml = (html: string): { lat: number; lng: number } | null => {
  // IMPORTANT: Google CAPTCHA pages contain the target URL in the <title> tag and in hidden form fields
  // Example: <title>https://www.google.com/maps/place/Anchor+172/@13.0230017,77.5966639,907m/...</title>
  
  // First, try to extract from title tag (most reliable for CAPTCHA pages)
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (titleMatch && titleMatch[1]) {
    const coords = extractCoordinatesFromExpandedUrl(titleMatch[1]);
    if (coords) {
      console.log('✅ Extracted coordinates from HTML title tag');
      return coords;
    }
  }
  
  // Try to extract from hidden continue field in CAPTCHA form
  const continueMatch = html.match(/name="continue"\s+value="([^"]+)"/);
  if (continueMatch && continueMatch[1]) {
    const decodedUrl = continueMatch[1].replace(/&amp;/g, '&');
    const coords = extractCoordinatesFromExpandedUrl(decodedUrl);
    if (coords) {
      console.log('✅ Extracted coordinates from CAPTCHA continue field');
      return coords;
    }
  }
  
  // Try to find coordinates in various other formats within the HTML
  const patterns = [
    // Pattern for data attributes or JSON
    /"center":\s*{\s*"lat":\s*(-?\d+\.?\d*),\s*"lng":\s*(-?\d+\.?\d*)/,
    /"latitude":\s*(-?\d+\.?\d*),\s*"longitude":\s*(-?\d+\.?\d*)/,
    // Pattern for @lat,lng in URLs within HTML
    /@(-?\d+\.\d+),(-?\d+\.\d+),/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    // Pattern for window.APP_INITIALIZATION_STATE or similar
    /\[null,null,(-?\d+\.?\d*),(-?\d+\.?\d*)\]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        console.log('✅ Extracted coordinates from HTML pattern match');
        return { lat, lng };
      }
    }
  }

  return null;
};

// Extract coordinates from expanded Google Maps URL
const extractCoordinatesFromExpandedUrl = (url: string): { lat: number; lng: number } | null => {
  // Try multiple patterns
  const patterns = [
    // Pattern 1: @lat,lng,zoom format
    /@(-?\d+\.\d+),(-?\d+\.\d+),/,
    // Pattern 2: @lat,lng (without zoom)
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    // Pattern 3: !3d (lat) and !4d (lng)
    /!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)/,
    // Pattern 4: q=lat,lng
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // Pattern 5: ll=lat,lng
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // Pattern 6: center=lat,lng
    /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // Pattern 7: /place/name/@lat,lng
    /\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // Validate coordinates
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  return null;
};

// Batch fetch coordinates with rate limiting
export const batchFetchCoordinates = async (
  urls: string[], 
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ lat: number; lng: number } | null>> => {
  const results: Array<{ lat: number; lng: number } | null> = [];
  
  for (let i = 0; i < urls.length; i++) {
    const coords = await fetchCoordinatesFromGoogleMapsUrl(urls[i]);
    results.push(coords);
    
    if (onProgress) {
      onProgress(i + 1, urls.length);
    }
    
    // Add delay to avoid rate limiting (500ms between requests)
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};
