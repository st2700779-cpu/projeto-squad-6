// Pedidos de matrícula (HU12): confirmar ou recusar com motivo. Recusar libera a vaga.
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, pedirTexto, avisar } from '../ui.js';
import { matriculas, vagas as lerVagas, salvar } from '../dados.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/matriculas.html', assistente: true });
let filtro = 'Aguardando confirmação';
let pedidos;

async function mostrar() {
  try { pedidos = await matriculas(); desenhar(); } catch { falhaDados(main, mostrar); }
}
function desenhar() {
  const daEscola = pedidos.filter((p) => p.escolaId === ESCOLA);
  const abas = ['Aguardando confirmação', 'Confirmada', 'Recusada'];
  const nomes = { 'Aguardando confirmação': 'Aguardando', Confirmada: 'Confirmadas', Recusada: 'Recusadas' };
  const lista = daEscola.filter((p) => p.situacao === filtro);
  main.innerHTML = `
    <h1>Pedidos de matrícula</h1>
    <div class="linha-botoes" role="group" aria-label="Filtrar por situação" style="margin-bottom:1rem">
      ${abas.map((a) => `<button type="button" class="botao ${a === filtro ? '' : 'botao-secundario'}" data-filtro="${a}" aria-pressed="${a === filtro}">${nomes[a]} (${daEscola.filter((p) => p.situacao === a).length})</button>`).join('')}
    </div>
    ${lista.length ? lista.map((p) => `
      <div class="cartao d-flex flex-wrap align-items-center gap-3">
        <div style="flex:1;min-width:240px"><strong style="font-size:1.1rem">${esc(p.estudante)}</strong><br><span class="texto-suave">${esc(p.tipo)} · ${esc(p.serie)} · Responsável: ${esc(p.responsavel)} · ${esc(p.protocolo)} · ${esc(p.data)}</span>${p.motivo ? `<br><span>Motivo: ${esc(p.motivo)}</span>` : ''}</div>
        ${etiqueta(p.situacao, p.situacao === 'Confirmada' ? 'ok' : p.situacao === 'Recusada' ? 'erro' : 'atencao')}
        ${p.situacao === 'Aguardando confirmação' ? `<button type="button" class="botao" data-confirmar="${p.protocolo}">Confirmar</button><button type="button" class="botao botao-secundario" data-recusar="${p.protocolo}">Recusar</button>` : ''}
      </div>`).join('') : '<p class="vazio">Nenhum pedido nesta situação.</p>'}`;
}
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.filtro) { filtro = b.dataset.filtro; desenhar(); }
  try {
    if (b.dataset.confirmar) {
      pedidos.find((p) => p.protocolo === b.dataset.confirmar).situacao = 'Confirmada';
      await salvar('matriculas', pedidos); desenhar(); avisar('Matrícula confirmada.');
    }
    if (b.dataset.recusar) {
      const motivo = await pedirTexto({ titulo: 'Recusar matrícula', rotulo: 'Motivo (a família verá este texto)' });
      if (motivo === null) return;
      const p = pedidos.find((x) => x.protocolo === b.dataset.recusar);
      Object.assign(p, { situacao: 'Recusada', motivo });
      const v = await lerVagas();
      if (v[p.escolaId]?.[p.serie] !== undefined) { v[p.escolaId][p.serie] += 1; await salvar('vagas', v); }
      await salvar('matriculas', pedidos); desenhar(); avisar('Matrícula recusada. A vaga foi liberada.');
    }
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
