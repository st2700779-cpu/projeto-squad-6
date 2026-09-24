// Turmas (HU13, HU14): criação bloqueada sem ato vigente; aprovação ou devolução pela direção.
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, pedirTexto, avisar, confirmar } from '../ui.js';
import { carregar, turmasEscola, salvar as salvarDados, registrarAcao } from '../dados.js';
import { definir, obter } from '../estado.js';
import { SERIES, etapaDaSerie, atoDaEtapa, situacaoAto } from '../regras.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/turmas.html', assistente: true });
let turmas, atos;
let papel = obter('papelEscola', 'coordenacao');

async function mostrar() {
  try { [turmas, atos] = await Promise.all([turmasEscola(), carregar('atos')]); desenhar(); } catch { falhaDados(main, mostrar); }
}
const tipo = (s) => ({ Aprovada: 'ok', 'Pendente de aprovação': 'atencao', Devolvida: 'erro', Rascunho: 'neutra' }[s]);
function desenhar(erro = '') {
  const coord = papel === 'coordenacao';
  main.innerHTML = `
    <h1>Turmas</h1>
    <div class="linha-botoes" role="group" aria-label="Papel na escola" style="margin-bottom:.8rem"><span class="texto-suave">Você está como:</span>
      <button type="button" class="botao ${coord ? '' : 'botao-secundario'}" data-papel="coordenacao" aria-pressed="${coord}">Coordenação</button>
      <button type="button" class="botao ${!coord ? '' : 'botao-secundario'}" data-papel="direcao" aria-pressed="${!coord}">Direção</button></div>
    <p class="texto-suave">A coordenação monta a turma e envia para aprovação. A direção aprova ou devolve com justificativa. Professores e estudantes só veem turmas aprovadas.</p>
    ${coord ? `<details class="cartao" ${erro ? 'open' : ''}><summary><strong>Criar nova turma</strong></summary>
      <div class="row g-3" style="margin-top:.2rem">
        <div class="col-md-6 campo"><label for="nt-nome">Nome da turma</label><input id="nt-nome" class="entrada" placeholder="Ex.: 9º ano B"></div>
        <div class="col-md-6 campo"><label for="nt-serie">Série</label><select id="nt-serie" class="entrada">${SERIES.map((s) => `<option>${s}</option>`).join('')}</select></div>
        <div class="col-md-6 campo"><label for="nt-turno">Turno</label><select id="nt-turno" class="entrada"><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>
        <div class="col-md-6 campo"><label for="nt-sala">Sala</label><select id="nt-sala" class="entrada"><option>Sala 01 (40 lugares)</option><option>Sala 05 (35 lugares)</option><option>Laboratório 1 (25 lugares)</option></select></div>
      </div>
      <p class="erro" role="alert">${esc(erro)}</p>
      <button type="button" class="botao" data-criar>Salvar como rascunho</button></details>` : ''}
    ${turmas.map((t) => { const u = t.historico[t.historico.length - 1]; return `
      <div class="cartao"><div class="d-flex justify-content-between flex-wrap gap-2"><div><strong>${esc(t.nome)}</strong> <span class="texto-suave">· ${esc(t.serie)} · ${esc(t.turno)} · ${esc(t.sala)}</span></div>${etiqueta(t.situacao, tipo(t.situacao))}</div>
      <p class="texto-suave" style="font-size:.92rem;margin:.4rem 0">Último registro: ${esc(u[0])} — ${esc(u[1])}${u[2] ? `: “${esc(u[2])}”` : ''}</p>
      <div class="linha-botoes">
        ${coord && ['Rascunho', 'Devolvida'].includes(t.situacao) ? `<button type="button" class="botao" data-enviar="${t.id}">Enviar para aprovação</button>` : ''}
        ${!coord && t.situacao === 'Pendente de aprovação' ? `<button type="button" class="botao" data-aprovar="${t.id}">Aprovar</button><button type="button" class="botao botao-perigo" data-devolver="${t.id}">Devolver</button>` : ''}
      </div></div>`; }).join('')}`;
}
// Salva as turmas e registra no histórico de ações quem fez o quê.
async function salvar(msg, quem, acao, alvo) {
  try { await salvarDados('turmas', turmas); await registrarAcao(quem, acao, alvo); desenhar(); avisar(msg); } catch { avisar('Não foi possível salvar. Tente de novo.'); mostrar(); }
}
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.papel) { papel = b.dataset.papel; definir('papelEscola', papel); desenhar(); }
  if ('criar' in b.dataset) {
    const nome = main.querySelector('#nt-nome').value.trim();
    const serie = main.querySelector('#nt-serie').value;
    if (nome.length < 3) return desenhar('Dê um nome à turma.');
    const ato = atoDaEtapa(atos, ESCOLA, serie);
    if (!ato) return desenhar(`Esta escola não tem autorização para ${etapaDaSerie(serie)}.`);
    if (!situacaoAto(ato).vigente) return desenhar(`A autorização para ${etapaDaSerie(serie)} (${ato.numero}) está vencida. Sem ato vigente, não é possível abrir turma nessa etapa.`);
    const sala = main.querySelector('#nt-sala').value;
    // A capacidade vem do nome da sala ("Sala 01 (40 lugares)") e limita a enturmação.
    turmas.unshift({ id: 'tt' + Date.now(), nome, serie, turno: main.querySelector('#nt-turno').value, sala, capacidade: Number(/\((\d+)/.exec(sala)?.[1] || 0), matriculados: 0, situacao: 'Rascunho', historico: [['Coordenação', 'Criou a turma', '']] });
    salvar('Turma salva como rascunho.', 'Coordenação', 'Criou a turma', nome);
  }
  const t = turmas.find((x) => x.id === (b.dataset.enviar || b.dataset.aprovar || b.dataset.devolver));
  if (b.dataset.enviar) { t.situacao = 'Pendente de aprovação'; t.historico.push(['Coordenação', 'Enviou para aprovação', '']); salvar('Turma enviada para a direção.', 'Coordenação', 'Enviou para aprovação', t.nome); }
  if (b.dataset.aprovar) {
    if (!(await confirmar({ titulo: 'Aprovar a turma?', texto: `A ${t.nome} passa a aparecer para professores e estudantes e já pode receber alunos na enturmação.`, botao: 'Aprovar turma' }))) return;
    t.situacao = 'Aprovada'; t.historico.push(['Direção', 'Aprovou', '']); salvar('Turma aprovada.', 'Direção', 'Aprovou', t.nome);
  }
  if (b.dataset.devolver) {
    const j = await pedirTexto({ titulo: 'Devolver turma', rotulo: 'O que a coordenação precisa ajustar?' });
    if (j === null) return;
    t.situacao = 'Devolvida'; t.historico.push(['Direção', 'Devolveu', j]); salvar('Turma devolvida.', 'Direção', 'Devolveu', t.nome);
  }
});
mostrar();
