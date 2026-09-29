// Turmas (HU13, HU14): criação bloqueada sem ato vigente; aprovação ou devolução pela direção.
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, pedirTexto, avisar, confirmar, vazio } from '../ui.js';
import { carregar, turmasEscola, salvar as salvarDados, registrarAcao } from '../dados.js';
import { definir, obter } from '../estado.js';
import { SERIES, etapaDaSerie, atoDaEtapa, situacaoAto, codigoDaTurma } from '../regras.js';

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
    <h1>Turmas 2026</h1>
    <div class="filtros" role="group" aria-label="Papel na escola">
      <button type="button" data-papel="coordenacao" aria-pressed="${coord}">Atuar como coordenação</button>
      <button type="button" data-papel="direcao" aria-pressed="${!coord}">Atuar como direção</button></div>
    <p class="pagina-descricao">${coord ? 'Monte a turma e envie para a direção aprovar.' : 'Aprove a turma ou devolva com justificativa.'} Só turmas aprovadas aparecem para professores e estudantes.</p>
    ${coord ? `<details class="cartao" ${erro ? 'open' : ''}><summary><strong>Criar nova turma</strong></summary>
      <div class="row g-3 esp-t-1">
        <div class="col-md-6 campo"><label for="nt-nome">Nome da turma</label><input id="nt-nome" class="entrada" placeholder="Ex.: 9º ano B"></div>
        <div class="col-md-6 campo"><label for="nt-serie">Série</label><select id="nt-serie" class="entrada">${SERIES.map((s) => `<option>${s}</option>`).join('')}</select></div>
        <div class="col-md-6 campo"><label for="nt-turno">Turno</label><select id="nt-turno" class="entrada"><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>
        <div class="col-md-6 campo"><label for="nt-sala">Sala</label><select id="nt-sala" class="entrada"><option>Bloco A, sala 03 (36 lugares)</option><option>Bloco B, sala 06 (38 lugares)</option><option>Bloco C, sala 02 (32 lugares)</option><option>Laboratório de Ciências (24 lugares)</option></select></div>
      </div>
      <p class="erro" role="alert">${esc(erro)}</p>
      <button type="button" class="botao" data-criar>Salvar turma como rascunho</button></details>` : ''}
    ${turmas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas da escola e situação de aprovação</caption>
      <thead><tr><th scope="col">Turma</th><th scope="col">Série</th><th scope="col">Turno</th><th scope="col">Sala</th><th scope="col">Situação</th><th scope="col">Último registro</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
      <tbody>${turmas.map((t) => { const u = t.historico[t.historico.length - 1];
        const acao = coord && ['Rascunho', 'Devolvida'].includes(t.situacao) ? `<button type="button" class="botao botao-mini" data-enviar="${t.id}" aria-label="Enviar a turma ${esc(t.nome)} para aprovação">Enviar para aprovação</button>`
          : !coord && t.situacao === 'Pendente de aprovação' ? `<div class="linha-botoes"><button type="button" class="botao botao-mini" data-aprovar="${t.id}" aria-label="Aprovar a turma ${esc(t.nome)}">Aprovar turma</button><button type="button" class="botao botao-perigo botao-mini" data-devolver="${t.id}" aria-label="Devolver a turma ${esc(t.nome)}">Devolver turma</button></div>` : '';
        return `<tr><td class="titulo-linha"><strong>${esc(t.nome)}</strong><small>${esc(codigoDaTurma(t))}</small></td><td class="sem-quebra-texto" data-rotulo="Série">${esc(t.serie)}</td><td data-rotulo="Turno">${esc(t.turno)}</td><td data-rotulo="Sala">${esc(t.sala)}</td><td data-rotulo="Situação">${etiqueta(t.situacao, tipo(t.situacao))}</td><td data-rotulo="Último registro">${esc(u[0])}: ${esc(u[1])}${u[2] ? `<small>“${esc(u[2])}”</small>` : ''}</td><td class="acoes">${acao}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="contagem">${turmas.length} ${turmas.length === 1 ? 'turma' : 'turmas'} · ${turmas.filter((t) => t.situacao === 'Aprovada').length} aprovadas</p>` : vazio('Nenhuma turma cadastrada', 'Use “Criar nova turma” para montar a primeira.')}`;
}
// Salva as turmas e registra no histórico de ações quem fez o quê.
async function salvar(msg, quem, acao, alvo) {
  try { await salvarDados('turmas', turmas); await registrarAcao(quem, acao, alvo); desenhar(); avisar(msg); } catch { avisar('A turma não foi salva e nada foi alterado. Confira a conexão e repita a ação.'); mostrar(); }
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
