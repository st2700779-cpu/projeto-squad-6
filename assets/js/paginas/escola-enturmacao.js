// Enturmação: a secretaria coloca os estudantes com matrícula confirmada nas turmas aprovadas da mesma série,
// sem passar da capacidade da sala.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, avisar, vazio, etiqueta, confirmar } from '../ui.js';
import { matriculas, turmasEscola, conjunto, salvar, registrarAcao } from '../dados.js';
import { codigoDaTurma } from '../regras.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/enturmacao.html', assistente: true, papel: 'Secretaria escolar' });
let pedidos, turmas, enturmacao;

async function mostrar() {
  try {
    [pedidos, turmas, enturmacao] = await Promise.all([matriculas(), turmasEscola(), conjunto('enturmacao')]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const aprovadas = () => turmas.filter((t) => t.situacao === 'Aprovada');
const ocupacao = (t) => (t.matriculados || 0) + Object.values(enturmacao).filter((id) => id === t.id).length;
const livres = (t) => (t.capacidade || 0) - ocupacao(t);

function desenhar() {
  const confirmados = pedidos.filter((p) => p.escolaId === ESCOLA && p.situacao === 'Confirmada');
  const semTurma = confirmados.filter((p) => !enturmacao[p.protocolo]);
  const enturmados = confirmados.filter((p) => enturmacao[p.protocolo]);
  const linhaEspera = (p) => {
    const opcoes = aprovadas().filter((t) => t.serie === p.serie);
    const comVaga = opcoes.filter((t) => livres(t) > 0);
    const acao = comVaga.length
      ? `<div class="linha-botoes"><label class="sr-only" for="turma-${esc(p.protocolo)}">Turma de ${esc(p.estudante)}</label><select id="turma-${esc(p.protocolo)}" class="entrada">${opcoes.map((t) => `<option value="${t.id}" ${livres(t) > 0 ? '' : 'disabled'}>${esc(t.nome)} · ${esc(t.turno)} · ${livres(t) > 0 ? `${livres(t)} ${livres(t) > 1 ? 'vagas' : 'vaga'}` : 'sem vaga'}</option>`).join('')}</select><button type="button" class="botao botao-mini" data-enturmar="${esc(p.protocolo)}" aria-label="Colocar ${esc(p.estudante)} na turma escolhida">Enturmar</button></div>`
      : `<span class="erro">Nenhuma turma aprovada com vaga na ${esc(p.serie)}. Crie a turma em <a href="${link('escola/turmas.html')}">Turmas</a> e peça a aprovação da direção.</span>`;
    return `<tr><td class="titulo-linha"><strong>${esc(p.estudante)}</strong><small>${esc(p.protocolo)}</small></td><td data-rotulo="Tipo">${esc(p.tipo)}</td><td data-rotulo="Série" class="sem-quebra-texto">${esc(p.serie)}</td><td class="acoes">${acao}</td></tr>`;
  };
  main.innerHTML = `
    <h1>Enturmação · 2026</h1>
    <p class="pagina-descricao">Estudantes com matrícula confirmada entram em turma aprovada da mesma série, respeitando a capacidade da sala.</p>
    <h2 class="esp-t-0">Aguardando turma (${semTurma.length})</h2>
    ${semTurma.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Estudantes aguardando turma</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Tipo</th><th scope="col">Série</th><th scope="col">Turma</th></tr></thead>
      <tbody>${semTurma.map(linhaEspera).join('')}</tbody></table></div>
      <p class="contagem">${semTurma.length} ${semTurma.length === 1 ? 'estudante' : 'estudantes'} sem turma</p>`
      : vazio('Todos os estudantes confirmados já têm turma', 'Quando a secretaria confirmar uma nova matrícula, o estudante aparece aqui para ser enturmado.')}
    <h2>Ocupação das turmas</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Ocupação das turmas aprovadas</caption>
      <thead><tr><th scope="col">Turma</th><th scope="col">Código</th><th scope="col">Turno</th><th scope="col">Sala</th><th scope="col" class="num">Ocupação</th><th scope="col">Situação</th></tr></thead>
      <tbody>${aprovadas().map((t) => { const oc = ocupacao(t); const vagas = t.capacidade - oc; return `<tr><td class="titulo-linha"><strong>${esc(t.nome)}</strong></td><td data-rotulo="Código">${esc(codigoDaTurma(t))}</td><td data-rotulo="Turno">${esc(t.turno)}</td><td data-rotulo="Sala">${esc(t.sala)}</td><td class="num" data-rotulo="Ocupação">${oc} de ${t.capacidade}</td><td data-rotulo="Situação">${vagas <= 0 ? etiqueta('Turma cheia', 'atencao') : `${vagas} ${vagas > 1 ? 'vagas' : 'vaga'}`}</td></tr>`; }).join('')}</tbody></table></div>
    ${enturmados.length ? `<h2>Enturmados nesta demonstração</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Estudantes enturmados</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Turma</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
      <tbody>${enturmados.map((p) => { const t = turmas.find((x) => x.id === enturmacao[p.protocolo]); return `<tr><td class="titulo-linha"><strong>${esc(p.estudante)}</strong><small>${esc(p.protocolo)}</small></td><td data-rotulo="Turma">${esc(t.nome)} · ${esc(t.turno)}</td><td class="acoes"><button type="button" class="botao botao-secundario botao-mini" data-tirar="${esc(p.protocolo)}" aria-label="Tirar ${esc(p.estudante)} da turma">Tirar da turma</button></td></tr>`; }).join('')}</tbody></table></div>` : ''}`;
}

main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.enturmar) {
      const protocolo = b.dataset.enturmar;
      const t = turmas.find((x) => x.id === main.querySelector(`#turma-${CSS.escape(protocolo)}`).value);
      if (!t || livres(t) <= 0) { avisar('Esta turma está cheia. Escolha outra.'); return; }
      enturmacao[protocolo] = t.id;
      await salvar('enturmacao', enturmacao);
      const p = pedidos.find((x) => x.protocolo === protocolo);
      await registrarAcao('Secretaria escolar', `Colocou ${p.estudante} na ${t.nome}`, protocolo);
      desenhar(); avisar(`${p.estudante} está na ${t.nome}.`);
    }
    if (b.dataset.tirar) {
      const protocolo = b.dataset.tirar;
      const p = pedidos.find((x) => x.protocolo === protocolo);
      const t = turmas.find((x) => x.id === enturmacao[protocolo]);
      if (!(await confirmar({ titulo: 'Tirar da turma?', texto: `${p.estudante} volta para a lista de quem aguarda turma. A vaga na ${t.nome} fica livre.`, botao: 'Tirar da turma' }))) return;
      delete enturmacao[protocolo];
      await salvar('enturmacao', enturmacao);
      await registrarAcao('Secretaria escolar', `Tirou ${p.estudante} da ${t.nome}`, protocolo);
      desenhar(); avisar('Estudante voltou para a lista de espera.');
    }
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
