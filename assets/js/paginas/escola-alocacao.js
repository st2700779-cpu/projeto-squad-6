// Alocação de professores: quem dá cada disciplina em cada turma. Duas formas de trabalhar:
//  - por turma: as disciplinas da matriz da série, cada uma com o seu professor;
//  - por disciplina: escolha a disciplina (separadas por área: Matemática, Linguagens, Ciências...) e veja todas as turmas que
//    têm essa disciplina, com os professores habilitados nela.
// O sistema impede alocar professor sem habilitação na disciplina, acima da carga semanal ou com aula em outra turma no mesmo
// horário. A troca vale também na grade de horário (dominio/alocacao.js).
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, icone, avisar, etiqueta, confirmar, plural, vazio } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao } from '../dados.js';
import { bloqueioAlocacao, codigoDaTurma, aulasDoComponente, aulasAlocadas, matrizDaSerie } from '../regras.js';
import { ordemDaSerie } from '../dominio/niveis.js';
import { nomeAtualDoVinculo } from '../dominio/vinculos.js';
import { areaDoComponente, agruparPorArea, nomesDasAreas, professorDaDisciplina, aplicarAlocacao, conflitosDaAlocacao } from '../dominio/alocacao.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/alocacao.html', assistente: true, papel: 'Coordenação' });
const escolaId = sessao()?.escolaId || 'e1';
let turmas, professores, alocacoes, matrizes, horarios;
let modo = 'turma'; // 'turma' | 'disciplina'
let turmaId = null, disciplina = null, area = '';
let erro = null; // { chave, texto }

async function mostrar() {
  try {
    let todas, todosHorarios;
    [todas, professores, alocacoes, matrizes, todosHorarios] = await Promise.all([turmasEscola(), carregar('professores'), conjunto('alocacoes'), carregar('matrizes'), conjunto('horarios')]);
    professores = professores.filter((p) => p.escolaId === escolaId); // só os professores lotados nesta escola
    horarios = todosHorarios;
    turmas = todas.filter((t) => t.escolaId === escolaId && t.situacao === 'Aprovada' && matrizDaSerie(matrizes, t.serie).length)
      .sort((a, b) => ordemDaSerie(a.serie) - ordemDaSerie(b.serie) || a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!turmas.some((t) => t.id === turmaId)) turmaId = turmas[0]?.id || null;
    const todasDisc = disciplinas();
    if (!todasDisc.includes(disciplina)) disciplina = todasDisc[0] || null;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const ctx = () => ({ alocacoes, turmas, matriz: matrizes });
const usadas = (p) => p.aulasEmOutrasTurmas + aulasAlocadas(p.id, ctx());
const aulasNa = (componente, t) => aulasDoComponente(matrizes, componente, t.serie);
/** Todas as disciplinas das matrizes das turmas da escola. */
const disciplinas = () => [...new Set(turmas.flatMap((t) => matrizDaSerie(matrizes, t.serie).map((c) => c.componente)))];
const habilitados = (componente) => professores.filter((p) => p.habilitacao.includes(componente));
const nome = (id) => professores.find((p) => p.id === id)?.nome || 'Professor de outra escola';
const barra = (u, total) => `<div class="barra" role="img" aria-label="${u} de ${total} aulas semanais"><span style="width:${Math.min(100, (u / total) * 100)}%"></span></div>`;

/** Lista de escolha do professor: só os habilitados na disciplina, com a carga livre de cada um. */
function seletor(id, componente, t, atualId) {
  const aulas = aulasNa(componente, t);
  const lista = habilitados(componente);
  if (!lista.length) return `<span class="texto-suave texto-pequeno">Nenhum professor da escola é habilitado em ${esc(componente)}.</span>`;
  return `<label class="sr-only" for="${id}">Professor de ${esc(componente)} na ${esc(t.nome)}</label><select id="${id}" class="entrada">${lista.map((p) => {
    const livres = p.cargaHorariaSemanal - usadas(p) + (p.id === atualId ? aulas : 0);
    return `<option value="${p.id}" ${p.id === atualId ? 'selected' : ''}>${esc(p.nome)} — ${livres >= aulas ? `${livres} ${plural(livres, 'aula livre', 'aulas livres')}` : `sem carga (${Math.max(0, livres)} livres)`}</option>`;
  }).join('')}</select>`;
}
function linhaDeAlocacao(t, componente, rotulo) {
  const atualId = professorDaDisciplina(alocacoes, t.id, componente);
  const chave = `${t.id}|${componente}`;
  const id = `prof-${t.id}-${componente.replace(/\W/g, '')}`;
  const temOpcao = habilitados(componente).length;
  const acao = `<div class="linha-botoes">${seletor(id, componente, t, atualId)}${temOpcao ? `<button type="button" class="botao botao-mini" data-alocar="${esc(chave)}" data-campo="${id}">${atualId ? 'Trocar' : 'Alocar'}</button>` : ''}${atualId ? `<button type="button" class="botao botao-secundario botao-mini" data-tirar="${esc(chave)}" aria-label="Tirar o professor de ${esc(componente)} na ${esc(t.nome)}">Tirar</button>` : ''}</div>`;
  return `<tr${erro?.chave === chave ? ' class="linha-erro"' : ''}><td class="titulo-linha"><strong>${esc(rotulo)}</strong>${rotulo === componente ? `<br><span class="texto-suave texto-pequeno">${esc(areaDoComponente(componente))}</span>` : `<br><span class="texto-suave texto-pequeno">${esc(t.turno)} · ${esc(codigoDaTurma(t))}</span>`}</td>
    <td class="num" data-rotulo="Aulas por semana">${aulasNa(componente, t)}</td>
    <td data-rotulo="Professor">${atualId ? esc(nome(atualId)) : etiqueta('Sem professor', 'atencao')}</td>
    <td class="acoes">${acao}</td></tr>`;
}
function porTurma() {
  if (!turmaId) return vazio('Nenhuma turma aprovada com matriz', 'Quando a direção criar as turmas, as disciplinas aparecem aqui.');
  const t = turmas.find((x) => x.id === turmaId);
  const matriz = matrizDaSerie(matrizes, t.serie);
  const sem = matriz.filter((c) => !professorDaDisciplina(alocacoes, t.id, c.componente)).length;
  return `<div class="ferramentas-tabela"><div class="campo"><label for="turma">Turma</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} · ${esc(x.turno)} · ${esc(codigoDaTurma(x))}</option>`).join('')}</select></div></div>
    ${agruparPorArea(matriz.map((c) => c.componente)).map((g) => `<h3>${esc(g.area)}</h3>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">${esc(g.area)}: disciplinas e professores da ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Disciplina</th><th scope="col" class="num">Aulas por semana</th><th scope="col">Professor</th><th scope="col">Alocação</th></tr></thead>
      <tbody>${g.componentes.map((c) => linhaDeAlocacao(t, c, c)).join('')}</tbody></table></div>`).join('')}
    <p class="contagem">${matriz.length} disciplinas na matriz da ${esc(t.serie)} · ${sem ? `<strong class="cor-perigo">${sem} sem professor</strong>` : 'todas com professor'}</p>`;
}
function porDisciplina() {
  const todas = disciplinas();
  if (!todas.length) return vazio('Nenhuma disciplina', 'As disciplinas vêm da matriz das turmas aprovadas.');
  const visiveis = todas.filter((c) => !area || areaDoComponente(c) === area);
  if (!visiveis.includes(disciplina)) disciplina = visiveis[0] || null;
  const daDisc = disciplina ? turmas.filter((t) => aulasNa(disciplina, t) > 0) : [];
  const profs = disciplina ? habilitados(disciplina) : [];
  return `<div class="abas-estado" role="group" aria-label="Área do conhecimento"><button type="button" class="chip" data-area="" aria-pressed="${!area}">Todas as áreas</button>${nomesDasAreas().filter((a) => todas.some((c) => areaDoComponente(c) === a)).map((a) => `<button type="button" class="chip" data-area="${esc(a)}" aria-pressed="${area === a}">${esc(a)}</button>`).join('')}</div>
    <div class="abas-estado" role="group" aria-label="Disciplina">${visiveis.map((c) => { const falta = turmas.filter((t) => aulasNa(c, t) > 0 && !professorDaDisciplina(alocacoes, t.id, c)).length; return `<button type="button" class="chip" data-disciplina="${esc(c)}" aria-pressed="${c === disciplina}">${esc(c)}${falta ? ` · ${falta} sem professor` : ''}</button>`; }).join('')}</div>
    ${disciplina ? `<h3>${esc(disciplina)} <span class="texto-suave peso-normal texto-pequeno">${esc(areaDoComponente(disciplina))}</span></h3>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas com ${esc(disciplina)} e o professor de cada uma</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col" class="num">Aulas por semana</th><th scope="col">Professor</th><th scope="col">Alocação</th></tr></thead>
        <tbody>${daDisc.map((t) => linhaDeAlocacao(t, disciplina, t.nome)).join('')}</tbody></table></div>
      <h4>Professores habilitados em ${esc(disciplina)}</h4>
      ${profs.length ? `<ul class="lista-simples">${profs.map((p) => { const u = usadas(p); const turmasDele = alocacoes.filter((a) => a.professorId === p.id && a.componente === disciplina).map((a) => turmas.find((t) => t.id === a.turmaId)?.nome).filter(Boolean); return `<li><span><strong>${esc(p.nome)}</strong> <span class="texto-suave texto-pequeno">${esc(nomeAtualDoVinculo(p.vinculo) || 'vínculo não informado')} · ${u} de ${p.cargaHorariaSemanal} aulas${turmasDele.length ? ` · ${esc(disciplina)} em ${esc(turmasDele.join(', '))}` : ''}</span>${barra(u, p.cargaHorariaSemanal)}</span></li>`; }).join('')}</ul>` : `<p class="alerta-atencao">${icone('alerta', 20)}<span>Nenhum professor lotado na escola é habilitado em ${esc(disciplina)}. Cadastre ou ajuste a habilitação em Secretaria › Professores.</span></p>`}` : ''}`;
}
function cargaDosProfessores() {
  const grupos = nomesDasAreas().map((a) => ({ area: a, profs: professores.filter((p) => p.habilitacao.some((c) => areaDoComponente(c) === a)) })).filter((g) => g.profs.length && (!area || g.area === area));
  return `<h2>Professores por área</h2>
    <p class="texto-suave esp-t-0">Cada professor aparece nas áreas em que é habilitado. Aulas por semana = aulas em outras turmas + aulas alocadas aqui.</p>
    ${grupos.map((g) => `<h3>${esc(g.area)}</h3><div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Professores de ${esc(g.area)}</caption>
      <thead><tr><th scope="col">Professor</th><th scope="col">Habilitação</th><th scope="col">Vínculo</th><th scope="col" class="num">Aulas por semana</th></tr></thead>
      <tbody>${g.profs.map((p) => { const u = usadas(p); return `<tr><td class="titulo-linha"><strong>${esc(p.nome)}</strong><br><span class="texto-suave texto-pequeno">${esc(p.formacao)}</span></td><td data-rotulo="Habilitação">${esc(p.habilitacao.join(', '))}</td><td data-rotulo="Vínculo">${esc(nomeAtualDoVinculo(p.vinculo) || '—')}</td><td class="num${u > p.cargaHorariaSemanal ? ' cor-perigo' : ''}" data-rotulo="Aulas por semana">${u} de ${p.cargaHorariaSemanal}${barra(u, p.cargaHorariaSemanal)}</td></tr>`; }).join('')}</tbody></table></div>`).join('')}`;
}
function desenhar() {
  const semProf = turmas.reduce((n, t) => n + matrizDaSerie(matrizes, t.serie).filter((c) => !professorDaDisciplina(alocacoes, t.id, c.componente)).length, 0);
  main.innerHTML = `
    <h1>Alocação de professores</h1>
    <p class="pagina-descricao">Escolha quem dá cada disciplina em cada turma. Só aparecem professores habilitados na disciplina; o sistema bloqueia quem passaria da carga semanal ou teria duas aulas no mesmo horário. A troca já vale na grade de horário.</p>
    <dl class="resumo-linha">
      <div><dd>${turmas.length}</dd><dt>${plural(turmas.length, 'turma', 'turmas')} com matriz</dt></div>
      <div class="${semProf ? 'alerta' : ''}"><dd>${semProf}</dd><dt>${plural(semProf, 'disciplina sem professor', 'disciplinas sem professor')}</dt></div>
      <div><dd>${professores.length}</dd><dt>professores lotados</dt></div>
    </dl>
    <div class="abas-estado" role="group" aria-label="Como alocar"><button type="button" class="chip" data-modo="turma" aria-pressed="${modo === 'turma'}">Por turma</button><button type="button" class="chip" data-modo="disciplina" aria-pressed="${modo === 'disciplina'}">Por disciplina</button></div>
    ${erro ? `<p class="alerta-erro" role="alert">${icone('cadeado', 20)}<span>${esc(erro.texto)}</span></p>` : ''}
    ${modo === 'turma' ? porTurma() : porDisciplina()}
    ${cargaDosProfessores()}`;
}

main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; erro = null; desenhar(); main.querySelector('#turma').focus(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.modo) { modo = b.dataset.modo; erro = null; desenhar(); main.querySelector(`[data-modo="${modo}"]`).focus(); return; }
  if (b.dataset.area !== undefined && b.closest('[aria-label="Área do conhecimento"]')) { area = b.dataset.area; erro = null; desenhar(); main.querySelector(`[data-area="${CSS.escape(area)}"]`)?.focus(); return; }
  if (b.dataset.disciplina) { disciplina = b.dataset.disciplina; erro = null; desenhar(); main.querySelector(`[data-disciplina="${CSS.escape(disciplina)}"]`)?.focus(); return; }
  const chave = b.dataset.alocar || b.dataset.tirar;
  if (!chave) return;
  const [tId, componente] = chave.split('|');
  const t = turmas.find((x) => x.id === tId);
  const atualId = professorDaDisciplina(alocacoes, tId, componente);
  let novoId = null;
  if (b.dataset.alocar) {
    novoId = main.querySelector(`#${b.dataset.campo}`)?.value;
    const professor = professores.find((p) => p.id === novoId);
    if (!professor) return;
    if (novoId === atualId) { avisar(`${professor.nome} já dá ${componente} na ${t.nome}.`); return; }
    // A carga já usada não conta as aulas desta disciplina se o professor atual for o mesmo (troca).
    const conflitos = conflitosDaAlocacao(horarios, { turmaId: tId, componente, professorId: novoId });
    const motivo = bloqueioAlocacao({ professor, componente, aulas: aulasNa(componente, t), aulasJaAlocadas: aulasAlocadas(professor.id, ctx()) })
      || (conflitos.length ? `${professor.nome} tem aula em outra turma no horário de ${componente} da grade: ${conflitos.join('; ')}.` : null);
    if (motivo) { erro = { chave, texto: `Alocação bloqueada em ${componente} (${t.nome}). ${motivo}` }; desenhar(); main.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' }); return; }
    if (atualId && !(await confirmar({ titulo: `Trocar o professor de ${componente}?`, texto: `${nome(atualId)} deixa ${componente} na ${t.nome} e ${professor.nome} assume, inclusive nas aulas da grade de horário.`, botao: 'Trocar professor' }))) return;
  } else if (!(await confirmar({ titulo: 'Tirar o professor?', texto: `${nome(atualId)} deixa de lecionar ${componente} na ${t.nome}. A disciplina fica sem professor também na grade de horário.`, botao: 'Tirar professor' }))) return;
  try {
    const r = aplicarAlocacao({ alocacoes, horarios, turmaId: tId, componente, professorId: novoId });
    await salvar('alocacoes', r.alocacoes);
    if (horarios.some((h) => h.turmaId === tId)) await salvar('horarios', r.horarios);
    alocacoes = r.alocacoes; horarios = r.horarios; erro = null;
    await registrarAcao('Coordenação', novoId ? `${atualId ? 'Trocou para' : 'Alocou'} ${nome(novoId)} em ${componente}` : `Tirou ${nome(atualId)} de ${componente}`, t.nome);
    desenhar(); avisar(novoId ? `${nome(novoId)} alocado(a) em ${componente} na ${t.nome}.` : `${componente} ficou sem professor na ${t.nome}.`);
  } catch { avisar('A alocação não foi salva e nada foi alterado. Confira a conexão e repita a ação.'); mostrar(); }
});
mostrar();
