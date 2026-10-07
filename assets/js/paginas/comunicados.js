// Comunicados da escola. Professor: avisa a turma ou só os responsáveis dela. Direção: também avisa a escola toda.
// O comunicado aparece em "Calendário e avisos" do aluno e do responsável. O perfil vem de <body data-perfil>.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, avisar, confirmar, vazio, dataBR, comEspera, icone, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { turmasDoProfessor } from '../regras.js';

const perfil = document.body.dataset.perfil;
const main = await iniciar({ perfil, pagina: `${perfil}/comunicados.html`, assistente: perfil === 'professor' });
const MODELOS = ['Reunião de pais e mestres', 'Trazer material na próxima aula', 'Prova remarcada', 'Conversar com a coordenação'];
let turmas, remetente, comunicados, escolaId;

const PUBLICOS = { turma: 'Alunos e responsáveis da turma', responsaveis: 'Só os responsáveis da turma', escola: 'Toda a escola' };
const opcoesPublico = () => (perfil === 'diretor' ? ['turma', 'responsaveis', 'escola'] : ['turma', 'responsaveis']);

function formulario() {
  return `<form id="form-com" class="painel-inline" novalidate>
    <h2 class="esp-t-0">Novo comunicado</h2>
    <div class="campo"><label for="c-publico">Para quem</label><select id="c-publico" class="entrada">${opcoesPublico().map((p) => `<option value="${p}">${PUBLICOS[p]}</option>`).join('')}</select></div>
    <div class="campo" id="campo-turma"><label for="c-turma">Turma</label><select id="c-turma" class="entrada">${turmas.map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`).join('')}</select></div>
    <div class="campo"><label for="c-assunto">Assunto</label><input id="c-assunto" class="entrada" maxlength="80" autocomplete="off" aria-describedby="c-assunto-erro"><p class="erro" id="c-assunto-erro" role="alert"></p></div>
    <div class="campo"><label for="c-texto">Mensagem</label><textarea id="c-texto" class="entrada" maxlength="600" rows="5" aria-describedby="c-texto-erro c-contagem"></textarea><span class="dica" id="c-contagem">0 de 600 letras</span><p class="erro" id="c-texto-erro" role="alert"></p></div>
    <p class="texto-suave texto-pequeno esp-b-1">Assuntos prontos:</p>
    <div class="chips esp-b-4" role="group" aria-label="Assuntos prontos">${MODELOS.map((m) => `<button type="button" class="chip" data-modelo="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <button type="submit" class="botao">${icone('enviar', 20)}Enviar comunicado</button></form>`;
}
function historico() {
  const meus = comunicados.filter((c) => c.escolaId === escolaId && (perfil === 'diretor' ? c.de === remetente : c.por === sessao()?.login));
  if (!meus.length) return vazio('Nenhum comunicado enviado', 'Os comunicados que você enviar aparecem aqui, com a data e quem recebe.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Comunicados enviados</caption>
    <thead><tr><th scope="col">Assunto</th><th scope="col">Para</th><th scope="col">Data</th></tr></thead>
    <tbody>${meus.map((c) => `<tr><td class="titulo-linha"><strong>${esc(c.assunto)}</strong><br><small>${esc(c.texto.length > 90 ? `${c.texto.slice(0, 90)}…` : c.texto)}</small></td><td data-rotulo="Para"><div>${esc(PUBLICOS[c.publico])}${c.publico === 'escola' ? '' : ` · ${esc(c.turma)}`}</div></td><td data-rotulo="Data"><div>${dataBR(c.data)}</div></td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${meus.length} ${plural(meus.length, 'comunicado', 'comunicados')}</p>`;
}
async function mostrar() {
  try {
    const login = sessao();
    escolaId = login.escolaId;
    comunicados = await conjunto('comunicados');
    if (perfil === 'professor') {
      const [logado, professores, tt, alocacoes, matrizes] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes')]);
      const prof = professores.find((p) => p.id === logado.professorId);
      escolaId = prof.escolaId;
      const minhas = turmasDoProfessor(prof.id, { alocacoes, turmas: tt, matriz: matrizes.versoes[0].componentes });
      turmas = minhas.map((m) => m.turma);
      remetente = `${prof.nome} (${[...new Set(minhas.map((m) => m.componente))].join(', ')})`;
    } else {
      turmas = (await turmasEscola()).filter((t) => t.escolaId === escolaId && t.situacao === 'Aprovada');
      remetente = 'Direção';
    }
    main.innerHTML = `<h1>Comunicados</h1>
      <p class="pagina-descricao">${perfil === 'diretor' ? 'Avise uma turma, os responsáveis dela ou a escola toda.' : 'Avise a sua turma ou só os responsáveis dela.'} O aviso aparece no calendário e avisos do aluno e do responsável.</p>
      ${turmas.length ? `<div class="grade-2"><div>${formulario()}</div><div><h2 class="esp-t-0">Enviados</h2>${historico()}</div></div>` : vazio('Nenhuma turma disponível', 'Quando houver turma aprovada com você alocado, dá para enviar comunicados.')}`;
    main.querySelector('#c-publico')?.dispatchEvent(new Event('change', { bubbles: true }));
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'c-publico') main.querySelector('#campo-turma').hidden = e.target.value === 'escola';
});
main.addEventListener('input', (e) => {
  if (e.target.id === 'c-texto') main.querySelector('#c-contagem').textContent = `${e.target.value.length} de 600 letras`;
});
main.addEventListener('click', (e) => {
  const m = e.target.closest('[data-modelo]');
  if (m) { const a = main.querySelector('#c-assunto'); a.value = m.dataset.modelo; a.focus(); }
});
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const assunto = main.querySelector('#c-assunto'), texto = main.querySelector('#c-texto');
  const eA = assunto.value.trim().length < 3 ? 'Escreva o assunto, com pelo menos 3 letras.' : '';
  const eT = texto.value.trim().length < 10 ? 'Escreva a mensagem, com pelo menos 10 letras.' : '';
  main.querySelector('#c-assunto-erro').textContent = eA; main.querySelector('#c-texto-erro').textContent = eT;
  assunto.toggleAttribute('aria-invalid', Boolean(eA)); texto.toggleAttribute('aria-invalid', Boolean(eT));
  if (eA) { assunto.focus(); return; }
  if (eT) { texto.focus(); return; }
  const publico = main.querySelector('#c-publico').value;
  const turma = turmas.find((t) => t.id === main.querySelector('#c-turma').value);
  const destino = publico === 'escola' ? 'toda a escola' : `${PUBLICOS[publico].toLowerCase()} da ${turma.nome}`;
  if (!(await confirmar({ titulo: 'Enviar este comunicado?', texto: `Vai para ${destino}. Depois de enviado, não dá para apagar.`, botao: 'Enviar' }))) return;
  try {
    await comEspera(e.submitter, async () => {
      const lista = await conjunto('comunicados');
      lista.unshift({ id: `COM-${Date.now().toString(36)}`, de: remetente, por: sessao()?.login, assunto: assunto.value.trim(), texto: texto.value.trim(), publico, turmaId: publico === 'escola' ? null : turma.id, turma: publico === 'escola' ? null : turma.nome, escolaId, data: await dataDeReferencia() });
      await salvar('comunicados', lista);
      await registrarAcao(remetente, 'Enviou comunicado', assunto.value.trim());
    });
    avisar('Comunicado enviado.');
    await mostrar();
  } catch { avisar('Não foi possível enviar o comunicado. Confira a conexão e tente de novo.'); }
});
mostrar();
