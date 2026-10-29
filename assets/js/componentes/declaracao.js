// Peças de tela da declaração dos gastos, usadas pela direção (declarar e acompanhar) e pelo PROFIN (analisar).
import { esc, etiqueta, icone, dataBR, dataHoraBR } from '../ui.js';
import { reais } from '../dominio/profin.js';
import { valorGlosado, valorAprovado, APROVADAS, situacaoDaDeclaracao } from '../dominio/prestacao.js';

export const mesAno = (competencia) => { const [a, m] = competencia.split('-'); return `${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Number(m) - 1]} de ${a}`; };
export const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export const etiquetaDaDeclaracao = (d) => { const s = situacaoDaDeclaracao(d); return etiqueta(s.texto, s.tipo); };

/** Tabela dos lançamentos; itens glosados no retorno aparecem marcados, com o motivo. */
export function tabelaLancamentos(d) {
  const glosas = new Map((d.retorno?.glosas || []).map((g) => [g.indice, g.motivo]));
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Gastos da declaração ${esc(d.id)}</caption>
    <thead><tr><th scope="col">Gasto</th><th scope="col">Fornecedor e documento</th><th scope="col">Comprovante</th><th scope="col" class="num">Valor</th></tr></thead>
    <tbody>${d.lancamentos.map((l, i) => `<tr><td class="titulo-linha"><strong>${esc(l.descricao)}</strong><br><span class="texto-suave texto-pequeno">${dataBR(l.data)} · ${esc(l.natureza)}</span>${glosas.has(i) ? `<br>${etiqueta('Glosado', 'erro')} <span class="texto-pequeno">${esc(glosas.get(i))}</span>` : ''}</td>
      <td data-rotulo="Fornecedor"><div>${esc(l.fornecedor)}<br><span class="texto-suave texto-pequeno">${esc(l.documento)}</span></div></td>
      <td data-rotulo="Comprovante"><div>${icone('documento', 16)} ${esc(l.comprovante.nome)}<br><span class="texto-suave texto-pequeno">${kb(l.comprovante.tamanho)}</span></div></td>
      <td class="num valor-reais" data-rotulo="Valor"><div>${reais(l.valor)}</div></td></tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row" colspan="3">Total declarado</th><td class="num valor-reais"><strong>${reais(d.total)}</strong></td></tr>${valorGlosado(d) ? `<tr><th scope="row" colspan="3">Glosado</th><td class="num valor-reais">− ${reais(valorGlosado(d))}</td></tr>` : ''}${APROVADAS.includes(d.situacao) ? `<tr><th scope="row" colspan="3">Valor aprovado</th><td class="num valor-reais"><strong>${reais(valorAprovado(d))}</strong></td></tr>` : ''}</tfoot></table></div>`;
}

/** Parecer do PROFIN, com quem analisou e quando. Vazio quando ainda não houve retorno. */
export function blocoRetorno(d) {
  const r = d.retorno;
  if (!r) return '';
  const classe = r.tipo === 'devolvida' ? 'devolvida' : r.tipo === 'ressalvas' ? 'ressalvas' : '';
  return `<div class="parecer ${classe}" role="note"><strong>Retorno do PROFIN: ${esc({ aprovada: 'Aprovada', ressalvas: 'Aprovada com ressalvas', devolvida: 'Devolvida para correção' }[r.tipo] || '')}</strong><p class="esp-t-1 esp-b-1">${esc(r.parecer)}</p>${r.pendencia ? `<p class="esp-t-1 esp-b-1"><strong>O que corrigir:</strong> ${esc(r.pendencia)}</p>` : ''}<small>${esc(r.por)} · ${dataHoraBR(r.quando)}</small></div>`;
}

export const historico = (d) => `<ul class="linha-historico" aria-label="Histórico da declaração">${(d.historico || []).map((h) => `<li>${dataHoraBR(h.quando)} · ${esc(h.quem)}: ${esc(h.acao)}</li>`).join('')}</ul>`;
