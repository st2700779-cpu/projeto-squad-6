// Horários (coordenação): a grade de cada turma e o horário de cada professor.
// Na grade, clique numa aula: primeiro escolha a disciplina (separadas por área), depois o professor, entre os habilitados nela.
// A lista mostra quem está livre naquele horário, quem já tem aula em outra turma e quem não tem mais carga. O professor escolhido
// passa a dar todas as aulas da disciplina na turma e fica alocado (a mesma regra da Secretaria › Alocação, em dominio/alocacao.js).
// "Horário do professor" mostra a semana de um professor; "Professores por disciplina" separa os professores de cada disciplina.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, avisar, vazio, plural, icone, etiqueta, confirmar } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, turmasEscola } from '../dados.js';
import { DIAS, NOME_DO_DIA, horaDaAula, aulasPorDia, conflitosDeHorario, aulasDoProfessor, matrizDaSerie, aulasAlocadas, bloqueioAlocacao, aulasDoComponente } from '../regras.js';
import { ordemDaSerie } from '../dominio/niveis.js';
import { nomeAtualDoVinculo } from '../dominio/vinculos.js';
import { ESTUDO_ORIENTADO, areaDoComponente, agruparPorArea, nomesDasAreas, professorDaDisciplina, aplicarAlocacao, conflitosDaAlocacao, montarGrade, contarAulas } from '../dominio/alocacao.js';
import { semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/horarios.html', assistente: false });
const VISOES = [['turma', 'Grade da turma'], ['professor', 'Horário do professor'], ['disciplinas', 'Professores por disciplina']];
let visao = 'turma';
let horarios, turmas, professores, alocacoes, matrizes, escolaId, turmaId, professorId = '', destaque = '', area = '';
let celula = null; // { dia, indice } da aula em edição
let escolha = null; // { componente, professorId } no editor

async function mostrar() {
  try {
    escolaId = sessao().escolaId;
    const [todos, tt, profs, aloc, mat] = await Promise.all([conjunto('horarios'), turmasEscola(), carregar('professores'), conjunto('alocacoes'), carregar('matrizes')]);
    horarios = todos; alocacoes = aloc; matrizes = mat;
    professores = profs.filter((p) => p.escolaId === escolaId);
    turmas = tt.filter((t) => t.escolaId === escolaId && t.situacao === 'Aprovada').sort((a, b) => ordemDaSerie(a.serie) - ordemDaSerie(b.serie) || a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!turmas.some((t) => t.id === turmaId)) turmaId = turmas[0]?.id || null;
    if (!professores.some((p) => p.id === professorId)) professorId = professores[0]?.id || '';
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const daEscola = () => horarios.filter((h) => h.escolaId === escolaId);
const gradeDe = (id) => horarios.find((h) => h.turmaId === id) || null;
const nomeDe = (id) => professores.find((p) => p.id === id)?.nome || (id ? 'Professor de outra escola' : '');
const curto = (n) => n.replace(/^(Profa?\.)\s+/, '').split(' ').slice(0, 2).join(' ');
const ctx = () => ({ alocacoes, turmas, matriz: matrizes });
const usadas = (p) => p.aulasEmOutrasTurmas + aulasAlocadas(p.id, ctx());
const quem = () => sessao()?.nome || 'Coordenação';
/** Aulas por semana da disciplina na turma: as da matriz; fora da matriz, as que a grade tem. */
const aulasDaDisciplina = (t, componente, grade) => aulasDoComponente(matrizes, componente, t.serie) || contarAulas(grade)[componente] || 0;

// ---------------- Grade da turma ----------------
function quadroDeAulas(t, grade) {
  const contagem = contarAulas(grade);
  const matriz = matrizDaSerie(matrizes, t.serie);
  const esperado = Object.fromEntries(matriz.map((c) => [c.componente, c.aulas]));
  const itens = [...new Set([...matriz.map((c) => c.componente), ...Object.keys(contagem)])];
  return `<div class="tabela-rolagem sem-limite"><table class="tabela min-0"><caption class="sr-only">Aulas por semana de cada disciplina</caption>
    <thead><tr><th scope="col">Disciplina</th><th scope="col">Professor</th><th scope="col" class="num">Na grade</th>${matriz.length ? '<th scope="col" class="num">Na matriz</th><th scope="col">Situação</th>' : ''}</tr></thead>
    <tbody>${itens.map((c) => { const g = contagem[c] || 0, e = esperado[c] ?? 0, dif = g - e; const p = c === ESTUDO_ORIENTADO ? null : professorDaDisciplina(alocacoes, t.id, c); return `<tr><td>${esc(c)}</td><td>${c === ESTUDO_ORIENTADO ? '<span class="texto-suave">—</span>' : p ? esc(nomeDe(p)) : etiqueta('Sem professor', 'atencao')}</td><td class="num">${g}</td>${matriz.length ? `<td class="num">${e}</td><td>${c === ESTUDO_ORIENTADO ? '<span class="texto-suave">fora da matriz</span>' : dif === 0 ? semaforo({ chave: 'verde', icone: 'ok', texto: 'Igual à matriz' }) : semaforo({ chave: 'amarelo', icone: 'alerta', texto: dif < 0 ? `Falta ${-dif} ${plural(-dif, 'aula', 'aulas')}` : `${dif} ${plural(dif, 'aula', 'aulas')} a mais` })}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
/** Situação de cada professor habilitado para a aula escolhida: livre, ocupado no horário ou sem carga. */
function opcoesDeProfessor(t, grade, componente) {
  const atual = professorDaDisciplina(alocacoes, t.id, componente);
  const aulas = aulasDaDisciplina(t, componente, grade);
  return professores.filter((p) => p.habilitacao.includes(componente)).map((p) => {
    const ocupado = conflitosDeHorario(horarios, { turmaId: t.id, dia: celula.dia, indice: celula.indice, professorId: p.id });
    const livres = p.cargaHorariaSemanal - usadas(p) + (p.id === atual ? aulas : 0);
    const semCarga = livres < aulas;
    return { p, atual: p.id === atual, ocupado: ocupado[0]?.replace('O professor já tem aula na ', 'aula na ').replace(' neste mesmo horário.', '') || '', semCarga, livres };
  }).sort((a, b) => Number(b.atual) - Number(a.atual) || Number(Boolean(a.ocupado || a.semCarga)) - Number(Boolean(b.ocupado || b.semCarga)) || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
}
function editor(t, grade) {
  if (!celula) return '';
  const aula = grade.aulas[celula.dia][celula.indice];
  const h = horaDaAula(grade.turno, celula.indice);
  const matriz = matrizDaSerie(matrizes, t.serie).map((c) => c.componente);
  const lista = [...new Set([...matriz, ...(aula.componente && aula.componente !== ESTUDO_ORIENTADO ? [aula.componente] : []), ESTUDO_ORIENTADO])];
  escolha ??= { componente: aula.componente, professorId: aula.componente === ESTUDO_ORIENTADO ? null : professorDaDisciplina(alocacoes, t.id, aula.componente) };
  const visiveis = lista.filter((c) => !area || areaDoComponente(c) === area || c === escolha.componente);
  const ehEO = escolha.componente === ESTUDO_ORIENTADO;
  const opcoes = ehEO ? [] : opcoesDeProfessor(t, grade, escolha.componente);
  const nAulas = ehEO ? 0 : aulasDaDisciplina(t, escolha.componente, grade);
  return `<section class="editor-aula" id="editor-aula" aria-labelledby="editor-titulo">
    <h2 id="editor-titulo" class="esp-t-0">${esc(NOME_DO_DIA[celula.dia])}, ${h.inicio} às ${h.fim}</h2>
    <p class="texto-suave esp-t-0">Agora: ${esc(aula.componente || 'aula vazia')}${aula.professorId ? ` com ${esc(nomeDe(aula.professorId))}` : ''}.</p>
    <fieldset class="campo"><legend>1. Disciplina</legend>
      <div class="abas-estado" role="group" aria-label="Área da disciplina"><button type="button" class="chip" data-area-ed="" aria-pressed="${!area}">Todas</button>${nomesDasAreas().filter((a) => lista.some((c) => areaDoComponente(c) === a)).map((a) => `<button type="button" class="chip" data-area-ed="${esc(a)}" aria-pressed="${area === a}">${esc(a)}</button>`).join('')}</div>
      <div class="opcoes-chip">${visiveis.map((c) => `<button type="button" class="chip" data-disciplina="${esc(c)}" aria-pressed="${c === escolha.componente}">${esc(c)}</button>`).join('')}</div>
    </fieldset>
    <fieldset class="campo"><legend>2. Professor${ehEO ? '' : ` de ${esc(escolha.componente)}`}</legend>
      ${ehEO ? '<p class="texto-suave esp-t-0">Estudo orientado fica sem professor fixo na grade.</p>' : `${opcoes.length ? `<div class="lista-escolha">${opcoes.map((o) => { const bloq = !o.atual && (o.ocupado || o.semCarga); return `<label class="marca-item${bloq ? ' bloqueado' : ''}"><input type="radio" name="professor" value="${o.p.id}" ${escolha.professorId === o.p.id ? 'checked' : ''} ${bloq ? 'disabled' : ''}><span><strong>${esc(o.p.nome)}</strong> ${o.atual ? etiqueta('Dá esta disciplina na turma', 'info') : ''}<small>${esc(nomeAtualDoVinculo(o.p.vinculo) || 'vínculo não informado')} · ${o.livres} ${plural(o.livres, 'aula livre', 'aulas livres')} na semana${o.ocupado ? ` · ocupado: ${esc(o.ocupado)}` : o.semCarga ? ' · sem carga para esta disciplina' : ' · livre neste horário'}</small></span></label>`; }).join('')}</div>` : `<p class="alerta-atencao">${icone('alerta', 20)}<span>Nenhum professor da escola é habilitado em ${esc(escolha.componente)}.</span></p>`}
        <label class="marca-item"><input type="radio" name="professor" value="" ${!escolha.professorId ? 'checked' : ''}><span>Sem professor por enquanto</span></label>
        <p class="dica">O professor escolhido dá as ${nAulas} ${plural(nAulas, 'aula', 'aulas')} de ${esc(escolha.componente)} da semana nesta turma e fica alocado em Secretaria › Alocação.</p>`}
    </fieldset>
    <div class="form-acoes"><button type="button" class="botao" data-salvar-aula>${icone('ok', 20)}Salvar aula</button><button type="button" class="botao botao-secundario" data-cancelar-aula>Cancelar</button></div>
  </section>`;
}
function visaoTurma() {
  if (!turmaId) return vazio('Nenhuma turma aprovada', 'Quando a direção criar as turmas, as grades aparecem aqui.');
  const t = turmas.find((x) => x.id === turmaId);
  const grade = gradeDe(turmaId);
  const seletor = `<div class="barra-turma"><div class="campo campo-turma"><label for="turma">Turma</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} · ${esc(x.turno)}${gradeDe(x.id) ? '' : ' · sem grade'}</option>`).join('')}</select></div>
    ${grade ? `<div class="campo"><label for="destaque">Destacar professor</label><select id="destaque" class="entrada"><option value="">Nenhum</option>${professores.map((p) => `<option value="${p.id}" ${p.id === destaque ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>` : ''}
    <p class="info-turma esp-b-0">${esc(t.sala || 'sem sala')} · turno ${esc(t.turno.toLowerCase())} · a troca vale na hora para estudantes e professores</p></div>`;
  if (!grade) {
    const matriz = matrizDaSerie(matrizes, t.serie);
    return `${seletor}<h1 class="esp-b-3">Horários · ${esc(t.nome)}</h1>
      <div class="vazio-acao">${vazio('Esta turma ainda não tem grade', matriz.length ? `A grade é montada a partir da matriz da ${t.serie} (${matriz.reduce((s, c) => s + c.aulas, 0)} aulas por semana), já com os professores alocados. Depois você ajusta aula por aula.` : 'Esta série não tem matriz cadastrada: a grade começa com Estudo orientado e você escolhe as disciplinas aula por aula.')}
      <p><button type="button" class="botao" data-montar-grade>${icone('grade', 20)}Montar grade da turma</button></p></div>`;
  }
  const n = aulasPorDia(grade.turno);
  return `${seletor}
    <h1 class="esp-b-3">Horários · ${esc(grade.turma)}</h1>
    <p class="texto-suave esp-t-0">Clique numa aula para trocar a disciplina e o professor.${destaque ? ` As aulas de ${esc(nomeDe(destaque))} estão destacadas.` : ''}</p>
    <div class="tabela-rolagem sem-limite"><table class="tabela grade-horario grade-editavel"><caption class="sr-only">Grade semanal da ${esc(grade.turma)}. Cada aula é um botão que abre a troca de disciplina e professor.</caption>
      <thead><tr><th scope="col">Horário</th>${DIAS.map((d) => `<th scope="col">${NOME_DO_DIA[d]}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({ length: n }, (_, i) => { const h = horaDaAula(grade.turno, i); return `<tr${grade.turno === 'Integral' && i === 5 ? ' class="apos-almoco"' : ''}><th scope="row">${h.inicio} às ${h.fim}</th>${DIAS.map((d) => { const a = grade.aulas[d][i]; const sel = celula && celula.dia === d && celula.indice === i; const semProf = a.componente !== ESTUDO_ORIENTADO && !a.professorId; return `<td><button type="button" class="celula-aula${a.professorId && a.professorId === destaque ? ' destaque' : ''}${semProf ? ' sem-professor' : ''}" data-dia="${d}" data-indice="${i}" aria-pressed="${sel}" aria-label="${NOME_DO_DIA[d]}, ${h.inicio}: ${esc(a.componente)}${a.professorId ? `, ${esc(nomeDe(a.professorId))}` : semProf ? ', sem professor' : ''}. Trocar."><strong>${esc(a.componente)}</strong><small>${a.professorId ? esc(curto(nomeDe(a.professorId))) : semProf ? 'sem professor' : '&nbsp;'}</small></button></td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div>
    <div id="estado-horario" role="status" aria-live="polite"></div>
    ${editor(t, grade)}
    <h2>Aulas por semana</h2>${quadroDeAulas(t, grade)}`;
}

// ---------------- Horário do professor ----------------
function visaoProfessor() {
  if (!professores.length) return vazio('Nenhum professor lotado', 'Os professores lotados na escola aparecem aqui.');
  const p = professores.find((x) => x.id === professorId);
  const aulas = aulasDoProfessor(daEscola(), p.id);
  const inicios = [...new Set(aulas.map((a) => a.inicio))].sort();
  const porArea = agruparPorArea([...new Set(professores.flatMap((x) => x.habilitacao))]);
  const opcoes = porArea.map((g) => `<optgroup label="${esc(g.area)}">${professores.filter((x) => x.habilitacao.some((c) => g.componentes.includes(c))).map((x) => `<option value="${x.id}" ${x.id === professorId ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup>`).join('');
  const naMatriz = alocacoes.filter((a) => a.professorId === p.id).map((a) => ({ a, t: turmas.find((t) => t.id === a.turmaId) })).filter((x) => x.t);
  const u = usadas(p);
  return `<div class="ferramentas-tabela"><div class="campo"><label for="professor">Professor</label><select id="professor" class="entrada">${opcoes}</select></div></div>
    <h1 class="esp-b-3">Horário · ${esc(p.nome)}</h1>
    <p class="texto-suave esp-t-0">${esc(p.habilitacao.join(', '))} · ${esc(nomeAtualDoVinculo(p.vinculo) || 'vínculo não informado')} · ${u} de ${p.cargaHorariaSemanal} aulas por semana (${p.aulasEmOutrasTurmas} em outras turmas)</p>
    ${aulas.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela grade-horario"><caption class="sr-only">Aulas de ${esc(p.nome)} na semana</caption>
      <thead><tr><th scope="col">Horário</th>${DIAS.map((d) => `<th scope="col">${NOME_DO_DIA[d]}</th>`).join('')}</tr></thead>
      <tbody>${inicios.map((ini) => `<tr><th scope="row">${ini}</th>${DIAS.map((d) => { const a = aulas.find((x) => x.dia === d && x.inicio === ini); return `<td>${a ? `<strong>${esc(a.turma)}</strong><br><small>${esc(a.componente)}</small>` : '<span class="texto-suave">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="contagem">${aulas.length} ${plural(aulas.length, 'aula', 'aulas')} na grade desta escola</p>` : vazio('Nenhuma aula na grade', 'Escolha este professor numa aula da grade da turma ou aloque em Secretaria › Alocação.')}
    <h2>Disciplinas e turmas</h2>
    ${naMatriz.length ? `<ul class="lista-simples">${naMatriz.map(({ a, t }) => { const g = contarAulas(gradeDe(t.id))[a.componente] || 0; const m = aulasDoComponente(matrizes, a.componente, t.serie); return `<li><span><strong>${esc(a.componente)}</strong> na ${esc(t.nome)} <span class="texto-suave texto-pequeno">${t.turno} · ${m} ${plural(m, 'aula', 'aulas')} na matriz · ${g} na grade</span></span>${g !== m && gradeDe(t.id) ? etiqueta(g < m ? 'Faltam aulas na grade' : 'Aulas a mais na grade', 'atencao') : ''}</li>`; }).join('')}</ul>` : '<p class="texto-suave">Ainda sem alocação nesta escola.</p>'}`;
}

// ---------------- Professores por disciplina ----------------
function visaoDisciplinas() {
  const disciplinas = [...new Set([...turmas.flatMap((t) => matrizDaSerie(matrizes, t.serie).map((c) => c.componente)), ...professores.flatMap((p) => p.habilitacao)])];
  const grupos = agruparPorArea(disciplinas).filter((g) => !area || g.area === area);
  return `<h1>Professores por disciplina</h1>
    <p class="texto-suave">Os professores da escola separados pela disciplina em que são habilitados, com as turmas em que dão aula. Use as áreas para filtrar.</p>
    <div class="abas-estado" role="group" aria-label="Área do conhecimento"><button type="button" class="chip" data-area-lista="" aria-pressed="${!area}">Todas as áreas</button>${agruparPorArea(disciplinas).map((g) => `<button type="button" class="chip" data-area-lista="${esc(g.area)}" aria-pressed="${area === g.area}">${esc(g.area)}</button>`).join('')}</div>
    ${grupos.map((g) => `<h2>${esc(g.area)}</h2>${g.componentes.map((c) => {
      const profs = professores.filter((p) => p.habilitacao.includes(c));
      const turmasDaDisc = turmas.filter((t) => aulasDoComponente(matrizes, c, t.serie) > 0);
      const sem = turmasDaDisc.filter((t) => !professorDaDisciplina(alocacoes, t.id, c));
      return `<div class="bloco-nivel"><div class="linha-entre"><h3 class="esp-b-0">${esc(c)}</h3><div>${sem.length ? etiqueta(`${sem.length} ${plural(sem.length, 'turma sem professor', 'turmas sem professor')}`, 'atencao') : turmasDaDisc.length ? etiqueta('Todas as turmas com professor', 'ok') : ''}</div></div>
        ${profs.length ? `<ul class="lista-simples">${profs.map((p) => { const ts = alocacoes.filter((a) => a.professorId === p.id && a.componente === c).map((a) => turmas.find((t) => t.id === a.turmaId)?.nome).filter(Boolean); const u = usadas(p); return `<li><span><strong>${esc(p.nome)}</strong> <span class="texto-suave texto-pequeno">${esc(nomeAtualDoVinculo(p.vinculo) || 'vínculo não informado')} · ${u} de ${p.cargaHorariaSemanal} aulas · ${ts.length ? `dá aula na ${esc(ts.join(', '))}` : 'sem turma nesta disciplina'}</span></span><button type="button" class="botao botao-secundario botao-mini" data-ver-professor="${p.id}">Ver horário</button></li>`; }).join('')}</ul>` : `<p class="texto-suave esp-t-1">Nenhum professor habilitado na escola.</p>`}
        ${sem.length ? `<p class="texto-pequeno esp-t-1">Sem professor: ${esc(sem.map((t) => t.nome).join(', '))}.</p>` : ''}</div>`;
    }).join('')}`).join('')}`;
}

function desenhar() {
  main.innerHTML = `
    <div class="abas-estado" role="group" aria-label="Ver">${VISOES.map(([k, t]) => `<button type="button" class="chip" data-visao="${k}" aria-pressed="${visao === k}">${t}</button>`).join('')}</div>
    ${visao === 'turma' ? visaoTurma() : visao === 'professor' ? visaoProfessor() : visaoDisciplinas()}`;
}

// ---------------- Salvar ----------------
async function gravar(novosHorarios, novasAlocacoes, acao, alvo) {
  await salvar('horarios', novosHorarios);
  if (novasAlocacoes !== alocacoes) await salvar('alocacoes', novasAlocacoes);
  horarios = novosHorarios; alocacoes = novasAlocacoes;
  await registrarAcao(quem(), acao, alvo);
}
async function salvarAula() {
  const t = turmas.find((x) => x.id === turmaId);
  const grade = gradeDe(turmaId);
  const anterior = grade.aulas[celula.dia][celula.indice];
  const { componente } = escolha;
  const ehEO = componente === ESTUDO_ORIENTADO;
  const novoProf = ehEO ? null : escolha.professorId || null;
  const atual = ehEO ? null : professorDaDisciplina(alocacoes, t.id, componente);
  const estado = main.querySelector('#estado-horario');
  const bloquear = (texto) => { estado.innerHTML = `<p class="alerta-erro" role="alert">${icone('cadeado', 20)}<span>${esc(texto)}</span></p>`; estado.scrollIntoView({ block: 'center' }); };
  // A grade com a aula trocada (o professor da disciplina vale para todas as aulas dela na turma).
  const comAula = horarios.map((h) => (h.turmaId !== t.id ? h : { ...h, aulas: { ...h.aulas, [celula.dia]: h.aulas[celula.dia].map((a, i) => (i === celula.indice ? { componente, professorId: novoProf } : a)) } }));
  let novasAlocacoes = alocacoes, novosHorarios = comAula;
  if (!ehEO) {
    if (novoProf && novoProf !== atual) {
      const professor = professores.find((p) => p.id === novoProf);
      const motivo = bloqueioAlocacao({ professor, componente, aulas: aulasDaDisciplina(t, componente, comAula.find((h) => h.turmaId === t.id)), aulasJaAlocadas: aulasAlocadas(professor.id, ctx()) });
      if (motivo) { bloquear(motivo); return; }
    }
    const r = aplicarAlocacao({ alocacoes, horarios: comAula, turmaId: t.id, componente, professorId: novoProf });
    const conflitos = conflitosDaAlocacao(r.horarios, { turmaId: t.id, componente, professorId: novoProf });
    if (conflitos.length) { bloquear(`${nomeDe(novoProf)} já tem aula em outra turma: ${conflitos.join('; ')}. Escolha outro professor ou outro horário.`); return; }
    if (novoProf !== atual && atual && !(await confirmar({ titulo: `Trocar o professor de ${componente}?`, texto: `${nomeDe(atual)} deixa ${componente} na ${t.nome} e ${novoProf ? nomeDe(novoProf) : 'a disciplina fica sem professor'}${novoProf ? ' assume todas as aulas da semana' : ''}. A alocação da secretaria muda junto.`, botao: 'Trocar' }))) return;
    novasAlocacoes = r.alocacoes; novosHorarios = r.horarios;
  }
  try {
    await gravar(novosHorarios, novasAlocacoes, `Trocou ${NOME_DO_DIA[celula.dia].toLowerCase()} ${horaDaAula(grade.turno, celula.indice).inicio}: ${anterior.componente} → ${componente}${novoProf ? ` (${nomeDe(novoProf)})` : ''}`, t.nome);
    const foco = `[data-dia="${celula.dia}"][data-indice="${celula.indice}"]`;
    celula = null; escolha = null;
    desenhar(); main.querySelector(foco)?.focus();
    avisar(`Aula salva: ${componente}${novoProf ? ` com ${nomeDe(novoProf)}` : ''}.`);
  } catch { avisar('Não foi possível salvar a aula. Confira a conexão e tente de novo.'); mostrar(); }
}

main.addEventListener('change', (e) => {
  if (e.target.id === 'turma') { turmaId = e.target.value; celula = null; escolha = null; desenhar(); main.querySelector('#turma').focus(); }
  if (e.target.id === 'destaque') { destaque = e.target.value; desenhar(); main.querySelector('#destaque').focus(); }
  if (e.target.id === 'professor') { professorId = e.target.value; desenhar(); main.querySelector('#professor').focus(); }
  if (e.target.name === 'professor' && escolha) escolha.professorId = e.target.value || null;
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.visao) { visao = b.dataset.visao; celula = null; escolha = null; area = ''; desenhar(); main.querySelector(`[data-visao="${visao}"]`).focus(); return; }
  if (b.dataset.verProfessor) { visao = 'professor'; professorId = b.dataset.verProfessor; desenhar(); main.querySelector('#professor').focus(); return; }
  if (b.dataset.areaLista !== undefined) { area = b.dataset.areaLista; desenhar(); main.querySelector(`[data-area-lista="${CSS.escape(area)}"]`)?.focus(); return; }
  if (b.dataset.dia) { celula = { dia: b.dataset.dia, indice: Number(b.dataset.indice) }; escolha = null; area = ''; desenhar(); const ed = main.querySelector('#editor-aula'); ed?.scrollIntoView({ block: 'nearest' }); ed?.querySelector('[data-disciplina][aria-pressed="true"]')?.focus(); return; }
  if (b.dataset.areaEd !== undefined) { area = b.dataset.areaEd; desenhar(); main.querySelector(`[data-area-ed="${CSS.escape(area)}"]`)?.focus(); return; }
  if (b.dataset.disciplina) {
    const t = turmas.find((x) => x.id === turmaId);
    const c = b.dataset.disciplina;
    escolha = { componente: c, professorId: c === ESTUDO_ORIENTADO ? null : professorDaDisciplina(alocacoes, t.id, c) };
    desenhar(); main.querySelector(`[data-disciplina="${CSS.escape(c)}"]`)?.focus(); return;
  }
  if ('cancelarAula' in b.dataset) { const foco = celula && `[data-dia="${celula.dia}"][data-indice="${celula.indice}"]`; celula = null; escolha = null; desenhar(); if (foco) main.querySelector(foco)?.focus(); return; }
  if ('salvarAula' in b.dataset) { await salvarAula(); return; }
  if ('montarGrade' in b.dataset) {
    const t = turmas.find((x) => x.id === turmaId);
    try {
      const todos = await conjunto('horarios');
      if (todos.some((h) => h.turmaId === t.id)) { horarios = todos; desenhar(); return; }
      const grade = montarGrade(t, matrizDaSerie(matrizes, t.serie), alocacoes);
      await gravar([...todos, grade], alocacoes, 'Montou a grade da turma a partir da matriz', t.nome);
      desenhar(); avisar('Grade montada. Confira as aulas e troque o que precisar.');
      main.querySelector('.celula-aula')?.focus();
    } catch { avisar('Não foi possível montar a grade. Confira a conexão e tente de novo.'); }
  }
});
mostrar();
