// Enturmação: a secretaria coloca os estudantes com matrícula confirmada nas turmas aprovadas da mesma série,
// sem passar da capacidade da sala.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, icone, avisar, vazio, etiqueta, confirmar } from '../ui.js';
import { matriculas, turmasEscola, conjunto, salvar, registrarAcao } from '../dados.js';

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
  main.innerHTML = `
    <h1 style="margin-bottom:.3rem">Enturmação</h1>
    <p class="texto-suave" style="margin-top:0">Coloque cada estudante com matrícula confirmada em uma turma aprovada da mesma série. Turmas cheias não aparecem como opção.</p>
    <h2>Aguardando turma (${semTurma.length})</h2>
    ${semTurma.length ? semTurma.map((p) => {
      const opcoes = aprovadas().filter((t) => t.serie === p.serie);
      const comVaga = opcoes.filter((t) => livres(t) > 0);
      return `<div class="cartao">
        <strong style="font-size:1.1rem">${esc(p.estudante)}</strong><br><span class="texto-suave">${esc(p.tipo)} · ${esc(p.serie)} · ${esc(p.protocolo)}</span>
        ${comVaga.length ? `<div class="ferramentas-tabela" style="margin:.8rem 0 0">
            <div class="campo"><label for="turma-${esc(p.protocolo)}">Turma</label><select id="turma-${esc(p.protocolo)}" class="entrada">${opcoes.map((t) => `<option value="${t.id}" ${livres(t) > 0 ? '' : 'disabled'}>${esc(t.nome)} · ${esc(t.turno)} · ${livres(t) > 0 ? `${livres(t)} vaga${livres(t) > 1 ? 's' : ''}` : 'cheia'}</option>`).join('')}</select></div>
            <button type="button" class="botao" data-enturmar="${esc(p.protocolo)}">Colocar na turma</button>
          </div>`
        : `<p class="alerta-erro" style="margin:.8rem 0 0">${icone('alerta', 20)}<span>Nenhuma turma aprovada com vaga na ${esc(p.serie)}. Crie uma turma em <a href="${link('escola/turmas.html')}">Turmas</a> e peça a aprovação da direção.</span></p>`}
      </div>`;
    }).join('') : vazio('Todos os confirmados já estão em uma turma', 'Quando a secretaria confirmar uma nova matrícula, o estudante aparece aqui para ser enturmado.', 'ok')}
    <h2>Ocupação das turmas</h2>
    ${aprovadas().map((t) => {
      const oc = ocupacao(t);
      const nesta = confirmados.filter((p) => enturmacao[p.protocolo] === t.id);
      return `<div class="cartao">
        <div class="linha-botoes" style="justify-content:space-between"><strong>${esc(t.nome)} <span class="texto-suave" style="font-weight:400">· ${esc(t.turno)} · ${esc(t.sala)}</span></strong>${oc >= t.capacidade ? etiqueta('Cheia', 'erro') : etiqueta(`${t.capacidade - oc} vaga${t.capacidade - oc > 1 ? 's' : ''}`, 'ok')}</div>
        <div class="barra" style="margin:.6rem 0 .3rem" role="img" aria-label="${oc} de ${t.capacidade} lugares ocupados"><span style="width:${Math.min(100, (oc / t.capacidade) * 100)}%"></span></div>
        <span class="texto-suave">${oc} de ${t.capacidade} lugares</span>
        ${nesta.length ? `<ul class="lista-simples">${nesta.map((p) => `<li><span>${esc(p.estudante)} <span class="texto-suave">(novo)</span></span><button type="button" class="botao botao-secundario" data-tirar="${esc(p.protocolo)}">Tirar da turma</button></li>`).join('')}</ul>` : ''}
      </div>`;
    }).join('')}`;
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
