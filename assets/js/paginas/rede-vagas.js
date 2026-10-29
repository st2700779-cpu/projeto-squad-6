// Vagas por escola e série, calculadas a partir das turmas (dominio/vagas.js): ninguém digita o número.
// Cada célula mostra as vagas e, embaixo, os lugares livres por turno. Filtros de turno, DRE e município; exportação para CSV.
// Quem é de uma DRE vê só as escolas da sua regional (dre.js).
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, vazio, baixarCSV, combina, debounce, plural, etiqueta } from '../ui.js';
import { carregar, vagasDetalhadas } from '../dados.js';
import { SERIES, atoDaEtapa, situacaoAto } from '../regras.js';
import { TURNOS, textoPorTurno } from '../dominio/vagas.js';
import { daMinhaDre, municipiosDa, avisoDeAcesso, filtrosDreMunicipio } from '../dre.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/vagas.html', assistente: true });
let escolas, atos, detalhe, dres;
let busca = '';
let dreFiltro = '';
let municipio = '';
let turno = '';

async function mostrar() {
  try { [escolas, atos, detalhe, dres] = await Promise.all([carregar('escolas'), carregar('atos'), vagasDetalhadas(), carregar('dres')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const vazia = { lugares: 0, porTurno: {}, aguardando: 0, aguardandoTurma: 0, vagas: 0, excesso: 0, turmas: [] };
/**
 * Valor de uma célula: '—' (a escola não tem a série), 'bloq.' (ato vencido) ou o detalhe calculado.
 * Com um turno escolhido, mostra os lugares livres só daquele turno (os pedidos ainda sem turma não têm turno).
 */
function valor(e, s) {
  const ato = atoDaEtapa(atos, e.id, s);
  if (!ato) return '—';
  if (!situacaoAto(ato).vigente) return 'bloq.';
  const c = detalhe[e.id]?.[s] || vazia;
  return { ...c, numero: turno ? (c.porTurno[turno] ?? 0) : c.vagas };
}
const extras = () => [...new Set(escolas.map((e) => e.municipio))];
const filtradas = () => escolas.filter((e) => daMinhaDre(e) && (!dreFiltro || e.dre === dreFiltro) && (!municipio || e.municipio === municipio) && combina(busca, e.nome, e.municipio, e.dre, e.bairro));

function tabela() {
  const lista = filtradas();
  if (!lista.length) return vazio('Nenhuma escola encontrada', 'Mude a busca, a DRE ou o município para ver outras escolas.');
  const celula = (e, s) => {
    const v = valor(e, s);
    if (v === '—') return '<td class="num texto-suave" aria-label="não oferece">—</td>';
    if (v === 'bloq.') return '<td class="num"><span class="etiqueta etiqueta-erro" title="Ato vencido">bloq.</span></td>';
    const pedidos = v.aguardando + v.aguardandoTurma;
    const nTurmas = v.turmas.filter((t) => t.turno === turno).length;
    const linhas = turno ? [`${nTurmas} ${plural(nTurmas, 'turma', 'turmas')}`] : [textoPorTurno(v.porTurno) || 'sem turma', pedidos ? `${pedidos} ${plural(pedidos, 'pedido', 'pedidos')} sem turma` : ''];
    return `<td class="num vaga-celula${v.numero === 0 ? ' texto-suave' : ''}"><strong>${v.numero}</strong>${linhas.filter(Boolean).map((l) => `<small>${esc(l)}</small>`).join('')}${v.excesso ? `<small class="cor-atencao">${v.excesso} a mais que os lugares</small>` : ''}</td>`;
  };
  const total = lista.reduce((t, e) => t + SERIES.reduce((x, s) => { const v = valor(e, s); return x + (typeof v === 'object' ? v.numero : 0); }, 0), 0);
  return `<div class="tabela-rolagem"><table class="tabela tabela-matriz"><caption class="sr-only">Vagas por escola e série${turno ? `, turno ${esc(turno)}` : ''}</caption>
    <thead><tr><th scope="col">Escola</th>${SERIES.map((s) => `<th scope="col" class="num">${s.replace(' EM', '')}${s.includes('EM') ? ' (EM)' : ''}</th>`).join('')}</tr></thead>
    <tbody>${lista.map((e) => `<tr><th class="celula-escola" scope="row">${esc(e.nome)}${e.exemplo ? ` ${etiqueta('Exemplo')}` : ''}<br><span class="texto-suave texto-pequeno peso-normal">${esc(e.municipio)} · ${esc(e.bairro)} · ${esc(e.dre)}</span></th>${SERIES.map((s) => celula(e, s)).join('')}</tr>`).join('')}</tbody>
  </table></div>
  <p class="contagem">${lista.length} ${plural(lista.length, 'escola', 'escolas')} · ${total} ${turno ? `lugares livres no turno da ${turno.toLowerCase()}` : plural(total, 'vaga aberta no total', 'vagas abertas no total')}</p>`;
}
function ferramentas() {
  return `<div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Escola, município, bairro ou DRE" value="${esc(busca)}">${icone('busca', 20)}</div>
    ${filtrosDreMunicipio({ dres, dre: dreFiltro, municipio, extras: extras() })}
    <div class="campo"><label for="filtro-turno">Turno</label><select id="filtro-turno" class="entrada"><option value="">Todos os turnos</option>${TURNOS.map((t) => `<option ${t === turno ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>`;
}
function desenhar() {
  main.innerHTML = `
    <h1>Vagas por escola</h1>
    <p class="texto-suave">As vagas são calculadas a partir das turmas aprovadas: lugares da sala − alunos, menos os pedidos de matrícula que ainda não têm turma. Embaixo do número, os lugares livres em cada turno. “bloq.” indica ato autorizativo vencido; “—”, série que a escola não tem.</p>
    <p class="texto-suave texto-pequeno">Escolas com a etiqueta <strong>Exemplo</strong>: escolas reais da rede estadual (nome, município e DRE da SEDUC), com turmas e vagas de demonstração.</p>
    ${avisoDeAcesso()}
    <div class="ferramentas-tabela" id="ferramentas">${ferramentas()}</div>
    <div id="tabela-vagas">${tabela()}</div>`;
}
const redesenharTabela = () => { main.querySelector('#tabela-vagas').innerHTML = tabela(); };
const filtrarBusca = debounce(redesenharTabela);
main.addEventListener('input', (e) => { if (e.target.id === 'busca') { busca = e.target.value; filtrarBusca(); } });
main.addEventListener('change', (e) => {
  if (e.target.id === 'filtro-dre') { dreFiltro = e.target.value; if (municipio && !municipiosDa(dres, dreFiltro, extras()).includes(municipio)) municipio = ''; main.querySelector('#ferramentas').innerHTML = ferramentas(); redesenharTabela(); main.querySelector('#filtro-dre').focus(); }
  if (e.target.id === 'filtro-municipio') { municipio = e.target.value; redesenharTabela(); }
  if (e.target.id === 'filtro-turno') { turno = e.target.value; redesenharTabela(); }
});
main.addEventListener('click', (e) => {
  if (!e.target.closest('#exportar')) return;
  // Uma linha por escola e série, com as vagas e os lugares livres de cada turno.
  const linhas = filtradas().flatMap((e) => SERIES.map((s) => [e, s, valor(e, s)]).filter(([, , v]) => v !== '—').map(([esc2, s, v]) => (v === 'bloq.'
    ? [esc2.nome, esc2.municipio, esc2.bairro, esc2.dre, s, 'bloq. (ato vencido)', '', '', '', '']
    : [esc2.nome, esc2.municipio, esc2.bairro, esc2.dre, s, v.vagas, ...TURNOS.map((t) => v.porTurno[t] ?? ''), v.aguardando + v.aguardandoTurma])));
  baixarCSV('vagas-por-escola.csv', ['Escola', 'Município', 'Bairro', 'DRE', 'Série', 'Vagas', ...TURNOS.map((t) => `Lugares livres (${t})`), 'Pedidos sem turma'], linhas);
});
mostrar();
