// Peças visuais dos painéis. Toda informação de nível leva cor, símbolo e palavra juntos.
import { esc, icone, numeroBR } from '../ui.js';
import { PRESENCA_MINIMA } from '../dominio/notas.js';

/** Selo de semáforo: quadrado colorido com símbolo e a palavra ao lado. @param {{chave: string, icone: string, texto: string}} nivel */
export const semaforo = (nivel, { grande = false } = {}) =>
  `<span class="semaforo nivel-${nivel.chave}${grande ? ' semaforo-grande' : ''}"><span class="sinal" aria-hidden="true">${nivel.icone ? icone(nivel.icone, 16) : '–'}</span><span>${esc(nivel.texto)}</span></span>`;

/** Anel de frequência: o arco muda de cor com o nível; o número e o texto ficam no centro; o traço preto marca o mínimo (75%). */
export function anelDeFrequencia(pct, nivel, rotulo = 'de frequência') {
  const R = 52, C = 2 * Math.PI * R;
  const v = Math.max(0, Math.min(100, pct));
  const ang = (PRESENCA_MINIMA / 100) * 2 * Math.PI - Math.PI / 2;
  const ponto = (r) => `${(60 + r * Math.cos(ang)).toFixed(1)}`, pontoY = (r) => `${(60 + r * Math.sin(ang)).toFixed(1)}`;
  return `<div class="anel nivel-${nivel.chave}" role="img" aria-label="${numeroBR(pct)}% ${esc(rotulo)}. Mínimo para aprovação: ${PRESENCA_MINIMA}%. Situação: ${esc(nivel.texto)}.">
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="anel-trilho" cx="60" cy="60" r="${R}"/><circle class="anel-valor" cx="60" cy="60" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - v / 100)).toFixed(2)}" transform="rotate(-90 60 60)"/><line class="anel-minimo" x1="${ponto(R - 9)}" y1="${pontoY(R - 9)}" x2="${ponto(R + 9)}" y2="${pontoY(R + 9)}"/></svg>
    <div class="anel-centro"><strong>${numeroBR(pct)}%</strong><span>${esc(rotulo)}</span></div></div>`;
}

/** Barra horizontal com marca no mínimo. */
export const barraDeNivel = (pct, nivel, minimo = PRESENCA_MINIMA) =>
  `<div class="barra-nivel nivel-${nivel.chave}" role="img" aria-label="${numeroBR(pct)}%, mínimo de ${minimo}%"><span style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></span><i class="minimo" style="left:calc(${minimo}% - 1.5px)"></i></div>`;

/** Célula do mapa de calor: símbolo, número e palavra do nível. */
export const celulaDeCalor = (texto, nivel) =>
  `<td class="calor nivel-${nivel.chave}" data-rotulo="${esc(nivel.texto)}"><span class="calor-simbolo" aria-hidden="true">${nivel.icone ? icone(nivel.icone, 15) : ''}</span>${esc(texto)}<small>${esc(nivel.texto)}</small></td>`;

/** Legenda do semáforo (uma vez por tela com mapa de calor). */
export const legendaDeNiveis = (itens) =>
  `<ul class="legenda-calor" aria-label="Legenda das cores">${itens.map(([nivel, texto]) => `<li>${semaforo({ ...nivel, texto })}</li>`).join('')}</ul>`;

/** Mascote dos anos iniciais (coruja). Decorativo. */
export const mascote = () => `<svg class="mascote" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <path class="corpo" d="M22 28 L30 12 L42 24 Q50 20 58 24 L70 12 L78 28 Q88 44 84 64 Q80 90 50 92 Q20 90 16 64 Q12 44 22 28Z"/>
  <circle class="olho" cx="36" cy="46" r="13"/><circle class="olho" cx="64" cy="46" r="13"/>
  <circle class="pupila" cx="38" cy="48" r="5"/><circle class="pupila" cx="62" cy="48" r="5"/>
  <path class="bico" d="M45 58 L55 58 L50 68Z"/><path class="asa" d="M26 66 Q32 78 40 76M74 66 Q68 78 60 76"/></svg>`;

/** Seletor de estudante (responsável com mais de um filho). */
export const seletorDeEstudante = (lista, atualId) => lista.length > 1
  ? `<div class="seletor-estudante" role="group" aria-label="Escolha o estudante">${lista.map((e) => `<button type="button" data-estudante="${e.id}" aria-pressed="${e.id === atualId}"><span>${esc(e.nome.split(' ')[0])}<small>${esc(e.turma)}</small></span></button>`).join('')}</div>`
  : '';

const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "2026-10-07" → "quarta-feira, 7 de outubro de 2026". */
export function dataPorExtenso(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
/** "2026-10-07" → "07/10". */
export const diaMes = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

/**
 * Gráfico de barras simples (uma barra por linha). O valor e o nível aparecem escritos ao lado de cada barra.
 * @param {Array<{rotulo: string, valor: number|null, nivel: object, texto?: string}>} itens
 * @param {{maximo?: number, minimo?: number|null, formato: (v: number) => string}} o `minimo` desenha a marca do mínimo.
 */
export function graficoDeBarras(itens, { maximo = 100, minimo = null, formato }) {
  return `<ul class="barras">${itens.map((i) => `<li class="nivel-${i.nivel.chave}"><span class="barras-rotulo">${esc(i.rotulo)}</span>
    <span class="barras-trilho" aria-hidden="true">${i.valor === null ? '' : `<span style="width:${Math.max(0, Math.min(100, (i.valor / maximo) * 100)).toFixed(1)}%"></span>`}${minimo === null ? '' : `<i class="minimo" style="left:calc(${(minimo / maximo) * 100}% - 1.5px)"></i>`}</span>
    <span><strong>${i.valor === null ? 'sem dados' : esc(i.texto ?? formato(i.valor))}</strong>${semaforo(i.nivel)}</span></li>`).join('')}</ul>`;
}
