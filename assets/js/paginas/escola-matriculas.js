// Pedidos de matrícula (HU12; wireframe W14): confirmar ou recusar com motivo em um painel logo abaixo
// do pedido. Recusar libera a vaga. Busca, exportação para CSV e registro de quem fez cada ação.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, etiqueta, avisar, icone, confirmar, vazio, baixarCSV, combina, dataHoraBR, debounce } from '../ui.js';
import { matriculas, vagas as lerVagas, salvar, conjunto, registrarAcao } from '../dados.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/matriculas.html', assistente: true, papel: 'Secretaria escolar' });
let filtro = 'Aguardando confirmação';
let busca = '';
let recusando = null; // protocolo com o painel de recusa aberto
let erroRecusa = '';
let pedidos, historico;

const ABAS = ['Aguardando confirmação', 'Confirmada', 'Recusada'];
const NOMES = { 'Aguardando confirmação': 'Aguardando', Confirmada: 'Confirmadas', Recusada: 'Recusadas' };
const VAZIOS = {
  'Aguardando confirmação': ['Nenhum pedido aguardando', 'Os pedidos que as famílias enviam pelo portal aparecem aqui para a secretaria conferir.'],
  Confirmada: ['Nenhuma matrícula confirmada ainda', 'Depois de confirmar, o estudante segue para a enturmação.'],
  Recusada: ['Nenhum pedido recusado', 'Os pedidos recusados aparecem aqui com o motivo que a família recebeu.']
};

async function mostrar() {
  try { [pedidos, historico] = await Promise.all([matriculas(), conjunto('historico')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const daEscola = () => pedidos.filter((p) => p.escolaId === ESCOLA);
const visiveis = () => daEscola().filter((p) => p.situacao === filtro && combina(busca, p.estudante, p.protocolo, p.responsavel, p.serie));

function painelRecusa(p) {
  return `<div class="painel-inline" role="group" aria-labelledby="recusa-titulo">
    <h2 id="recusa-titulo">Recusar matrícula de ${esc(p.estudante)}</h2>
    <div class="campo esp-t-0 esp-b-0">
      <label for="motivo">Motivo <span class="dica">(obrigatório; a família verá este texto)</span></label>
      <textarea id="motivo" class="entrada" aria-describedby="motivo-erro" ${erroRecusa ? 'aria-invalid="true"' : ''}></textarea>
      <p id="motivo-erro" class="erro">${esc(erroRecusa)}</p>
    </div>
    <div class="linha-botoes fim esp-t-3">
      <button type="button" class="botao botao-secundario" data-cancelar-recusa>Cancelar</button>
      <button type="button" class="botao" data-confirmar-recusa="${esc(p.protocolo)}">Confirmar recusa</button>
    </div>
  </div>`;
}
function cartao(p) {
  const ultima = historico.find((h) => h.alvo === p.protocolo && /Confirmou|Recusou/.test(h.acao));
  return `
    <div class="cartao d-flex flex-wrap align-items-center gap-3">
      <div class="pedido-info"><strong class="texto-medio">${esc(p.estudante)}</strong><br><span class="texto-suave texto-pequeno">${esc(p.tipo)} · ${esc(p.serie)} · Responsável: ${esc(p.responsavel)} · ${esc(p.protocolo)}</span>
        ${p.motivo ? `<br><span>Motivo: ${esc(p.motivo)}</span>` : ''}
        ${ultima ? `<p class="registro esp-t-1 esp-b-0">${icone('relogio', 16)}${esc(ultima.acao)} por ${esc(ultima.quem)} em ${dataHoraBR(ultima.quando)}</p>` : ''}</div>
      ${etiqueta(p.situacao, p.situacao === 'Confirmada' ? 'ok' : p.situacao === 'Recusada' ? 'erro' : 'atencao')}
      ${p.situacao === 'Aguardando confirmação' ? `<div class="linha-botoes"><button type="button" class="botao" data-confirmar="${esc(p.protocolo)}">Confirmar</button><button type="button" class="botao botao-secundario" data-recusar="${esc(p.protocolo)}" aria-expanded="${recusando === p.protocolo}">Recusar</button></div>` : ''}
      ${p.situacao === 'Confirmada' ? `<a class="botao botao-secundario" href="${link('familia/declaracao.html')}?tipo=matricula&protocolo=${encodeURIComponent(p.protocolo)}">${icone('imprimir', 20)}Declaração</a>` : ''}
    </div>
    ${recusando === p.protocolo ? painelRecusa(p) : ''}`;
}
function desenhar() {
  const lista = visiveis();
  main.innerHTML = `
    <h1>Pedidos de matrícula</h1>
    <div class="filtros" role="group" aria-label="Filtrar por situação">
      ${ABAS.map((a) => { const n = daEscola().filter((p) => p.situacao === a).length; return `<button type="button" data-filtro="${a}" aria-pressed="${a === filtro}">${NOMES[a]}${n ? ` (${n})` : ''}</button>`; }).join('')}
    </div>
    <div class="ferramentas-tabela">
      <div class="campo campo-busca"><label for="busca">Buscar</label><input id="busca" class="entrada" type="search" placeholder="Nome, protocolo ou responsável" value="${esc(busca)}">${icone('busca', 20)}</div>
      <button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button>
    </div>
    <div id="lista-pedidos">${lista.length ? lista.map(cartao).join('') : (busca ? vazio('Nada encontrado', `Nenhum pedido em “${NOMES[filtro]}” combina com “${busca}”.`, 'busca') : vazio(...VAZIOS[filtro]))}</div>`;
  if (recusando) main.querySelector('#motivo')?.focus();
}
// A busca só redesenha a lista, para não tirar o foco do campo enquanto a pessoa digita.
const filtrarBusca = debounce(() => {
  const lista = visiveis();
  main.querySelector('#lista-pedidos').innerHTML = lista.length ? lista.map(cartao).join('') : vazio('Nada encontrado', `Nenhum pedido em “${NOMES[filtro]}” combina com “${busca}”.`, 'busca');
});
main.addEventListener('input', (e) => {
  if (e.target.id !== 'busca') return;
  busca = e.target.value;
  filtrarBusca();
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.filtro) { filtro = b.dataset.filtro; recusando = null; desenhar(); return; }
  if (b.id === 'exportar') {
    baixarCSV(`pedidos-${NOMES[filtro].toLowerCase()}.csv`, ['Protocolo', 'Estudante', 'Tipo', 'Série', 'Responsável', 'Data', 'Situação', 'Motivo'],
      visiveis().map((p) => [p.protocolo, p.estudante, p.tipo, p.serie, p.responsavel, p.data, p.situacao, p.motivo || '']));
    return;
  }
  if (b.dataset.recusar) { recusando = b.dataset.recusar; erroRecusa = ''; desenhar(); return; }
  if ('cancelarRecusa' in b.dataset) {
    const protocolo = recusando;
    recusando = null; desenhar();
    main.querySelector(`[data-recusar="${CSS.escape(protocolo)}"]`)?.focus();
    return;
  }
  try {
    if (b.dataset.confirmar) {
      const p = pedidos.find((x) => x.protocolo === b.dataset.confirmar);
      if (!(await confirmar({ titulo: 'Confirmar a matrícula?', texto: `${p.estudante} passa a ser aluno(a) da escola na ${p.serie}, e a família é avisada. A confirmação não pode ser desfeita por aqui.`, botao: 'Confirmar matrícula' }))) return;
      p.situacao = 'Confirmada';
      await salvar('matriculas', pedidos);
      await registrarAcao('Secretaria escolar', 'Confirmou', p.protocolo);
      historico = await conjunto('historico');
      desenhar(); avisar('Matrícula confirmada. O estudante já pode ser enturmado.');
    }
    if (b.dataset.confirmarRecusa) {
      const motivo = main.querySelector('#motivo').value.trim();
      if (motivo.length < 5) { erroRecusa = 'Escreva o motivo com pelo menos 5 caracteres. A família verá este texto.'; desenhar(); return; }
      const p = pedidos.find((x) => x.protocolo === b.dataset.confirmarRecusa);
      Object.assign(p, { situacao: 'Recusada', motivo });
      const v = await lerVagas();
      if (v[p.escolaId]?.[p.serie] !== undefined && p.tipo !== 'Rematrícula') { v[p.escolaId][p.serie] += 1; await salvar('vagas', v); }
      await salvar('matriculas', pedidos);
      await registrarAcao('Secretaria escolar', 'Recusou', p.protocolo);
      historico = await conjunto('historico');
      recusando = null; erroRecusa = '';
      desenhar(); avisar('Matrícula recusada. A vaga foi liberada.');
    }
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
