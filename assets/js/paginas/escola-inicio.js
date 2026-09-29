// Início da escola: pendências do dia, autorizações e histórico das últimas ações.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, dataBR, etiqueta, icone, vazio, dataHoraBR, plural } from '../ui.js';
import { carregar, matriculas, turmasEscola, conjunto } from '../dados.js';
import { situacaoAto } from '../regras.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/index.html', assistente: true });
async function mostrar() {
  try {
    const [escolas, atos, pedidos, turmas, enturmacao, historico] = await Promise.all([carregar('escolas'), carregar('atos'), matriculas(), turmasEscola(), conjunto('enturmacao'), conjunto('historico')]);
    const escola = escolas.find((e) => e.id === ESCOLA);
    const daEscola = pedidos.filter((p) => p.escolaId === ESCOLA);
    const aguardando = daEscola.filter((p) => p.situacao === 'Aguardando confirmação').length;
    const semTurma = daEscola.filter((p) => p.situacao === 'Confirmada' && !enturmacao[p.protocolo]).length;
    const pendentes = turmas.filter((t) => t.situacao === 'Pendente de aprovação').length;
    const meusAtos = atos.filter((a) => a.escolaId === ESCOLA);
    const vencidos = meusAtos.filter((a) => !situacaoAto(a).vigente).length;
    main.innerHTML = `
      <h1>${esc(escola.nome)}</h1><p class="pagina-descricao">${esc(escola.dre)} · resumo do que precisa de atenção hoje</p>
      <div class="numeros">
        <a class="numero${aguardando ? ' atencao' : ''}" href="${link('escola/matriculas.html')}"><span class="numero-icone">${icone('formulario', 22)}</span><strong>${aguardando}</strong><span>${plural(aguardando, 'matrícula para confirmar', 'matrículas para confirmar')}</span></a>
        <a class="numero${semTurma ? ' atencao' : ''}" href="${link('escola/enturmacao.html')}"><span class="numero-icone">${icone('pessoas', 22)}</span><strong>${semTurma}</strong><span>${plural(semTurma, 'estudante sem turma', 'estudantes sem turma')}</span></a>
        <a class="numero${pendentes ? ' atencao' : ''}" href="${link('escola/turmas.html')}"><span class="numero-icone">${icone('usuario', 22)}</span><strong>${pendentes}</strong><span>${plural(pendentes, 'turma aguardando aprovação', 'turmas aguardando aprovação')}</span></a>
        <div class="numero${vencidos ? ' alerta' : ' ok'}"><span class="numero-icone">${icone(vencidos ? 'alerta' : 'ok', 22)}</span><strong>${vencidos}</strong><span>${plural(vencidos, 'autorização vencida', 'autorizações vencidas')}</span></div>
      </div>
      <div class="cartao"><h2 class="esp-t-0">Autorizações da escola</h2>
        ${meusAtos.map((a) => { const s = situacaoAto(a); return `<div class="d-flex justify-content-between align-items-center gap-2 py-2 linha-divisoria"><span>${esc(a.etapa)}<br><span class="texto-suave texto-pequeno">${esc(a.numero)} · validade ${dataBR(a.validade)}</span></span>${etiqueta(s.texto, s.tipo)}</div>`; }).join('')}
        <p class="texto-suave texto-pequeno esp-t-3 esp-b-0">Sem ato vigente, a escola não pode abrir turma nem certificar estudantes daquela etapa.</p>
      </div>
      <h2>Últimas ações</h2>
      ${historico.length
        ? `<div class="cartao"><ul class="lista-simples esp-t-0 esp-b-0">${historico.slice(0, 8).map((h) => `<li class="inicio-topo">${icone('relogio', 18)}<span><strong>${esc(h.quem)}</strong> · ${esc(h.acao)}${h.alvo ? ` <span class="texto-suave">(${esc(h.alvo)})</span>` : ''}<br><span class="texto-suave texto-pequeno">${dataHoraBR(h.quando)}</span></span></li>`).join('')}</ul></div>`
        : vazio('Nenhuma ação registrada ainda', 'Confirmações, recusas, aprovações de turma e enturmações aparecem aqui com quem fez e quando.', 'relogio')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
