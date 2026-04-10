const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || "rPEJoG15dtntubxA7insGisIOA7wwJ9Q";

export async function calculateRouteDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  try {
    const locations = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
    const response = await fetch(
      `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${TOMTOM_API_KEY}&routeType=fastest&travelMode=car`
    );
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return {
        distanceMeters: data.routes[0].summary.lengthInMeters,
        travelTimeSeconds: data.routes[0].summary.travelTimeInSeconds,
        points: data.routes[0].legs[0].points
      };
    }
    return null;
  } catch (error) {
    console.error("Erro calculateRouteDistance:", error);
    return null;
  }
}

export function calculateDeliveryCost(distanceMeters: number) {
  const rawKm = distanceMeters / 1000;
  const roundedKm = Math.ceil(rawKm);
  const cost = roundedKm * 1.00;
  return { roundedKm, cost };
}

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}`
    );
    const data = await response.json();
    if (data.addresses && data.addresses.length > 0) {
      return data.addresses[0].address.freeformAddress;
    }
    return "Endereço não encontrado";
  } catch (error) {
    console.error("Erro reverseGeocode:", error);
    return "Erro ao buscar endereço";
  }
}

export async function calculateRouteForDeliveries(origin: { lat: number; lng: number }, destinations: { lat: number; lng: number }[]) {
  let currentPos = origin;
  const remaining = [...destinations];
  const route = [];
  let totalDistanceMeters = 0;
  let totalTimeSeconds = 0;

  while (remaining.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = Math.sqrt(Math.pow(remaining[i].lat - currentPos.lat, 2) + Math.pow(remaining[i].lng - currentPos.lng, 2));
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }

    const nextDest = remaining[closestIndex];
    const segment = await calculateRouteDistance(currentPos, nextDest);
    if (segment) {
      totalDistanceMeters += segment.distanceMeters;
      totalTimeSeconds += segment.travelTimeSeconds;
      route.push({
        ...nextDest,
        distanceFromLast: segment.distanceMeters,
        timeFromLast: segment.travelTimeSeconds
      });
    }

    currentPos = nextDest;
    remaining.splice(closestIndex, 1);
  }

  return { totalDistanceMeters, totalTimeSeconds, route };
}
