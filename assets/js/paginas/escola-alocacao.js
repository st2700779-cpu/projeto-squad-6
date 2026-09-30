// Alocação de professores com bloqueio de habilitação: o sistema impede alocar um professor em componente
// incompatível com o concurso e a formação, ou acima da carga horária semanal.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, avisar, etiqueta, confirmar } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao } from '../dados.js';
import { colunaDaMatriz, bloqueioAlocacao, codigoDaTurma, aulasDoComponente as aulasNaMatriz, aulasAlocadas as aulasDoProfessor } from '../regras.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/alocacao.html', assistente: true, papel: 'Coordenação' });
let turmas, professores, alocacoes, matriz;
let turmaId = null;
let erro = null; // { componente, texto }

async function mostrar() {
  try {
    let matrizes;
    [turmas, professores, alocacoes, matrizes] = await Promise.all([turmasEscola(), carregar('professores'), conjunto('alocacoes'), carregar('matrizes')]);
    professores = professores.filter((p) => !p.escolaId || p.escolaId === 'e1'); // só os professores lotados nesta escola
    matriz = matrizes.versoes[0].componentes;
    turmas = turmas.filter((t) => t.situacao === 'Aprovada' && colunaDaMatriz(t.serie));
    turmaId = turmaId || turmas[0]?.id;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const aulasDoComponente = (componente, serie) => aulasNaMatriz(matriz, componente, serie);
const aulasAlocadas = (profId) => aulasDoProfessor(profId, { alocacoes, turmas, matriz });

function desenhar() {
  const t = turmas.find((x) => x.id === turmaId);
  const col = colunaDaMatriz(t.serie);
  const componentes = matriz.filter((c) => c[col] > 0);
  const semProfessor = componentes.filter(([c]) => !alocacoes.some((a) => a.turmaId === t.id && a.componente === c)).length;
  const linha = ([componente]) => {
    const aulas = aulasDoComponente(componente, t.serie);
    const atual = alocacoes.find((a) => a.turmaId === t.id && a.componente === componente);
    const prof = atual && professores.find((p) => p.id === atual.professorId);
    const id = `prof-${componente.replace(/\W/g, '')}`;
    const acao = prof
      ? `<button type="button" class="botao botao-secundario botao-mini" data-desalocar="${esc(componente)}" aria-label="Tirar ${esc(prof.nome)} de ${esc(componente)}">Tirar professor</button>`
      : `<div class="linha-botoes"><label class="sr-only" for="${id}">Professor de ${esc(componente)}</label><select id="${id}" class="entrada">${professores.map((p) => `<option value="${p.id}">${esc(p.nome)}${p.habilitacao.includes(componente) ? '' : ' — não habilitado'}</option>`).join('')}</select><button type="button" class="botao botao-mini" data-alocar="${esc(componente)}" data-campo="${id}" aria-label="Alocar professor em ${esc(componente)}">Alocar professor</button></div>`;
    return `<tr><td class="titulo-linha"><strong>${esc(componente)}</strong></td><td class="num" data-rotulo="Aulas por semana">${aulas}</td><td data-rotulo="Professor">${prof ? esc(prof.nome) : etiqueta('Sem professor', 'atencao')}</td><td class="acoes">${acao}</td></tr>`;
  };
  main.innerHTML = `
    <h1>Alocação de professores · ${esc(t.nome)} · ${esc(t.turno)}</h1>
    <p class="pagina-descricao">Não é possível alocar professor sem habilitação no componente, nem acima da carga semanal.</p>
    <div class="ferramentas-tabela"><div class="campo"><label for="turma">Turma</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} · ${esc(x.turno)} · ${esc(codigoDaTurma(x))}</option>`).join('')}</select></div></div>
    ${erro ? `<p class="alerta-erro" role="alert">${icone('cadeado', 20)}<span>Alocação bloqueada em ${esc(erro.componente)}. ${esc(erro.texto)}</span></p>` : ''}
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Componentes da matriz e professores da turma</caption>
      <thead><tr><th scope="col">Componente</th><th scope="col" class="num">Aulas por semana</th><th scope="col">Professor</th><th scope="col">Alocação</th></tr></thead>
      <tbody>${componentes.map(linha).join('')}</tbody></table></div>
    <p class="contagem">${componentes.length} componentes da matriz 2025 · ${semProfessor ? `<strong class="cor-perigo">${semProfessor} sem professor</strong>` : 'todos com professor'}</p>
    <h2>Carga horária dos professores</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Carga horária semanal dos professores</caption>
      <thead><tr><th scope="col">Professor</th><th scope="col">Concurso</th><th scope="col">Formação</th><th scope="col">Habilitação</th><th scope="col" class="num">Aulas por semana</th></tr></thead>
      <tbody>${professores.map((p) => { const usadas = p.aulasEmOutrasTurmas + aulasAlocadas(p.id); return `<tr><td class="titulo-linha"><strong>${esc(p.nome)}</strong></td><td data-rotulo="Concurso">${esc(p.concurso)}</td><td data-rotulo="Formação">${esc(p.formacao)}</td><td data-rotulo="Habilitação">${esc(p.habilitacao.join(', '))}</td><td class="num${usadas > p.cargaHorariaSemanal ? ' cor-perigo' : ''}" data-rotulo="Aulas por semana">${usadas} de ${p.cargaHorariaSemanal}<div class="barra" role="img" aria-label="${usadas} de ${p.cargaHorariaSemanal} aulas semanais"><span style="width:${Math.min(100, (usadas / p.cargaHorariaSemanal) * 100)}%"></span></div></td></tr>`; }).join('')}</tbody></table></div>`;
}

main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; erro = null; desenhar(); } });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = turmas.find((x) => x.id === turmaId);
  try {
    if (b.dataset.alocar) {
      const componente = b.dataset.alocar;
      const professor = professores.find((p) => p.id === main.querySelector(`#${b.dataset.campo}`).value);
      const motivo = bloqueioAlocacao({ professor, componente, aulas: aulasDoComponente(componente, t.serie), aulasJaAlocadas: aulasAlocadas(professor.id) });
      if (motivo) {
        erro = { componente, texto: motivo };
        desenhar();
        main.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' });
        return;
      }
      erro = null;
      alocacoes.push({ turmaId: t.id, componente, professorId: professor.id });
      await salvar('alocacoes', alocacoes);
      await registrarAcao('Coordenação', `Alocou ${professor.nome} em ${componente}`, t.nome);
      desenhar(); avisar(`${professor.nome} alocado(a) em ${componente}.`);
    }
    if (b.dataset.desalocar) {
      const componente = b.dataset.desalocar;
      const atual = alocacoes.find((a) => a.turmaId === t.id && a.componente === componente);
      const professor = professores.find((p) => p.id === atual.professorId);
      if (!(await confirmar({ titulo: 'Tirar o professor?', texto: `${professor.nome} deixa de lecionar ${componente} na ${t.nome}, e o componente fica sem professor.`, botao: 'Tirar professor' }))) return;
      alocacoes = alocacoes.filter((a) => a !== atual);
      await salvar('alocacoes', alocacoes);
      await registrarAcao('Coordenação', `Tirou ${professor.nome} de ${componente}`, t.nome);
      desenhar(); avisar(`Professor retirado de ${componente}. O componente ficou sem professor.`);
    }
  } catch {
    avisar('A alocação não foi salva e nada foi alterado. Confira a conexão e repita a ação.');
    mostrar();
  }
});
mostrar();
