// Atos autorizativos (W15): painel por urgência, com faixas de prioridade (vencido, até 30 e até 90 dias),
// quantas turmas e quantos estudantes dependem de cada ato, filtros por município e escola, exportação para CSV
// e pedido de renovação quando faltam 120 dias ou menos (ou o ato já venceu).
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, dataBR, icone, avisar, confirmar, vazio, baixarCSV, combina, dataHoraBR, debounce } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, turmasDaRede } from '../dados.js';
import { situacaoAto, DIAS_RENOVACAO } from '../regras.js';
import { FAIXAS_ATO, faixaDoAto, impactoDoAto } from '../dominio/impacto-atos.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/atos.html', assistente: true });
let municipio = '';
let escolaFiltro = '';
let busca = '';
let escolas, atos, renovacoes, turmas;

async function mostrar() {
  try { [escolas, atos, renovacoes, turmas] = await Promise.all([carregar('escolas'), carregar('atos'), conjunto('renovacoes'), turmasDaRede()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const chave = (a) => `${a.escolaId}|${a.etapa}`;
const linhasFiltradas = () => atos
  .map((a) => ({ a, e: escolas.find((x) => x.id === a.escolaId), s: situacaoAto(a), r: renovacoes.find((r) => r.ato === chave(a)), impacto: impactoDoAto(a, turmas) }))
  .map((l) => ({ ...l, faixa: faixaDoAto(l.s.dias) }))
  .filter((l) => (!municipio || l.e.municipio === municipio) && (!escolaFiltro || l.e.id === escolaFiltro) && combina(busca, l.e.nome, l.a.numero, l.a.etapa, l.a.tipo))
  .sort((x, y) => x.s.dias - y.s.dias);

function tabela(linhas) {
  if (!linhas.length) return vazio('Nenhum ato encontrado', 'Mude a busca ou o filtro de DRE para ver outros atos.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Atos autorizativos ordenados pelo vencimento</caption>
    <thead><tr><th scope="col">Escola</th><th scope="col">Ato</th><th scope="col">Prioridade</th><th scope="col">Afetados</th><th scope="col">Renovação</th></tr></thead>
    <tbody>${linhas.map(({ a, e, s, r, faixa, impacto }) => `<tr><td class="titulo-linha">${esc(e.nome)}<br><span class="texto-suave texto-pequeno">${esc(e.municipio)} · ${esc(e.dre)}</span></td><td data-rotulo="Ato">${esc(a.tipo)} · ${esc(a.etapa)}<br><span class="texto-suave texto-pequeno">${esc(a.numero)}</span></td><td data-rotulo="Prioridade">${etiqueta(faixa.rotulo, faixa.tipo)}<br><span class="texto-suave texto-pequeno">${dataBR(a.validade)} · ${s.dias < 0 ? `há ${-s.dias} ${-s.dias === 1 ? 'dia' : 'dias'}` : `em ${s.dias} ${s.dias === 1 ? 'dia' : 'dias'}`}</span></td><td data-rotulo="Afetados">${impacto.turmas ? `${impacto.turmas} ${impacto.turmas === 1 ? 'turma' : 'turmas'}<br><span class="texto-suave texto-pequeno">${impacto.alunos} estudantes</span>` : '<span class="texto-suave">nenhuma turma</span>'}</td>
      ${r ? `<td data-rotulo="Renovação">${etiqueta('Pedida', 'info')}<span class="texto-suave texto-pequeno">${dataHoraBR(r.quando)}</span></td>` : s.dias <= DIAS_RENOVACAO ? `<td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-renovar="${esc(chave(a))}">Iniciar renovação</button></td>` : '<td data-rotulo="Renovação"><span class="texto-suave">—</span></td>'}</tr>`).join('')}</tbody>
  </table></div>
  <p class="contagem">${linhas.length} ${linhas.length === 1 ? 'ato' : 'atos'} · ordenados pelo vencimento mais próximo</p>`;
}

function desenhar() {
  const municipios = [...new Set(escolas.map((e) => e.municipio))];
  const escolasDoFiltro = escolas.filter((e) => !municipio || e.municipio === municipio);
  const linhas = linhasFiltradas();
  const contar = (chave) => linhas.filter((l) => l.faixa.chave === chave).length;
  const emRisco = linhas.filter((l) => ['vencido', 'ate30', 'ate90'].includes(l.faixa.chave));
  const turmasEmRisco = emRisco.reduce((t, l) => t + l.impacto.turmas, 0);
  const alunosEmRisco = emRisco.reduce((t, l) => t + l.impacto.alunos, 0);
  const semPedido = linhas.filter((l) => l.s.dias <= DIAS_RENOVACAO && !l.r);
  main.innerHTML = `
    <h1 class="esp-t-0 esp-b-4">Atos autorizativos</h1>
    <dl class="resumo-linha">
      <div class="${contar('vencido') ? 'alerta' : ''}"><dd>${contar('vencido')}</dd><dt>${contar('vencido') === 1 ? 'ato vencido' : 'atos vencidos'}</dt></div>
      <div class="${contar('ate30') ? 'alerta' : ''}"><dd>${contar('ate30')}</dd><dt>vencem em até 30 dias</dt></div>
      <div class="${contar('ate90') ? 'atencao' : ''}"><dd>${contar('ate90')}</dd><dt>vencem em até 90 dias</dt></div>
      <div class="${alunosEmRisco ? 'alerta' : ''}"><dd>${alunosEmRisco}</dd><dt>estudantes em ${turmasEmRisco} ${turmasEmRisco === 1 ? 'turma' : 'turmas'} dependem desses atos</dt></div>
    </dl>
    <div class="ferramentas-tabela">
      <div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Escola, tipo, número do ato ou etapa" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div class="campo"><label for="municipio">Município</label><select id="municipio" class="entrada"><option value="">Todos os municípios</option>${municipios.map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
      <div class="campo"><label for="escola">Escola</label><select id="escola" class="entrada"><option value="">Todas as escolas</option>${escolasDoFiltro.map((e) => `<option value="${e.id}" ${e.id === escolaFiltro ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></div>
      <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>
    </div>
    <div id="tabela-atos">${tabela(linhas)}</div>
    <ul class="legenda" aria-label="Faixas de prioridade">${FAIXAS_ATO.map((f) => `<li>${etiqueta(f.rotulo, f.tipo)}</li>`).join('')}</ul>
    <p class="texto-suave">Escola com ato vencido não pode abrir turma nem receber matrícula naquela etapa. Estudantes afetados: matriculados nas turmas aprovadas da etapa do ato. Os atos são do Conselho Estadual de Educação.</p>`;
}

main.addEventListener('change', (e) => {
  if (e.target.id === 'municipio') { municipio = e.target.value; if (escolaFiltro && !escolas.find((x) => x.id === escolaFiltro && (!municipio || x.municipio === municipio))) escolaFiltro = ''; desenhar(); }
  if (e.target.id === 'escola') { escolaFiltro = e.target.value; desenhar(); }
});
// A busca só troca a tabela, para o campo não perder o foco enquanto a pessoa digita.
const filtrarBusca = debounce(() => { main.querySelector('#tabela-atos').innerHTML = tabela(linhasFiltradas()); });
main.addEventListener('input', (e) => { if (e.target.id === 'busca') { busca = e.target.value; filtrarBusca(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'exportar') {
    baixarCSV('atos-autorizativos.csv', ['Escola', 'Município', 'DRE', 'Tipo', 'Etapa', 'Ato', 'Validade', 'Prioridade', 'Dias', 'Turmas afetadas', 'Estudantes afetados', 'Renovação'],
      linhasFiltradas().map(({ a, e: esc2, s, r, faixa, impacto }) => [esc2.nome, esc2.municipio, esc2.dre, a.tipo, a.etapa, a.numero, dataBR(a.validade), faixa.rotulo, s.dias, impacto.turmas, impacto.alunos, r ? `Pedida em ${dataHoraBR(r.quando)}` : '']));
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
      avisar('O pedido de renovação não foi registrado. Confira a conexão e clique em Iniciar renovação de novo.');
      mostrar();
    }
  }
});
mostrar();
