export const isMapsEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Client-side Google Maps utility.
 * If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured,
 * the system should fallback to a simple neighborhood dropdown using delivery_regions.
 */
if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  // modo sem maps: usar dropdown de bairros
  console.warn("Google Maps API Key not found. Falling back to neighborhood dropdown.");
}

export const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
