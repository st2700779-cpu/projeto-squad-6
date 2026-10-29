// Registro de aula: o professor anota o conteúdo trabalhado em cada aula (turma, data, nº de aulas, conteúdo e tarefa).
// A tela sugere as datas com chamada feita e sem registro, e deixa editar ou remover um registro.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, confirmar, dataBR, vazio, comEspera, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { turmasDoProfessor } from '../regras.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarRegistroDeAula, montarRegistroDeAula, datasSemRegistro, AULAS_POR_DIA_MAX, CONTEUDO_MIN } from '../dominio/vida-escolar.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/registro-aula.html', assistente: true });
let prof, minhas, registros, chamadas, hoje, editando = null, preencher = {};

const chaveTurma = (m) => `${m.turma.id}|${m.componente}`;
const opcoesTurma = () => minhas.map((m) => [chaveTurma(m), `${m.turma.nome} · ${m.componente}`]);

function formulario() {
  const r = editando ? registros.find((x) => x.id === editando) : null;
  const v = { turma: r ? `${r.turmaId}|${r.componente}` : preencher.turma || chaveTurma(minhas[0]), data: r?.data || preencher.data || hoje, aulas: String(r?.aulas || preencher.aulas || 2), conteudo: r?.conteudo ?? preencher.conteudo ?? '', tarefa: r?.tarefa ?? preencher.tarefa ?? '' };
  const sugestoes = datasSemRegistro(chamadas, registros.filter((x) => x.professorId === prof.id), ...v.turma.split('|'), 6);
  return `<form id="form-aula" class="form-cadastro" novalidate>
    <h2 class="esp-t-0">${r ? 'Editar registro' : 'Novo registro de aula'}</h2>
    ${campo({ nome: 'turma', rotulo: 'Turma e componente', valor: v.turma, opcoes: opcoesTurma(), obrigatorio: true, atributos: r ? 'disabled' : '' })}
    <div class="grade-2">
      ${campo({ nome: 'data', rotulo: 'Data da aula', tipo: 'date', valor: v.data, obrigatorio: true, atributos: `max="${hoje}"` })}
      ${campo({ nome: 'aulas', rotulo: 'Quantas aulas', tipo: 'number', valor: v.aulas, obrigatorio: true, atributos: `min="1" max="${AULAS_POR_DIA_MAX}" inputmode="numeric"` })}
    </div>
    ${sugestoes.length && !r ? `<p class="texto-pequeno esp-b-2" id="sugestoes">Com chamada feita e sem registro: ${sugestoes.map((d) => `<button type="button" class="botao botao-secundario botao-mini" data-data="${d}">${dataBR(d).slice(0, 5)}</button>`).join(' ')}</p>` : ''}
    <div class="campo"><label for="f-conteudo">Conteúdo trabalhado <span class="obrigatorio" aria-hidden="true">*</span></label><textarea id="f-conteudo" name="conteudo" class="entrada" rows="4" maxlength="600" aria-describedby="f-conteudo-dica f-conteudo-erro" required>${esc(v.conteudo)}</textarea><span class="dica" id="f-conteudo-dica">O que foi ensinado. Pelo menos ${CONTEUDO_MIN} letras. Ex.: Funções do 1º grau: gráfico e coeficientes.</span><p class="erro" id="f-conteudo-erro" role="alert"></p></div>
    <div class="campo"><label for="f-tarefa">Tarefa de casa <span class="dica">(opcional)</span></label><textarea id="f-tarefa" name="tarefa" class="entrada" rows="2" maxlength="300" aria-describedby="f-tarefa-erro">${esc(v.tarefa)}</textarea><p class="erro" id="f-tarefa-erro" role="alert"></p></div>
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <div class="linha-botoes"><button type="submit" class="botao">${r ? 'Salvar alterações' : 'Registrar aula'}</button>${r ? '<button type="button" class="botao botao-texto" data-acao="cancelar">Cancelar edição</button>' : ''}</div>
  </form>`;
}

function lista() {
  const meus = registros.filter((r) => r.professorId === prof.id).sort((a, b) => b.data.localeCompare(a.data) || a.turma.localeCompare(b.turma));
  if (!meus.length) return vazio('Nenhuma aula registrada', 'Os registros que você fizer aparecem aqui, do mais recente ao mais antigo.');
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Aulas registradas</caption>
    <thead><tr><th scope="col">Data</th><th scope="col">Turma</th><th scope="col" class="num">Aulas</th><th scope="col">Conteúdo</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${meus.map((r) => `<tr><td class="titulo-linha"><strong>${dataBR(r.data)}</strong></td><td data-rotulo="Turma"><div>${esc(r.turma)}<small>${esc(r.componente)}</small></div></td><td class="num" data-rotulo="Aulas"><div>${r.aulas}</div></td><td data-rotulo="Conteúdo"><div>${esc(r.conteudo)}${r.tarefa ? `<small>Tarefa: ${esc(r.tarefa)}</small>` : ''}</div></td><td class="acoes"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-editar="${esc(r.id)}" aria-label="Editar registro de ${dataBR(r.data)}, ${esc(r.turma)}">Editar</button><button type="button" class="botao botao-texto botao-mini" data-remover="${esc(r.id)}" aria-label="Remover registro de ${dataBR(r.data)}, ${esc(r.turma)}">Remover</button></div></td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${meus.length} ${plural(meus.length, 'registro', 'registros')} · ${meus.reduce((s, r) => s + r.aulas, 0)} aulas</p>`;
}

function desenhar(foco = '') {
  main.innerHTML = `<h1 tabindex="-1">Registro de aula</h1>
    <p class="pagina-descricao">Anote o que foi ensinado em cada aula. A coordenação consulta os registros e o diário fica completo.</p>
    ${minhas.length ? `${formulario()}<h2>Registradas</h2>${lista()}` : vazio('Nenhuma turma alocada', 'Quando a coordenação alocar você em uma turma, dá para registrar as aulas.')}`;
  if (foco) main.querySelector(foco)?.focus();
}

async function carregarTudo() {
  const [logado, professores, turmas, alocacoes, matrizes, regs, cham, dia] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), conjunto('registros-aula'), conjunto('chamadas'), dataDeReferencia()]);
  prof = professores.find((p) => p.id === logado.professorId);
  minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes.versoes[0].componentes });
  registros = regs; chamadas = cham; hoje = dia;
}
async function mostrar() {
  try { await carregarTudo(); desenhar(); } catch { falhaDados(main, mostrar); }
}

main.addEventListener('change', (e) => {
  if (e.target.id !== 'f-turma' || editando) return;
  preencher = { ...lerFormulario(main.querySelector('#form-aula')), turma: e.target.value };
  desenhar('#f-turma');
});
main.addEventListener('click', async (e) => {
  const d = e.target.closest('[data-data]');
  if (d) { main.querySelector('#f-data').value = d.dataset.data; main.querySelector('#f-conteudo').focus(); return; }
  const ed = e.target.closest('[data-editar]');
  if (ed) { editando = ed.dataset.editar; desenhar('#f-data'); main.querySelector('#form-aula').scrollIntoView({ block: 'nearest' }); return; }
  if (e.target.closest('[data-acao="cancelar"]')) { editando = null; desenhar('h1'); return; }
  const rem = e.target.closest('[data-remover]');
  if (rem) {
    const r = registros.find((x) => x.id === rem.dataset.remover);
    if (!r || !(await confirmar({ titulo: 'Remover este registro de aula?', texto: `${dataBR(r.data)} · ${r.turma} · ${r.componente}. O registro some da lista e da consulta da coordenação.`, botao: 'Remover', perigo: true }))) return;
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
  const dados = lerFormulario(f);
  const r = editando ? registros.find((x) => x.id === editando) : null;
  if (r) dados.turma = `${r.turmaId}|${r.componente}`;
  const { ok, erros } = validarRegistroDeAula(dados, { hoje, minhasTurmas: minhas.map((m) => m.turma.id), existentes: registros, editandoId: editando || '' });
  if (!mostrarErros(f, erros) || !ok) return;
  const turmaNome = minhas.find((m) => m.turma.id === dados.turma.split('|')[0]).turma.nome;
  try {
    await comEspera(e.submitter, async () => {
      const atuais = await conjunto('registros-aula');
      const novo = montarRegistroDeAula(dados, { id: r?.id || `RA-${Date.now().toString(36)}`, professorId: prof.id, turmaNome, hoje, agora: new Date().toISOString() });
      registros = r ? atuais.map((x) => (x.id === r.id ? novo : x)) : [novo, ...atuais];
      await salvar('registros-aula', registros);
      await registrarAcao(prof.nome, r ? 'Editou registro de aula' : 'Registrou aula', `${turmaNome} · ${dados.data}`);
    });
    editando = null; preencher = {};
    desenhar('h1'); avisar(r ? 'Registro atualizado.' : 'Aula registrada.');
  } catch { f.querySelector('#f-geral-erro').textContent = 'Não foi possível salvar agora. Seus dados continuam no formulário: tente de novo.'; }
});
mostrar();
