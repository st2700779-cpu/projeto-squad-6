// Pedidos de matrícula (HU12; wireframe W13 do mapa, tela W14): confirmar ou recusar com motivo
// em um painel logo abaixo do pedido. Recusar libera a vaga.
import { iniciar, falhaDados } from '../app.js';
import { esc, etiqueta, avisar } from '../ui.js';
import { matriculas, vagas as lerVagas, salvar } from '../dados.js';

const ESCOLA = 'e1';
const main = await iniciar({ perfil: 'escola', pagina: 'escola/matriculas.html', assistente: true, papel: 'Secretaria escolar' });
let filtro = 'Aguardando confirmação';
let recusando = null; // protocolo com o painel de recusa aberto
let erroRecusa = '';
let pedidos;

async function mostrar() {
  try { pedidos = await matriculas(); desenhar(); } catch { falhaDados(main, mostrar); }
}
function painelRecusa(p) {
  return `<div class="painel-inline" role="group" aria-labelledby="recusa-titulo">
    <h2 id="recusa-titulo">Recusar matrícula de ${esc(p.estudante)}</h2>
    <div class="campo" style="margin:0">
      <label for="motivo">Motivo <span class="dica">(obrigatório; a família verá este texto)</span></label>
      <textarea id="motivo" class="entrada" aria-describedby="motivo-erro" ${erroRecusa ? 'aria-invalid="true"' : ''}></textarea>
      <p id="motivo-erro" class="erro">${esc(erroRecusa)}</p>
    </div>
    <div class="linha-botoes" style="justify-content:flex-end;margin-top:.7rem">
      <button type="button" class="botao botao-secundario" data-cancelar-recusa>Cancelar</button>
      <button type="button" class="botao" data-confirmar-recusa="${esc(p.protocolo)}">Confirmar recusa</button>
    </div>
  </div>`;
}
function desenhar() {
  const daEscola = pedidos.filter((p) => p.escolaId === ESCOLA);
  const abas = ['Aguardando confirmação', 'Confirmada', 'Recusada'];
  const nomes = { 'Aguardando confirmação': 'Aguardando', Confirmada: 'Confirmadas', Recusada: 'Recusadas' };
  const lista = daEscola.filter((p) => p.situacao === filtro);
  main.innerHTML = `
    <h1>Pedidos de matrícula</h1>
    <div class="filtros" role="group" aria-label="Filtrar por situação">
      ${abas.map((a) => { const n = daEscola.filter((p) => p.situacao === a).length; return `<button type="button" data-filtro="${a}" aria-pressed="${a === filtro}">${nomes[a]}${n ? ` (${n})` : ''}</button>`; }).join('')}
    </div>
    ${lista.length ? lista.map((p) => `
      <div class="cartao d-flex flex-wrap align-items-center gap-3">
        <div style="flex:1;min-width:240px"><strong style="font-size:1.1rem">${esc(p.estudante)}</strong><br><span class="texto-suave" style="font-size:.92rem">${esc(p.tipo)} · ${esc(p.serie)} · Responsável: ${esc(p.responsavel)} · ${esc(p.protocolo)}</span>${p.motivo ? `<br><span>Motivo: ${esc(p.motivo)}</span>` : ''}</div>
        ${etiqueta(p.situacao, p.situacao === 'Confirmada' ? 'ok' : p.situacao === 'Recusada' ? 'erro' : 'atencao')}
        ${p.situacao === 'Aguardando confirmação' ? `<div class="linha-botoes"><button type="button" class="botao" data-confirmar="${esc(p.protocolo)}">Confirmar</button><button type="button" class="botao botao-secundario" data-recusar="${esc(p.protocolo)}" aria-expanded="${recusando === p.protocolo}">Recusar</button></div>` : ''}
      </div>
      ${recusando === p.protocolo ? painelRecusa(p) : ''}`).join('') : '<p class="vazio">Nenhum pedido nesta situação.</p>'}`;
  if (recusando) main.querySelector('#motivo')?.focus();
}
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.filtro) { filtro = b.dataset.filtro; recusando = null; desenhar(); return; }
  if (b.dataset.recusar) { recusando = b.dataset.recusar; erroRecusa = ''; desenhar(); return; }
  if ('cancelarRecusa' in b.dataset) {
    const protocolo = recusando;
    recusando = null; desenhar();
    main.querySelector(`[data-recusar="${CSS.escape(protocolo)}"]`)?.focus();
    return;
  }
  try {
    if (b.dataset.confirmar) {
      pedidos.find((p) => p.protocolo === b.dataset.confirmar).situacao = 'Confirmada';
      await salvar('matriculas', pedidos); desenhar(); avisar('Matrícula confirmada.');
    }
    if (b.dataset.confirmarRecusa) {
      const motivo = main.querySelector('#motivo').value.trim();
      if (motivo.length < 5) { erroRecusa = 'Escreva o motivo com pelo menos 5 caracteres. A família verá este texto.'; desenhar(); return; }
      const p = pedidos.find((x) => x.protocolo === b.dataset.confirmarRecusa);
      Object.assign(p, { situacao: 'Recusada', motivo });
      const v = await lerVagas();
      if (v[p.escolaId]?.[p.serie] !== undefined) { v[p.escolaId][p.serie] += 1; await salvar('vagas', v); }
      await salvar('matriculas', pedidos);
      recusando = null; erroRecusa = '';
      desenhar(); avisar('Matrícula recusada. A vaga foi liberada.');
    }
  } catch {
    avisar('Não foi possível salvar. Tente de novo.');
    mostrar();
  }
});
mostrar();
