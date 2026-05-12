/**
 * Utilitário para integração com a API do TomTom para geocodificação e cálculo de rota/distância.
 * Chave fornecida: rPEJoG15dtntubxA7insGisIOA7wwJ9Q
 * Valor configurado: R$ 1,00 por KM (apenas ida).
 */

const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "rPEJoG15dtntubxA7insGisIOA7wwJ9Q";
// Coords da pizzaria: lat -19.9077, lng -43.8948 (conforme prompt)
const PIZZARIA_COORDS = { lat: -19.9077, lng: -43.8948 };

interface Coords {
  lat: number;
  lng: number;
}

/**
 * [DEPRECATED] Busca coordenadas chamando a API direto do client.
 * Usar /api/geocode em vez disso para não expor a chave desnecessariamente e garantir os parâmetros corretos.
 */
export async function getCoordsFromAddress(): Promise<Coords | null> {
  return null;
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
 * [DEPRECATED]
 */
export async function calculateDeliveryFee(_address?: string): Promise<{
  distance: number;
  fee: number;
  coords: Coords | null;
}> {
  return { distance: 0, fee: 0, coords: null };
}
