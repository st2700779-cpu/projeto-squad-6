// Acompanhar o pedido de matrícula (como na Matrícula Online oficial): com o protocolo do comprovante e a data de nascimento do
// estudante, a família vê em que etapa o pedido está: enviado, documentos e confirmação da escola, estudante na turma.
// Os dois dados juntos evitam que alguém veja o pedido de outra família. Regra em dominio/matricula-online.js.
import { iniciar, falhaDados, link } from '../app.js';
import { esc, icone } from '../ui.js';
import { carregar, matriculas, conjunto, turmasDaRede } from '../dados.js';
import { serieCompleta } from '../regras.js';
import { acompanharPedido } from '../dominio/matricula-online.js';
import { semaforo } from '../componentes/indicadores.js';
import '../componentes/data-br.js'; // data de nascimento em dd/mm/aaaa

const main = await iniciar({ perfil: 'familia', pagina: 'familia/acompanhar.html', assistente: true, titulo: 'Acompanhar pedido', estreito: true });
const NIVEL = { feito: { chave: 'verde', icone: 'ok', texto: 'Feito' }, atual: { chave: 'amarelo', icone: 'relogio', texto: 'Agora' }, falta: { chave: 'neutro', icone: '', texto: 'Depois' }, recusado: { chave: 'vermelho', icone: 'fechar', texto: 'Recusado' } };
let ultimo = { protocolo: new URLSearchParams(location.search).get('protocolo') || '', nascimento: '' };

function desenhar(resultado = null) {
  main.innerHTML = `
    <h1>Acompanhar pedido de matrícula</h1>
    <p class="texto-medio">Use o protocolo que está no comprovante e a data de nascimento do estudante.</p>
    <form id="form-acompanhar" class="form-cadastro" novalidate>
      <div class="campo"><label for="a-protocolo">Protocolo</label><input id="a-protocolo" class="entrada" autocomplete="off" placeholder="MAT-2026-0007" maxlength="13" value="${esc(ultimo.protocolo)}" aria-describedby="a-erro"></div>
      <div class="campo"><label for="a-nascimento">Data de nascimento do estudante <span class="dica">dd/mm/aaaa</span></label><input id="a-nascimento" class="entrada" type="text" data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" value="${esc(ultimo.nascimento)}" aria-describedby="a-erro"></div>
      <p class="erro" id="a-erro" role="alert">${resultado && !resultado.ok ? esc(resultado.erro) : ''}</p>
      <div class="form-acoes"><button type="submit" class="botao botao-grande">${icone('busca', 22)}Ver o pedido</button></div>
    </form>
    ${resultado?.ok ? `<section aria-labelledby="res-titulo" id="resultado" tabindex="-1">
      <h2 id="res-titulo">${esc(resultado.pedido.estudante)}</h2>
      <p class="esp-t-0">${esc(serieCompleta(resultado.pedido.serie))} · ${esc(resultado.pedido.tipo)} · protocolo <strong>${esc(resultado.pedido.protocolo)}</strong></p>
      <ol class="etapas-pedido">${resultado.etapas.map((e) => `<li>${semaforo(NIVEL[e.estado])}<div><strong>${esc(e.nome)}</strong><p class="esp-t-1 esp-b-0">${esc(e.detalhe)}</p></div></li>`).join('')}</ol>
      ${resultado.escola ? `<p class="texto-suave">Dúvidas: secretaria da ${esc(resultado.escola.nome)}${resultado.escola.telefone ? `, telefone ${esc(resultado.escola.telefone)}` : ''}.</p>` : ''}
    </section>` : ''}
    <p class="esp-t-4"><a href="${link('familia/matricula.html')}">Fazer um pedido novo</a></p>`;
}
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  ultimo = { protocolo: main.querySelector('#a-protocolo').value.trim(), nascimento: main.querySelector('#a-nascimento').value.trim() };
  try {
    const [pedidos, enturmacao, turmas, escolas] = await Promise.all([matriculas(), conjunto('enturmacao'), turmasDaRede(), carregar('escolas')]);
    const r = acompanharPedido(ultimo, { pedidos, enturmacao, turmas, escolas });
    desenhar(r);
    if (r.ok) main.querySelector('#resultado').focus(); else main.querySelector(r.erro.includes('protocolo como') ? '#a-protocolo' : '#a-nascimento').focus();
  } catch { falhaDados(main, () => desenhar()); }
});
desenhar();
