// Linha do tempo da vida escolar: lista ordenada (<ol>) com uma entrada por ano. Quando a versão da matriz curricular
// muda de um ano para o outro no mesmo curso, a entrada ganha o aviso "Matriz mudou" com a explicação curta.
import { esc } from '../ui.js';

/**
 * @param {Array<{ano:number, serie:string, escola:string, evento:string, matriz:string|null}>} itens do mais antigo para o mais novo
 * @param {Record<string, {curso:string, versao:string, resumo:string, mudou?:string}>} matrizes
 */
export function linhaDoTempo(itens, matrizes) {
  let anterior = null;
  const lis = itens.map((i) => {
    const m = i.matriz ? matrizes[i.matriz] : null;
    const mudou = m && anterior && anterior.curso === m.curso && anterior.versao !== m.versao;
    const etapa = m && anterior && anterior.curso !== m.curso;
    if (m) anterior = m;
    return `<li class="${mudou ? 'mudou' : ''}">
      <h3>${i.ano} · ${esc(i.serie)}</h3>
      <p>${esc(i.escola)}</p>
      <p class="evento">${esc(i.evento)}</p>
      <p class="matriz">${m ? `Matriz: ${esc(m.curso)}, versão ${esc(m.versao)}` : 'Fora da matriz estadual (rede anterior)'}</p>
      ${etapa ? `<p class="mudanca"><strong>Nova etapa:</strong> ${esc(m.curso)}.</p>` : ''}
      ${mudou ? `<p class="mudanca"><strong>Matriz mudou de ${esc(anteriorVersao(itens, i, matrizes))} para ${esc(m.versao)}.</strong> ${esc(m.mudou || m.resumo)}</p>` : ''}
    </li>`;
  });
  return `<ol class="linha-tempo" aria-label="Vida escolar, do primeiro ano ao ano atual">${lis.join('')}</ol>`;
}
// Versão da matriz do item anterior do mesmo curso.
function anteriorVersao(itens, atual, matrizes) {
  const idx = itens.indexOf(atual);
  const curso = matrizes[atual.matriz].curso;
  for (let k = idx - 1; k >= 0; k -= 1) {
    const m = itens[k].matriz && matrizes[itens[k].matriz];
    if (m && m.curso === curso) return m.versao;
  }
  return '';
}
