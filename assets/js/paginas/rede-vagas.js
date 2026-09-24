// Vagas por escola e série, com busca, filtro por município e exportação para CSV.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, vazio, baixarCSV, combina } from '../ui.js';
import { carregar, vagas as lerVagas } from '../dados.js';
import { SERIES, atoDaEtapa, situacaoAto } from '../regras.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/vagas.html', assistente: true });
let escolas, atos, vagas;
let busca = '';
let municipio = '';

async function mostrar() {
  try { [escolas, atos, vagas] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
// Valor de uma célula: número de vagas, "bloq." (ato vencido) ou "—" (série não oferecida).
function valor(e, s) {
  const ato = atoDaEtapa(atos, e.id, s);
  if (!ato) return '—';
  if (!situacaoAto(ato).vigente) return 'bloq.';
  return vagas[e.id]?.[s] ?? 0;
}
const filtradas = () => escolas.filter((e) => (!municipio || e.municipio === municipio) && combina(busca, e.nome, e.municipio, e.dre));

function tabela() {
  const lista = filtradas();
  if (!lista.length) return vazio('Nenhuma escola encontrada', 'Mude a busca ou o município para ver outras escolas.', 'busca');
  const celula = (e, s) => {
    const v = valor(e, s);
    if (v === '—') return '<td class="texto-suave">—</td>';
    if (v === 'bloq.') return '<td><span class="etiqueta etiqueta-erro" title="Ato vencido">bloq.</span></td>';
    return `<td${v === 0 ? ' class="texto-suave"' : ''}>${v}</td>`;
  };
  return `<div class="tabela-rolagem"><table class="tabela"><caption class="sr-only">Vagas por escola e série</caption>
    <thead><tr><th scope="col">Escola</th>${SERIES.map((s) => `<th scope="col">${s.replace(' EM', '')}${s.includes('EM') ? ' (EM)' : ''}</th>`).join('')}</tr></thead>
    <tbody>${lista.map((e) => `<tr><th scope="row" style="background:none;color:var(--tinta);font-size:1rem">${esc(e.nome)}<br><span class="texto-suave" style="font-size:.85rem;font-weight:400">${esc(e.municipio)}</span></th>${SERIES.map((s) => celula(e, s)).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}
function desenhar() {
  const municipios = [...new Set(escolas.map((e) => e.municipio))];
  main.innerHTML = `
    <h1>Vagas por escola</h1>
    <p class="texto-suave">Vagas disponíveis por série. “bloq.” indica etapa com ato autorizativo vencido; “—” indica série que a escola não oferece.</p>
    <div class="ferramentas-tabela">
      <div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Escola, município ou DRE" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div class="campo"><label for="municipio">Município</label><select id="municipio" class="entrada"><option value="">Todos</option>${municipios.map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
      <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>
    </div>
    <div id="tabela-vagas">${tabela()}</div>`;
}
main.addEventListener('input', (e) => { if (e.target.id === 'busca') { busca = e.target.value; main.querySelector('#tabela-vagas').innerHTML = tabela(); } });
main.addEventListener('change', (e) => { if (e.target.id === 'municipio') { municipio = e.target.value; desenhar(); } });
main.addEventListener('click', (e) => {
  if (!e.target.closest('#exportar')) return;
  baixarCSV('vagas-por-escola.csv', ['Escola', 'Município', 'DRE', ...SERIES], filtradas().map((e) => [e.nome, e.municipio, e.dre, ...SERIES.map((s) => valor(e, s))]));
});
mostrar();
