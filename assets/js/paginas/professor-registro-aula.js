// Registro de aula: o professor anota o conteúdo de cada aula e, no mesmo formulário, faz a chamada.
//  - O número de aulas não é digitado: vem da grade de horários da turma naquele dia (dominio/diario-bimestral.js).
//  - A chamada começa com todos presentes; marque só quem faltou. Ao registrar, cada falta soma as aulas do dia no diário
//    e a chamada entra na trilha da frequência (a frequência do bimestre e a presença da média saem dela).
//  - A data já com chamada (feita antes) não soma de novo: a chamada aparece só para conferir.
// A tela sugere as datas com chamada feita e sem registro, e deixa editar ou remover um registro (a chamada fica).
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, confirmar, dataBR, vazio, comEspera, plural, icone } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao, dataDeReferencia, diario, letivo } from '../dados.js';
import { turmasDoProfessor } from '../regras.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarRegistroDeAula, montarRegistroDeAula, datasSemRegistro, CONTEUDO_MIN } from '../dominio/vida-escolar.js';
import { aulasNaGrade, aplicarChamada, atualizarMedias, diaDaSemana } from '../dominio/diario-bimestral.js';
import { horaDaAula } from '../dominio/horario.js';
import { estudantesInativos } from '../dominio/movimentacao.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/registro-aula.html', assistente: true });
let prof, minhas, registros, chamadas, horarios, dados, movs, hoje, editando = null, preencher = {};
const DIA = { seg: 'segunda-feira', ter: 'terça-feira', qua: 'quarta-feira', qui: 'quinta-feira', sex: 'sexta-feira', sab: 'sábado', dom: 'domingo' };
const turmaDaUrl = new URLSearchParams(location.search).get('turma');

const chaveTurma = (m) => `${m.turma.id}|${m.componente}`;
const opcoesTurma = () => minhas.map((m) => [chaveTurma(m), `${m.turma.nome} · ${m.componente}`]);
const turnoDa = (turmaId) => minhas.find((m) => m.turma.id === turmaId)?.turma.turno || 'Manhã';
const alunosDa = (turmaId) => { const fora = estudantesInativos(movs); return (dados[turmaId] || []).filter((a) => !fora.has(a.id)); };

/** Caixa com as aulas do dia pela grade (substitui o antigo "Quantas aulas"). */
function blocoAulas(turmaId, componente, data) {
  const g = aulasNaGrade(horarios, turmaId, componente, data);
  if (!g.quantas) return `<p class="aulas-da-grade sem-aula" id="aulas-grade">${icone('alerta', 20)}<span>Pela grade, ${esc(componente)} não tem aula nesta turma ${data ? `na ${DIA[diaDaSemana(data)] || 'data escolhida'}` : 'nesta data'}. Escolha uma data com aula.</span></p>`;
  const horas = g.posicoes.map((p) => { const h = horaDaAula(turnoDa(turmaId), p - 1); return `${p}ª aula (${h.inicio}–${h.fim})`; }).join(', ');
  return `<p class="aulas-da-grade" id="aulas-grade">${icone('relogio', 20)}<span><strong>${g.quantas} ${g.quantas === 1 ? 'aula' : 'aulas'}</strong> pela grade: ${esc(horas)}. Não é preciso digitar.</span></p>`;
}
/** Chamada do dia: todos presentes; marque quem faltou. Data com chamada já feita: só conferência. */
function blocoChamada(turmaId, data, marcados = []) {
  const alunos = alunosDa(turmaId);
  if (!alunos.length) return '<p class="texto-suave">Nenhum estudante enturmado nesta turma.</p>';
  const feita = chamadas[turmaId]?.[data];
  if (feita) {
    const nomes = alunos.filter((a) => feita.ausentes.includes(a.id)).map((a) => a.nome);
    return `<fieldset class="chamada-registro"><legend>Chamada de ${dataBR(data)}</legend><p class="esp-t-0 esp-b-0">${icone('ok', 18)} Já registrada (${Number(feita.aulas) || 1} ${Number(feita.aulas) > 1 ? 'aulas' : 'aula'}): ${nomes.length ? `${nomes.length} ${nomes.length > 1 ? 'faltaram' : 'faltou'}: ${esc(nomes.join(', '))}` : 'todos presentes'}. Não é lançada de novo.</p></fieldset>`;
  }
  return `<fieldset class="chamada-registro" aria-describedby="chamada-resumo"><legend>Chamada · todos começam presentes, marque só quem faltou</legend>
    <ul class="lista-chamada">${alunos.map((a) => `<li><label><input type="checkbox" name="ausentes" value="${a.id}" ${marcados.includes(a.id) ? 'checked' : ''}><span>${esc(a.nome)}</span></label></li>`).join('')}</ul>
    <p class="texto-suave texto-pequeno esp-b-0" id="chamada-resumo">${alunos.length - marcados.length} ${plural(alunos.length - marcados.length, 'presente', 'presentes')} · ${marcados.length} ${plural(marcados.length, 'falta', 'faltas')}</p></fieldset>`;
}

function formulario() {
  const r = editando ? registros.find((x) => x.id === editando) : null;
  const inicial = turmaDaUrl && minhas.find((m) => m.turma.id === turmaDaUrl) ? chaveTurma(minhas.find((m) => m.turma.id === turmaDaUrl)) : chaveTurma(minhas[0]);
  const v = { turma: r ? `${r.turmaId}|${r.componente}` : preencher.turma || inicial, data: r?.data || preencher.data || hoje, conteudo: r?.conteudo ?? preencher.conteudo ?? '', tarefa: r?.tarefa ?? preencher.tarefa ?? '', ausentes: preencher.ausentes || [] };
  const [turmaId, componente] = v.turma.split('|');
  const sugestoes = datasSemRegistro(chamadas, registros.filter((x) => x.professorId === prof.id), turmaId, componente, 6);
  return `<form id="form-aula" class="form-cadastro" novalidate>
    <h2 class="esp-t-0">${r ? 'Editar registro' : 'Registrar aula e chamada'}</h2>
    <div class="grade-2">
      ${campo({ nome: 'turma', rotulo: 'Turma e componente', valor: v.turma, opcoes: opcoesTurma(), obrigatorio: true, atributos: r ? 'disabled' : '' })}
      ${campo({ nome: 'data', rotulo: 'Data da aula', tipo: 'date', valor: v.data, obrigatorio: true, atributos: `max="${hoje}" ${r ? 'disabled' : ''}` })}
    </div>
    ${sugestoes.length && !r ? `<p class="texto-pequeno esp-b-2" id="sugestoes">Com chamada feita e sem registro: ${sugestoes.map((d) => `<button type="button" class="botao botao-secundario botao-mini" data-data="${d}">${dataBR(d).slice(0, 5)}</button>`).join(' ')}</p>` : ''}
    <div id="area-grade">${blocoAulas(turmaId, componente, v.data)}</div>
    ${r ? '' : `<div id="area-chamada">${blocoChamada(turmaId, v.data, v.ausentes)}</div>`}
    <div class="campo"><label for="f-conteudo">Conteúdo trabalhado <span class="obrigatorio" aria-hidden="true">*</span></label><textarea id="f-conteudo" name="conteudo" class="entrada" rows="4" maxlength="600" aria-describedby="f-conteudo-dica f-conteudo-erro" required>${esc(v.conteudo)}</textarea><span class="dica" id="f-conteudo-dica">Pelo menos ${CONTEUDO_MIN} letras. Exemplo: Funções do 1º grau: gráfico e exercícios da página 42.</span><p class="erro" id="f-conteudo-erro" role="alert"></p></div>
    <div class="campo"><label for="f-tarefa">Tarefa de casa <span class="dica">(opcional)</span></label><textarea id="f-tarefa" name="tarefa" class="entrada" rows="2" maxlength="300" aria-describedby="f-tarefa-erro">${esc(v.tarefa)}</textarea><p class="erro" id="f-tarefa-erro" role="alert"></p></div>
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <div class="linha-botoes"><button type="submit" class="botao">${r ? 'Salvar alterações' : 'Registrar aula e chamada'}</button>${r ? '<button type="button" class="botao botao-texto" data-acao="cancelar">Cancelar edição</button>' : ''}</div>
  </form>`;
}

function lista() {
  const meus = registros.filter((r) => r.professorId === prof.id).sort((a, b) => b.data.localeCompare(a.data) || a.turma.localeCompare(b.turma));
  if (!meus.length) return vazio('Nenhuma aula registrada', 'Os registros que você fizer aparecem aqui, do mais recente ao mais antigo.');
  const chamadaDe = (r) => {
    const c = chamadas[r.turmaId]?.[r.data];
    if (!c) return '<span class="texto-suave">sem chamada</span>';
    const n = c.ausentes.length;
    return n ? `${n} ${n === 1 ? 'falta' : 'faltas'}` : 'todos presentes';
  };
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Aulas registradas</caption>
    <thead><tr><th scope="col">Data</th><th scope="col">Turma</th><th scope="col" class="num">Aulas</th><th scope="col">Chamada</th><th scope="col">Conteúdo</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${meus.map((r) => `<tr><td class="titulo-linha"><strong>${dataBR(r.data)}</strong></td><td data-rotulo="Turma"><div>${esc(r.turma)}<small>${esc(r.componente)}</small></div></td><td class="num" data-rotulo="Aulas"><div>${r.aulas}</div></td><td data-rotulo="Chamada"><div>${chamadaDe(r)}</div></td><td data-rotulo="Conteúdo"><div>${esc(r.conteudo)}${r.tarefa ? `<small>Tarefa: ${esc(r.tarefa)}</small>` : ''}</div></td><td class="acoes"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-editar="${r.id}">Editar</button><button type="button" class="botao botao-texto botao-mini" data-remover="${r.id}">Remover</button></div></td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${meus.length} ${plural(meus.length, 'registro', 'registros')} · ${meus.reduce((s, r) => s + r.aulas, 0)} aulas</p>`;
}

function desenhar(foco = '') {
  main.innerHTML = `<h1 tabindex="-1">Registro de aula</h1>
    <p class="pagina-descricao">Anote o conteúdo e faça a chamada no mesmo lugar. As aulas do dia vêm da grade; as faltas vão para o diário e formam a trilha da frequência.</p>
    ${minhas.length ? `${formulario()}<h2>Registradas</h2>${lista()}` : vazio('Nenhuma turma alocada', 'Quando a coordenação alocar você em uma turma, dá para registrar as aulas.')}`;
  if (foco) main.querySelector(foco)?.focus();
}

async function carregarTudo() {
  const [logado, professores, turmas, alocacoes, matrizes, regs, cham, hors, dia, dd, mv] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), conjunto('registros-aula'), conjunto('chamadas'), conjunto('horarios'), dataDeReferencia(), diario(), conjunto('movimentacoes')]);
  prof = professores.find((p) => p.id === logado.professorId);
  minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
  registros = regs; chamadas = cham; horarios = hors; hoje = dia; dados = dd; movs = mv;
}
async function mostrar() {
  try { await carregarTudo(); desenhar(); } catch { falhaDados(main, mostrar); }
}

const lerTela = () => { const f = main.querySelector('#form-aula'); const d = lerFormulario(f); return { ...d, ausentes: d.ausentes || [] }; };
main.addEventListener('change', (e) => {
  if (editando) return;
  if (e.target.id === 'f-turma') { preencher = { ...lerTela(), turma: e.target.value, ausentes: [] }; desenhar('#f-turma'); return; }
  if (e.target.id === 'f-data') { preencher = { ...lerTela(), ausentes: [] }; desenhar('#f-data'); return; }
  if (e.target.name === 'ausentes') {
    const marc = [...main.querySelectorAll('[name="ausentes"]:checked')].length, total = main.querySelectorAll('[name="ausentes"]').length;
    const r = main.querySelector('#chamada-resumo');
    if (r) r.textContent = `${total - marc} ${plural(total - marc, 'presente', 'presentes')} · ${marc} ${plural(marc, 'falta', 'faltas')}`;
  }
});
main.addEventListener('click', async (e) => {
  const d = e.target.closest('[data-data]');
  if (d) { preencher = { ...lerTela(), data: d.dataset.data, ausentes: [] }; desenhar('#f-conteudo'); return; }
  const ed = e.target.closest('[data-editar]');
  if (ed) { editando = ed.dataset.editar; desenhar('#f-conteudo'); main.querySelector('#form-aula').scrollIntoView({ block: 'nearest' }); return; }
  if (e.target.closest('[data-acao="cancelar"]')) { editando = null; desenhar('h1'); return; }
  const rem = e.target.closest('[data-remover]');
  if (rem) {
    const r = registros.find((x) => x.id === rem.dataset.remover);
    if (!r || !(await confirmar({ titulo: 'Remover este registro de aula?', texto: `${dataBR(r.data)} · ${r.turma} · ${r.componente}. O registro some da lista e da consulta da coordenação. A chamada do dia continua no diário.`, botao: 'Remover', perigo: true }))) return;
    try {
      registros = (await conjunto('registros-aula')).filter((x) => x.id !== r.id);
      await salvar('registros-aula', registros);
      await registrarAcao(prof.nome, 'Removeu registro de aula', `${r.turma} · ${r.data}`);
      if (editando === r.id) editando = null;
      desenhar('h1'); avisar('Registro removido.');
    } catch { avisar('Não foi possível remover. Tente de novo.'); }
  }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-aula') return;
  e.preventDefault();
  const f = e.target;
  const r = editando ? registros.find((x) => x.id === editando) : null;
  const dados0 = lerTela();
  if (r) { dados0.turma = `${r.turmaId}|${r.componente}`; dados0.data = r.data; }
  const [turmaId, componente] = String(dados0.turma).split('|');
  const daGrade = aulasNaGrade(horarios, turmaId, componente, dados0.data).quantas;
  const form = { ...dados0, aulas: r ? String(r.aulas) : String(daGrade) };
  const { ok, erros } = validarRegistroDeAula(form, { hoje, minhasTurmas: minhas.map((m) => m.turma.id), existentes: registros, editandoId: editando || '', daGrade: !r });
  if (!mostrarErros(f, erros) || !ok) return;
  const turmaNome = minhas.find((m) => m.turma.id === turmaId).turma.nome;
  try {
    let resumo = '';
    await comEspera(e.submitter, async () => {
      const atuais = await conjunto('registros-aula');
      const novo = montarRegistroDeAula(form, { id: r?.id || `RA-${Date.now().toString(36)}`, professorId: prof.id, turmaNome, hoje, agora: new Date().toISOString() });
      registros = r ? atuais.map((x) => (x.id === r.id ? novo : x)) : [novo, ...atuais];
      await salvar('registros-aula', registros);
      if (!r) {
        // A chamada vai junto: soma as aulas do dia para quem faltou e entra na trilha da frequência.
        const [cham, dd] = await Promise.all([conjunto('chamadas'), diario()]);
        const res = aplicarChamada({ chamadas: cham, alunos: dd[turmaId] || [], turmaId, data: form.data, ausentes: dados0.ausentes, aulas: daGrade, componente, quando: new Date().toISOString(), registroId: novo.id });
        if (res.nova) {
          // A presença entra na média do bimestre: refaz a média de quem já tem prova e atividade lançadas.
          dd[turmaId] = atualizarMedias(res.diario, res.chamadas, turmaId, await letivo());
          await salvar('chamadas', res.chamadas);
          await salvar('diario', dd);
          chamadas = res.chamadas; dados = dd;
          resumo = dados0.ausentes.length ? ` Chamada: ${dados0.ausentes.length} ${dados0.ausentes.length === 1 ? 'falta' : 'faltas'} (${daGrade} ${daGrade === 1 ? 'aula' : 'aulas'} cada).` : ' Chamada: todos presentes.';
        }
      }
      await registrarAcao(prof.nome, r ? 'Editou registro de aula' : 'Registrou aula e chamada', `${turmaNome} · ${form.data}`);
    });
    editando = null; preencher = {};
    desenhar('h1'); avisar(r ? 'Registro atualizado.' : `Aula registrada.${resumo}`);
  } catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível salvar agora. Seus dados continuam no formulário: tente de novo.'; }
});
mostrar();
