// Expand shortened Google Maps URL and extract coordinates
export const fetchCoordinatesFromGoogleMapsUrl = async (url: string): Promise<{ lat: number; lng: number } | null> => {
  if (!url || !url.includes('maps')) return null;

  try {
    console.log('🔍 Fetching coordinates from URL:', url);
    
    // For shortened URLs (goo.gl or maps.app.goo.gl), we need to follow redirects
    if (url.includes('goo.gl')) {
      console.log('📍 Detected shortened URL, expanding...');
      
      try {
        // Use a CORS proxy to get the actual HTML content
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        const htmlContent = data.contents;
        
        // Extract the actual Google Maps URL from meta tags or redirects
        const urlMatch = htmlContent.match(/url=([^"]+)/);
        const metaMatch = htmlContent.match(/<meta[^>]*content=["']0;url=([^"']+)["']/i);
        const hrefMatch = htmlContent.match(/href=["']([^"']*maps\.google\.com[^"']+)["']/i);
        
        let expandedUrl = url;
        if (metaMatch && metaMatch[1]) {
          expandedUrl = metaMatch[1];
        } else if (urlMatch && urlMatch[1] && urlMatch[1].includes('maps')) {
          expandedUrl = urlMatch[1];
        } else if (hrefMatch && hrefMatch[1]) {
          expandedUrl = hrefMatch[1];
        }
        
        // Decode HTML entities
        expandedUrl = expandedUrl.replace(/&amp;/g, '&');
        console.log('✅ Expanded URL:', expandedUrl);
        
        // Now try to extract coordinates from the expanded URL
        const coords = extractCoordinatesFromExpandedUrl(expandedUrl);
        if (coords) {
          console.log('✅ Coordinates extracted:', coords);
          return coords;
        }
      } catch (error) {
        console.error('❌ Failed to expand URL:', error);
      }
    }
    
    // Try direct extraction for non-shortened URLs
    const coords = extractCoordinatesFromExpandedUrl(url);
    if (coords) {
      console.log('✅ Coordinates extracted from original URL:', coords);
      return coords;
    }
    
    console.log('❌ Could not extract coordinates from URL');
    return null;
  } catch (error) {
    console.error('❌ Error fetching coordinates:', error);
    return null;
  }
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
