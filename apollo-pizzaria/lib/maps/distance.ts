/**
 * Utilitário para cálculo de distância entre endereços usando Nominatim (OSM) e Fórmula de Haversine.
 * Valor configurado: R$ 1,00 por KM (apenas ida).
 */

const PIZZARIA_ADDRESS = "Av. Jequitinhonha, 218 - Vera Cruz, Belo Horizonte - MG, 30285-130";
const PIZZARIA_COORDS = { lat: -19.9191, lng: -43.9133 }; // Coordenadas aproximadas para Vera Cruz, BH
const FEE_PER_KM = 1.0;

interface Coords {
  lat: number;
  lng: number;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine (em km)
 */
export function calculateHaversineDistance(coords1: Coords, coords2: Coords): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLng = (coords2.lng - coords1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * (Math.PI / 180)) *
      Math.cos(coords2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Busca coordenadas para um endereço ou CEP usando Nominatim
 */
export async function getCoordsFromAddress(address: string): Promise<Coords | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'ApolloPizzariaDeliveryApp/1.0'
        }
      }
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar coordenadas:", error);
    return null;
  }
}

/**
 * Calcula o frete baseado no endereço do cliente
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

  const distance = calculateHaversineDistance(PIZZARIA_COORDS, coords);
  // Arredonda para 2 casas decimais e garante valor mínimo se necessário (opcional)
  // O pedido diz 1,00 o KM, só ida.
  const fee = Math.max(0, distance * FEE_PER_KM);

  return {
    distance,
    fee,
    coords
  };
}
