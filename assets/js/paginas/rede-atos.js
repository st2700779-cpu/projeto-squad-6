// Atos autorizativos (W15): acompanhamento pelo vencimento, busca, filtro por DRE, exportação para CSV
// e pedido de renovação quando faltam 120 dias ou menos (ou o ato já venceu).
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, dataBR, icone, avisar, confirmar, vazio, baixarCSV, combina, dataHoraBR, debounce } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao } from '../dados.js';
import { situacaoAto, DIAS_RENOVACAO } from '../regras.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/atos.html', assistente: true });
let dre = '';
let busca = '';
let escolas, atos, renovacoes;

async function mostrar() {
  try { [escolas, atos, renovacoes] = await Promise.all([carregar('escolas'), carregar('atos'), conjunto('renovacoes')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const chave = (a) => `${a.escolaId}|${a.etapa}`;
const linhasFiltradas = () => atos
  .map((a) => ({ a, e: escolas.find((x) => x.id === a.escolaId), s: situacaoAto(a), r: renovacoes.find((r) => r.ato === chave(a)) }))
  .filter((l) => (!dre || l.e.dre === dre) && combina(busca, l.e.nome, l.a.numero, l.a.etapa))
  .sort((x, y) => x.s.dias - y.s.dias);

function tabela(linhas) {
  if (!linhas.length) return vazio('Nenhum ato encontrado', 'Mude a busca ou o filtro de DRE para ver outros atos.', 'busca');
  return `<div class="tabela-rolagem"><table class="tabela"><caption class="sr-only">Atos autorizativos ordenados pelo vencimento</caption>
    <thead><tr><th scope="col">Escola</th><th scope="col">Etapa</th><th scope="col">Ato</th><th scope="col">Validade</th><th scope="col">Situação</th><th scope="col">Renovação</th></tr></thead>
    <tbody>${linhas.map(({ a, e, s, r }) => `<tr><td>${esc(e.nome)}<br><span class="texto-suave texto-pequeno">${esc(e.dre)}</span></td><td>${esc(a.etapa)}</td><td>${esc(a.numero)}</td><td>${dataBR(a.validade)}</td><td>${etiqueta(s.texto, s.tipo)}</td>
      <td>${r ? `${etiqueta('Pedida', 'info')}<br><span class="texto-suave texto-pequeno">${dataHoraBR(r.quando)}</span>` : s.dias <= DIAS_RENOVACAO ? `<button type="button" class="botao botao-secundario" data-renovar="${esc(chave(a))}">Iniciar renovação</button>` : '<span class="texto-suave">—</span>'}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function desenhar() {
  const dres = [...new Set(escolas.map((e) => e.dre))];
  const linhas = linhasFiltradas();
  const vencidos = linhas.filter((l) => !l.s.vigente).length;
  const aVencer = linhas.filter((l) => l.s.tipo === 'atencao').length;
  const semPedido = linhas.filter((l) => l.s.dias <= DIAS_RENOVACAO && !l.r);
  main.innerHTML = `
    <h1 class="esp-t-0 esp-b-4">Atos autorizativos</h1>
    ${semPedido.length ? `<div class="alerta-erro esp-b-4" role="status">${icone('alerta', 20)}<span>${semPedido.length} ato${semPedido.length > 1 ? 's' : ''} vencido${semPedido.length > 1 ? 's' : ''} ou a ${DIAS_RENOVACAO} dias do vencimento sem pedido de renovação. Inicie a renovação para a escola não ficar impedida de abrir turmas e matricular.</span></div>` : ''}
    <div class="numeros"><div class="numero${vencidos ? ' alerta' : ''}"><strong>${vencidos}</strong><span>atos vencidos</span></div><div class="numero"><strong>${aVencer}</strong><span>vencem em até ${DIAS_RENOVACAO} dias</span></div><div class="numero"><strong>${linhas.length}</strong><span>atos acompanhados</span></div></div>
    <div class="ferramentas-tabela">
      <div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Escola, número do ato ou etapa" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div class="campo"><label for="dre">DRE</label><select id="dre" class="entrada"><option value="">Todas as DREs</option>${dres.map((d) => `<option ${d === dre ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
      <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>
    </div>
    <div id="tabela-atos">${tabela(linhas)}</div>
    <p class="texto-suave">Escola com ato vencido não pode abrir turma nem receber matrícula naquela etapa. Os atos são do Conselho Estadual de Educação.</p>`;
}

main.addEventListener('change', (e) => { if (e.target.id === 'dre') { dre = e.target.value; desenhar(); } });
// A busca só troca a tabela, para o campo não perder o foco enquanto a pessoa digita.
const filtrarBusca = debounce(() => { main.querySelector('#tabela-atos').innerHTML = tabela(linhasFiltradas()); });
main.addEventListener('input', (e) => { if (e.target.id === 'busca') { busca = e.target.value; filtrarBusca(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'exportar') {
    baixarCSV('atos-autorizativos.csv', ['Escola', 'DRE', 'Etapa', 'Ato', 'Validade', 'Situação', 'Renovação'],
      linhasFiltradas().map(({ a, e: esc2, s, r }) => [esc2.nome, esc2.dre, a.etapa, a.numero, dataBR(a.validade), s.texto, r ? `Pedida em ${dataHoraBR(r.quando)}` : '']));
    return;
  }
  if (b.dataset.renovar) {
    const a = atos.find((x) => chave(x) === b.dataset.renovar);
    const escola = escolas.find((x) => x.id === a.escolaId);
    if (!(await confirmar({ titulo: 'Iniciar a renovação?', texto: `Abre o pedido de renovação do ${a.numero} (${a.etapa}) do(a) ${escola.nome} junto ao Conselho Estadual de Educação.`, botao: 'Iniciar renovação' }))) return;
    try {
      renovacoes.push({ ato: b.dataset.renovar, quando: new Date().toISOString(), quem: 'Técnico da SEDUC' });
      await salvar('renovacoes', renovacoes);
      await registrarAcao('Técnico da SEDUC', `Iniciou renovação do ${a.numero}`, escola.nome);
      desenhar(); avisar('Pedido de renovação iniciado.');
    } catch {
      avisar('Não foi possível salvar. Tente de novo.');
      mostrar();
    }
  }
});
mostrar();
