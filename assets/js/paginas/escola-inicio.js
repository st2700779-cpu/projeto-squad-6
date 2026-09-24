import { iniciar, link, falhaDados } from '../app.js';
import { esc, dataBR, etiqueta } from '../ui.js';
import { carregar, matriculas, turmasEscola } from '../dados.js';
import { situacaoAto } from '../regras.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/index.html', assistente: true });
async function mostrar() {
  try {
    const [escolas, atos, pedidos, turmas] = await Promise.all([carregar('escolas'), carregar('atos'), matriculas(), turmasEscola()]);
    const escola = escolas.find((e) => e.id === ESCOLA);
    const aguardando = pedidos.filter((p) => p.escolaId === ESCOLA && p.situacao === 'Aguardando confirmação').length;
    const pendentes = turmas.filter((t) => t.situacao === 'Pendente de aprovação').length;
    const meusAtos = atos.filter((a) => a.escolaId === ESCOLA);
    const vencidos = meusAtos.filter((a) => !situacaoAto(a).vigente).length;
    main.innerHTML = `
      <h1>${esc(escola.nome)}</h1><p class="texto-suave">${esc(escola.dre)}</p>
      <div class="numeros">
        <a class="numero" href="${link('escola/matriculas.html')}"><strong>${aguardando}</strong><span>matrículas para confirmar</span></a>
        <a class="numero" href="${link('escola/turmas.html')}"><strong>${pendentes}</strong><span>turmas aguardando aprovação</span></a>
        <div class="numero${vencidos ? ' alerta' : ''}"><strong>${vencidos}</strong><span>autorizações vencidas</span></div>
      </div>
      <div class="cartao"><h2 style="margin-top:0">Autorizações da escola</h2>
        ${meusAtos.map((a) => { const s = situacaoAto(a); return `<div class="d-flex justify-content-between align-items-center gap-2 py-2" style="border-bottom:1px solid var(--linha)"><span>${esc(a.etapa)}<br><span class="texto-suave" style="font-size:.9rem">${esc(a.numero)} · validade ${dataBR(a.validade)}</span></span>${etiqueta(s.texto, s.tipo)}</div>`; }).join('')}
        <p class="texto-suave" style="font-size:.9rem;margin:.6rem 0 0">Sem ato vigente, a escola não pode abrir turma nem certificar estudantes daquela etapa.</p>
      </div>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
