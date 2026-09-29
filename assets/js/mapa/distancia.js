// Distância em linha reta entre dois pontos (fórmula de Haversine) e ordenação das escolas por proximidade.
const RAIO_TERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

/** Distância em km entre dois pontos {lat, lng}. */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}
/** Escolas com `km` a partir de `origem`, da mais perto para a mais longe. */
export const ordenarPorDistancia = (escolas, origem) =>
  escolas.map((e) => ({ ...e, km: haversine(origem, e) })).sort((x, y) => x.km - y.km);
export const kmBR = (km) => `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
