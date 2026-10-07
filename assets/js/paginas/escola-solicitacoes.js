// Central de solicitações da secretaria: fila dos pedidos (declaração, histórico, atestado, correção de cadastro) com situação,
// prazo em cor e as ações de cada etapa. Os pedidos chegam do portal do aluno e do responsável.
import { iniciar, link, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, dataBR, plural, vazio, avisar, comEspera, icone } from '../ui.js';
import { conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { semaforoPrazo, diasEntre } from '../regras.js';
import { ETAPAS, proximaEtapa } from '../solicitacoes.js';
import { semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/solicitacoes.html', assistente: true });
const TIPO = { Pendente: 'atencao', 'Em andamento': 'info', Pronta: 'ok', Entregue: 'neutra' };
const ACAO = { Pendente: 'Iniciar', 'Em andamento': 'Marcar como pronta', Pronta: 'Marcar como entregue' };
const DECLARACAO = { 'Declaração de matrícula': 'matricula', 'Declaração de frequência': 'frequencia' };
let lista, hoje, filtro = 'abertas';

const abertas = (s) => !['Pronta', 'Entregue'].includes(s.situacao);
function filtradas() {
  const base = lista.filter((s) => s.escolaId === sessao().escolaId);
  const f = filtro === 'abertas' ? base.filter((s) => s.situacao !== 'Entregue') : filtro === 'todas' ? base : base.filter((s) => s.situacao === filtro);
  return f.sort((a, b) => (abertas(b) - abertas(a)) || a.prazo.localeCompare(b.prazo));
}
function desenhar() {
  const base = lista.filter((s) => s.escolaId === sessao().escolaId);
  const conta = (sit) => base.filter((s) => s.situacao === sit).length;
  const atrasadas = base.filter((s) => abertas(s) && diasEntre(hoje, s.prazo) < 0).length;
  const linhas = filtradas();
  const filtros = [['abertas', `Em aberto (${base.filter((s) => s.situacao !== 'Entregue').length})`], ...ETAPAS.map((e) => [e, `${e} (${conta(e)})`]), ['todas', `Todas (${base.length})`]];
  main.innerHTML = `
    <h1>Solicitações</h1>
    <p class="pagina-descricao">Pedidos de declaração, histórico, atestado e correção de cadastro, na ordem do prazo. Cada pedido anda da esquerda para a direita: pendente, em andamento, pronta, entregue.</p>
    <dl class="resumo-linha">
      <div class="${conta('Pendente') ? 'atencao' : ''}"><dd>${conta('Pendente')}</dd><dt>${plural(conta('Pendente'), 'pendente', 'pendentes')}</dt></div>
      <div><dd>${conta('Em andamento')}</dd><dt>em andamento</dt></div>
      <div><dd>${conta('Pronta')}</dd><dt>${plural(conta('Pronta'), 'pronta para retirar', 'prontas para retirar')}</dt></div>
      <div class="${atrasadas ? 'alerta' : ''}"><dd>${atrasadas}</dd><dt>${plural(atrasadas, 'fora do prazo', 'fora do prazo')}</dt></div></dl>
    <div class="filtros" role="group" aria-label="Filtrar por situação">${filtros.map(([v, t]) => `<button type="button" data-filtro="${esc(v)}" aria-pressed="${v === filtro}">${esc(t)}</button>`).join('')}</div>
    ${linhas.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Fila de solicitações da secretaria</caption>
      <thead><tr><th scope="col">Pedido</th><th scope="col">Estudante</th><th scope="col">Feito por</th><th scope="col">Prazo</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${linhas.map((s) => `<tr><td class="titulo-linha"><strong>${esc(s.tipo)}</strong><br><small>${esc(s.id)} · feito em ${dataBR(s.criadaEm)}</small>${s.observacao ? `<p class="nota-contexto">${esc(s.observacao)}</p>` : ''}</td><td data-rotulo="Estudante"><div>${esc(s.estudante)}</div></td><td data-rotulo="Feito por"><div>${esc(s.solicitante)}</div></td>
        <td data-rotulo="Prazo"><div>${abertas(s) ? `${semaforo(semaforoPrazo(diasEntre(hoje, s.prazo)))}<small>até ${dataBR(s.prazo)}</small>` : '<span class="texto-suave">—</span>'}</div></td>
        <td data-rotulo="Situação"><div>${etiqueta(s.situacao, TIPO[s.situacao])}</div></td>
        <td class="acoes"><div class="linha-botoes coluna-botoes">${ACAO[s.situacao] ? `<button type="button" class="botao botao-secundario botao-mini" data-avancar="${esc(s.id)}">${ACAO[s.situacao]}</button>` : ''}${DECLARACAO[s.tipo] && s.estudanteId && s.situacao !== 'Entregue' ? `<a class="botao botao-secundario botao-mini" href="${link('aluno/declaracao.html')}?tipo=${DECLARACAO[s.tipo]}&estudante=${encodeURIComponent(s.estudanteId)}">${icone('documento', 18)}Ver prévia e emitir</a>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="contagem">${linhas.length} ${plural(linhas.length, 'pedido', 'pedidos')} · ordenados pelo prazo mais próximo</p>` : vazio('Nenhum pedido nesta situação', 'Os pedidos feitos pelos alunos e responsáveis aparecem aqui.')}`;
}
async function mostrar() {
  try { [lista, hoje] = await Promise.all([conjunto('solicitacoes'), dataDeReferencia()]); desenhar(); } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', async (e) => {
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; desenhar(); main.querySelector(`[data-filtro="${filtro}"]`).focus(); return; }
  const b = e.target.closest('[data-avancar]');
  if (!b) return;
  const pedido = lista.find((s) => s.id === b.dataset.avancar);
  const nova = proximaEtapa(pedido.situacao);
  try {
    await comEspera(b, async () => { pedido.situacao = nova; await salvar('solicitacoes', lista); await registrarAcao(sessao().nome, `Marcou como ${nova.toLowerCase()}: ${pedido.tipo}`, pedido.id); });
    avisar(`${pedido.id}: ${nova.toLowerCase()}.`);
    desenhar();
    main.querySelector('.tabela button, .tabela a')?.focus();
  } catch { pedido.situacao = ETAPAS[ETAPAS.indexOf(nova) - 1]; avisar('Não foi possível atualizar o pedido. Confira a conexão e tente de novo.'); }
});
mostrar();
