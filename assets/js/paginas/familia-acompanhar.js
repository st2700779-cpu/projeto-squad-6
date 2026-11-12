// Acompanhar o pedido de matrícula (como na Matrícula Online oficial): com o protocolo do comprovante e a data de nascimento do
// estudante, a família vê em que etapa o pedido está: enviado, documentos e confirmação da escola, estudante na turma.
// Os dois dados juntos evitam que alguém veja o pedido de outra família. Regra em dominio/matricula-online.js.
// Com protocolo ESP-… (ou ?tipo=espera), mostra a inscrição na lista de espera: posição na fila e cancelamento
// (dominio/portal-matricula.js). Visual da matrícula on-line (assets/css/matricula-seduc.css).
import { iniciar, falhaDados, link } from '../app.js';
import { esc, icone, confirmar, avisar } from '../ui.js';
import { carregar, matriculas, conjunto, turmasDaRede, salvar, registrarAcao } from '../dados.js';
import { consultarEspera, cancelarEspera } from '../dominio/portal-matricula.js';
import { hojeISO } from '../dominio/hoje.js';
import { serieCompleta } from '../regras.js';
import { acompanharPedido } from '../dominio/matricula-online.js';
import { semaforo } from '../componentes/indicadores.js';
import '../componentes/data-br.js'; // data de nascimento em dd/mm/aaaa

document.body.classList.add('portal-matricula');
const main = await iniciar({ perfil: 'familia', pagina: 'familia/acompanhar.html', assistente: true, titulo: 'Acompanhar pedido', estreito: true });
const ehEspera = (p) => /^ESP-/i.test(String(p).trim());
const modoEspera = new URLSearchParams(location.search).get('tipo') === 'espera';
const NIVEL = { feito: { chave: 'verde', icone: 'ok', texto: 'Feito' }, atual: { chave: 'amarelo', icone: 'relogio', texto: 'Agora' }, falta: { chave: 'neutro', icone: '', texto: 'Depois' }, recusado: { chave: 'vermelho', icone: 'fechar', texto: 'Recusado' } };
let ultimo = { protocolo: new URLSearchParams(location.search).get('protocolo') || '', nascimento: '' };

function desenhar(resultado = null) {
  const espera = modoEspera || ehEspera(ultimo.protocolo);
  main.innerHTML = `
    <h1 class="mt-titulo" tabindex="-1">${espera ? 'Consultar lista de espera' : 'Acompanhar pedido de matrícula'}</h1>
    <section class="mt-cartao" aria-labelledby="c-acomp"><h2 class="mt-cartao-titulo" id="c-acomp">${espera ? 'Inscrição na lista de espera' : 'Pedido de matrícula'}</h2><div class="mt-cartao-corpo">
    <p class="esp-t-0">Use o protocolo ${espera ? 'da inscrição (ESP-…)' : 'que está no comprovante (MAT-…) ou o da lista de espera (ESP-…)'} e a data de nascimento do estudante.</p>
    <form id="form-acompanhar" class="mt-form mt-grade" novalidate>
      <div class="campo mt-col-6"><label for="a-protocolo">Protocolo</label><input id="a-protocolo" class="entrada" autocomplete="off" placeholder="${espera ? 'ESP-2026-0007' : 'MAT-2026-0007'}" maxlength="13" value="${esc(ultimo.protocolo)}" aria-describedby="a-erro"></div>
      <div class="campo mt-col-6"><label for="a-nascimento">Data de nascimento do estudante <span class="dica">dd/mm/aaaa</span></label><input id="a-nascimento" class="entrada" type="text" data-campo-data inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" value="${esc(ultimo.nascimento)}" aria-describedby="a-erro"></div>
      <p class="erro mt-col-12" id="a-erro" role="alert">${resultado && !resultado.ok ? esc(resultado.erro) : ''}</p>
      <div class="mt-col-12 mt-botoes"><button type="submit" class="botao botao-grande mt-acao">${icone('busca', 22)}${espera ? 'Ver a inscrição' : 'Ver o pedido'}</button></div>
    </form></div></section>
    ${resultado?.ok && resultado.inscricao ? blocoEspera(resultado) : ''}
    ${resultado?.ok && resultado.pedido ? `<section class="mt-cartao" aria-labelledby="res-titulo" id="resultado" tabindex="-1"><h2 class="mt-cartao-titulo" id="res-titulo">${esc(resultado.pedido.estudante)}</h2><div class="mt-cartao-corpo">
      <p class="esp-t-0">${esc(serieCompleta(resultado.pedido.serie))}${resultado.pedido.turno ? ` · ${esc(resultado.pedido.turno)}` : ''} · ${esc(resultado.pedido.tipo)} · protocolo <strong>${esc(resultado.pedido.protocolo)}</strong></p>
      <ol class="etapas-pedido">${resultado.etapas.map((e) => `<li>${semaforo(NIVEL[e.estado])}<div><strong>${esc(e.nome)}</strong><p class="esp-t-1 esp-b-0">${esc(e.detalhe)}</p></div></li>`).join('')}</ol>
      ${resultado.escola ? `<p class="mt-nota">Dúvidas: secretaria da ${esc(resultado.escola.nome)}${resultado.escola.telefone ? `, telefone ${esc(resultado.escola.telefone)}` : ''}.</p>` : ''}
    </div></section>` : ''}
    <p class="esp-t-4"><a href="${link('familia/matricula.html')}">Voltar à matrícula on-line</a></p>`;
}
function blocoEspera(r) {
  const x = r.inscricao;
  const ativa = r.posicao;
  const escola = escolas.find((e) => e.id === x.escolaId);
  return `<section class="mt-cartao" aria-labelledby="res-titulo" id="resultado" tabindex="-1"><h2 class="mt-cartao-titulo" id="res-titulo">${esc(x.estudante || '')}</h2><div class="mt-cartao-corpo">
    <dl class="dados-comprovante"><dt>Protocolo</dt><dd><strong>${esc(x.id)}</strong></dd><dt>Escola</dt><dd>${esc(escola?.nome || x.municipio)}</dd><dt>Série e turno</dt><dd>${esc(serieCompleta(x.serie))}${x.turno ? ` · ${esc(x.turno)}` : ''}</dd>
      <dt>Situação</dt><dd>${ativa ? `<strong>${r.posicao}º na fila</strong> deste turno, desde ${esc(x.desde.split('-').reverse().join('/'))}` : `Cancelada${x.canceladaEm ? ` em ${esc(x.canceladaEm.split('-').reverse().join('/'))}` : ''}`}</dd></dl>
    ${ativa ? `<p class="mt-nota">Quando abrir vaga, o primeiro da fila recebe e-mail e ligação e tem 3 dias para confirmar o interesse.</p><div class="mt-botoes"><button type="button" class="botao botao-secundario" data-cancelar="${esc(x.id)}">Cancelar a inscrição</button></div>` : ''}
  </div></section>`;
}
let escolas = [];
main.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cancelar]');
  if (!b) return;
  if (!(await confirmar({ titulo: 'Cancelar a inscrição na lista de espera?', texto: 'O estudante sai da fila deste turno. Para voltar, é preciso fazer uma inscrição nova, que entra no fim da fila.', botao: 'Cancelar a inscrição', perigo: true }))) return;
  try {
    const lista = cancelarEspera(await conjunto('lista-espera'), b.dataset.cancelar, { hoje: hojeISO() });
    await salvar('lista-espera', lista);
    await registrarAcao('Família', 'Cancelou a inscrição na lista de espera', b.dataset.cancelar);
    desenhar(consultarEspera(ultimo, lista));
    main.querySelector('#resultado')?.focus();
    avisar('Inscrição cancelada.');
  } catch { avisar('Não foi possível cancelar agora. Confira a conexão e tente de novo.'); }
});
main.addEventListener('submit', async (e) => {
  e.preventDefault();
  ultimo = { protocolo: main.querySelector('#a-protocolo').value.trim(), nascimento: main.querySelector('#a-nascimento').value.trim() };
  try {
    const [pedidos, enturmacao, turmas, todas, espera] = await Promise.all([matriculas(), conjunto('enturmacao'), turmasDaRede(), carregar('escolas'), conjunto('lista-espera')]);
    escolas = todas;
    const r = ehEspera(ultimo.protocolo) ? consultarEspera(ultimo, espera) : acompanharPedido(ultimo, { pedidos, enturmacao, turmas, escolas });
    desenhar(r);
    if (r.ok) main.querySelector('#resultado').focus(); else main.querySelector(r.erro.includes('protocolo como') ? '#a-protocolo' : '#a-nascimento').focus();
  } catch { falhaDados(main, () => desenhar()); }
});
desenhar();
