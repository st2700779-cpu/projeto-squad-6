// Boletim falado semanal: texto de um modelo fixo, sem inteligência artificial.
// "Nesta semana, [nome] teve [n] faltas. A nota de [disciplina] foi [x]. Aviso da escola: [aviso]."
import { hojeISO } from './hoje.js';
const dataISO = (br) => br.split('/').reverse().join('-');

/** Faltas do estudante nos 7 dias que terminam na chamada mais recente registrada (ou hoje, se for mais nova). */
export function faltasDaSemana(chamadas, turmaId, estudanteId, hoje = hojeISO()) {
  const dias = Object.entries(chamadas?.[turmaId] || {});
  if (!dias.length) return { faltas: 0, de: null, ate: null };
  const ate = dias.map(([d]) => d).sort().at(-1);
  const fim = ate > hoje ? hoje : ate;
  const inicio = new Date(new Date(fim + 'T12:00:00').getTime() - 6 * 864e5).toISOString().slice(0, 10);
  const naSemana = dias.filter(([d]) => d >= inicio && d <= fim);
  return { faltas: naSemana.filter(([, c]) => c.ausentes.includes(estudanteId)).length, de: inicio, ate: fim };
}
/** Disciplina que pede mais atenção: a de menor média; sem nenhuma, a primeira. */
export function disciplinaEmDestaque(linhas) {
  const comNota = linhas.filter((l) => l.media !== null);
  return (comNota.length ? comNota : linhas).reduce((a, b) => (b.media < a.media ? b : a));
}
/** Aviso mais recente, com a primeira frase do texto. */
export function avisoRecente(avisos) {
  const a = [...avisos].sort((x, y) => dataISO(y.data).localeCompare(dataISO(x.data)))[0];
  if (!a) return '';
  const frase = a.texto.split(/(?<=[.!?])\s/)[0];
  return `${a.titulo}. ${frase}`;
}
const num = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** @returns {string} o texto do boletim, com as três frases do modelo. */
export function montarBoletim({ nome, faltas, disciplina, nota, aviso }) {
  const primeiro = nome.split(' ')[0];
  const f = faltas === 0 ? `não teve faltas` : `teve ${faltas} ${faltas === 1 ? 'falta' : 'faltas'}`;
  const n = disciplina ? `A nota de ${disciplina} foi ${num(nota)}. ` : '';
  const a = aviso ? `Aviso da escola: ${aviso}` : 'Nenhum aviso novo da escola.';
  return `Nesta semana, ${primeiro} ${f}. ${n}${a}`;
}
