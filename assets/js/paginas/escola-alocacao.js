// Alocação de professores com bloqueio de habilitação: o sistema impede alocar um professor em componente
// incompatível com o concurso e a formação, ou acima da carga horária semanal.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, avisar, etiqueta, confirmar } from '../ui.js';
import { carregar, turmasEscola, conjunto, salvar, registrarAcao } from '../dados.js';
import { colunaDaMatriz, bloqueioAlocacao } from '../regras.js';

const main = await iniciar({ perfil: 'escola', pagina: 'escola/alocacao.html', assistente: true, papel: 'Coordenação' });
let turmas, professores, alocacoes, matriz;
let turmaId = null;
let erro = null; // { componente, texto }

async function mostrar() {
  try {
    let matrizes;
    [turmas, professores, alocacoes, matrizes] = await Promise.all([turmasEscola(), carregar('professores'), conjunto('alocacoes'), carregar('matrizes')]);
    matriz = matrizes.versoes[0].componentes;
    turmas = turmas.filter((t) => t.situacao === 'Aprovada' && colunaDaMatriz(t.serie));
    turmaId = turmaId || turmas[0]?.id;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const aulasDoComponente = (componente, serie) => matriz.find((c) => c[0] === componente)?.[colunaDaMatriz(serie)] || 0;
const aulasAlocadas = (profId) => alocacoes.filter((a) => a.professorId === profId)
  .reduce((s, a) => s + aulasDoComponente(a.componente, turmas.find((t) => t.id === a.turmaId)?.serie || ''), 0);

function desenhar() {
  const t = turmas.find((x) => x.id === turmaId);
  const col = colunaDaMatriz(t.serie);
  const componentes = matriz.filter((c) => c[col] > 0);
  const semProfessor = componentes.filter(([c]) => !alocacoes.some((a) => a.turmaId === t.id && a.componente === c)).length;
  main.innerHTML = `
    <h1 style="margin-bottom:.3rem">Alocação de professores</h1>
    <p class="texto-suave" style="margin-top:0">Escolha o professor de cada componente. Pela regra de habilitação, o sistema bloqueia componentes incompatíveis com o concurso e a formação, e cargas acima do limite semanal.</p>
    <div class="ferramentas-tabela"><div class="campo"><label for="turma">Turma</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} · ${esc(x.turno)}</option>`).join('')}</select></div></div>
    <p class="contagem">${componentes.length} componentes na matriz 2025 · ${semProfessor ? `<strong style="color:var(--vermelho)">${semProfessor} sem professor</strong>` : 'todos com professor'}</p>
    ${componentes.map(([componente]) => {
      const aulas = aulasDoComponente(componente, t.serie);
      const atual = alocacoes.find((a) => a.turmaId === t.id && a.componente === componente);
      const prof = atual && professores.find((p) => p.id === atual.professorId);
      const id = `prof-${componente.replace(/\W/g, '')}`;
      return `<div class="cartao">
        <div class="linha-botoes" style="justify-content:space-between"><strong style="font-size:1.05rem">${esc(componente)} <span class="texto-suave" style="font-weight:400">· ${aulas} aula${aulas > 1 ? 's' : ''}/semana</span></strong>${prof ? etiqueta(prof.nome, 'ok') : etiqueta('Sem professor', 'atencao')}</div>
        ${prof ? `<div class="linha-botoes" style="margin-top:.6rem"><button type="button" class="botao botao-secundario" data-desalocar="${esc(componente)}">Tirar professor</button></div>` : `
          <div class="ferramentas-tabela" style="margin:.7rem 0 0">
            <div class="campo"><label for="${id}">Professor</label><select id="${id}" class="entrada">${professores.map((p) => `<option value="${p.id}">${esc(p.nome)}${p.habilitacao.includes(componente) ? '' : ' — não habilitado'}</option>`).join('')}</select></div>
            <button type="button" class="botao" data-alocar="${esc(componente)}" data-campo="${id}">Alocar</button>
          </div>
          ${erro && erro.componente === componente ? `<p class="alerta-erro" role="alert" style="margin:.7rem 0 0">${icone('cadeado', 20)}<span>Alocação bloqueada. ${esc(erro.texto)}</span></p>` : ''}`}
      </div>`;
    }).join('')}
    <h2>Quadro de professores</h2>
    ${professores.map((p) => {
      const usadas = p.aulasEmOutrasTurmas + aulasAlocadas(p.id);
      return `<div class="cartao"><strong>${esc(p.nome)}</strong><br><span class="texto-suave">Concurso: ${esc(p.concurso)} · Formação: ${esc(p.formacao)}</span>
        <div class="linha-botoes" style="margin:.5rem 0">${p.habilitacao.map((h) => etiqueta(h, 'info')).join('')}</div>
        <div class="barra" role="img" aria-label="${usadas} de ${p.cargaHorariaSemanal} aulas semanais"><span style="width:${Math.min(100, (usadas / p.cargaHorariaSemanal) * 100)}%"></span></div>
        <span class="texto-suave">${usadas} de ${p.cargaHorariaSemanal} aulas semanais</span></div>`;
    }).join('')}`;
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
      desenhar(); avisar('Componente sem professor.');
    }
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
