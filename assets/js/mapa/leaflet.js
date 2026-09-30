// Carrega o Leaflet (cdnjs) sob demanda e cria o mapa com tiles do OpenStreetMap.
// Sem internet ou com a CDN bloqueada, devolve null e a tela mostra a lista no lugar do mapa.
import { carregarScript } from '../qr.js';

const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const ATRIBUICAO = '© <a href="https://www.openstreetmap.org/copyright">Contribuidores do OpenStreetMap</a>';

function carregarCss(url) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = url;
  document.head.append(l);
}

/** @returns {Promise<{L: object, mapa: object}|null>} */
export async function criarMapa(el, { centro = [-10.95, -37.25], zoom = 9 } = {}) {
  if (navigator.onLine === false) return null;
  try {
    carregarCss(`${BASE}leaflet.css`);
    await carregarScript(`${BASE}leaflet.js`);
    // eslint-disable-next-line no-undef
    const mapa = L.map(el, { center: centro, zoom, keyboard: true });
    // eslint-disable-next-line no-undef
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: ATRIBUICAO }).addTo(mapa);
    // eslint-disable-next-line no-undef
    return { L, mapa };
  } catch { return null; }
}
