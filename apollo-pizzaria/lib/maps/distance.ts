/**
 * Utilitário para integração com a API do TomTom para geocodificação e cálculo de rota/distância.
 * Chave fornecida: rPEJoG15dtntubxA7insGisIOA7wwJ9Q
 * Valor configurado: R$ 1,00 por KM (apenas ida).
 */

const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "rPEJoG15dtntubxA7insGisIOA7wwJ9Q";
// Coords da pizzaria: lat -19.9077, lng -43.8948 (conforme prompt)
const PIZZARIA_COORDS = { lat: -19.9077, lng: -43.8948 };
const FEE_PER_KM = 1.0;

interface Coords {
  lat: number;
  lng: number;
}

/**
 * Busca coordenadas para um endereço ou CEP usando a API de Search (Geocoding) do TomTom
 */
export async function getCoordsFromAddress(address: string): Promise<Coords | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.tomtom.com/search/2/geocode/${encodedAddress}.json?key=${TOMTOM_API_KEY}&limit=1&countrySet=BR`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].position.lat,
        lng: data.results[0].position.lon
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar coordenadas no TomTom:", error);
    return null;
  }
}

/**
 * Calcula a distância real de rota entre a pizzaria e o cliente usando a Routing API do TomTom
 */
export async function getRouteDistance(clientCoords: Coords): Promise<number> {
  try {
    const locations = `${PIZZARIA_COORDS.lat},${PIZZARIA_COORDS.lng}:${clientCoords.lat},${clientCoords.lng}`;
    const response = await fetch(
      `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${TOMTOM_API_KEY}&routeType=fastest&travelMode=car`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      // Retorna a distância em quilômetros
      return data.routes[0].summary.lengthInMeters / 1000;
    }
    return 0;
  } catch (error) {
    console.error("Erro ao calcular rota no TomTom:", error);
    return 0;
  }
}

/**
 * Calcula o frete baseado no endereço do cliente usando a API do TomTom
 */
export async function calculateDeliveryFee(clientAddress: string): Promise<{
  distance: number;
  fee: number;
  coords: Coords | null;
}> {
  const coords = await getCoordsFromAddress(clientAddress);
  if (!coords) {
    return { distance: 0, fee: 0, coords: null };
  }

  // Usando a distância real de rota em vez de Haversine para maior precisão
  const distance = await getRouteDistance(coords);
  
  // Taxa = Math.ceil(distanceKm) × 1.00 (arredondamento sempre para cima conforme prompt)
  const fee = Math.max(Math.ceil(distance) * FEE_PER_KM, 3.00);

  return {
    distance,
    fee,
    coords
  };
}
