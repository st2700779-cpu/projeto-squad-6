// Matrícula em 5 passos (HU04, HU07; wireframes W3 e W4). Uma decisão por tela;
// regras de ato e vaga aplicadas na escolha da escola.
import { iniciar, link, falhaDados, acoesDoTopo } from '../app.js';
import { esc, icone, hojeBR } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, vagas as lerVagas, salvar, novoProtocolo } from '../dados.js';
import { SERIES, etapaDaSerie, serieCompleta, nomeCurto, motivoBloqueio } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Matrícula', voltar: 'familia/index.html' });
const TOTAL = 5;
let passo = 1;
const d = {};
let base;

async function preparar() {
  try {
    const [escolas, atos, vagas] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas()]);
    base = { escolas, atos, vagas };
    desenhar();
  } catch { falhaDados(main, preparar); }
}

const documentos = () => [
  'Certidão de nascimento ou RG do estudante',
  'CPF do estudante, se tiver',
  'Comprovante de residência (conta de luz ou de água)',
  'Documento com foto do responsável',
  ...(d.tipo === 'transferencia' ? ['Declaração de transferência da escola anterior'] : [])
];

// Texto lido pelo botão Ouvir do cabeçalho em cada passo.
function narracao() {
  if (passo === 1) return 'Quem vai estudar? Escreva o nome do estudante, a data de nascimento, o seu nome e um telefone. Depois diga se é a primeira vez na rede ou se vem de outra escola.';
  if (passo === 2) return d.tipo === 'transferencia' ? 'Na transferência, o estudante continua na mesma série em que está hoje. Escolha a série atual.' : 'Escolha a série em que o estudante vai estudar.';
  if (passo === 3) return 'Escolha a cidade e depois a escola. Só dá para escolher escolas com vaga e com autorização para esta série.';
  if (passo === 4) return `Separe estes documentos para levar à escola: ${documentos().join('. ')}.`;
  const escola = base.escolas.find((e) => e.id === d.escolaId);
  return `Confira: ${d.estudante}, ${serieCompleta(d.serie)}, na escola ${escola.nome}. Responsável: ${d.responsavel}.`;
}

function desenhar(erro = '') {
  const acoes = acoesDoTopo();
  const voltarTopo = document.querySelector('.topo-voltar');
  if (passo === 6) {
    // W4: sem voltar nem ouvir no cabeçalho; o pedido já foi enviado.
    acoes.innerHTML = '';
    voltarTopo?.remove();
    main.innerHTML = `<div class="sucesso" role="status">
        <div class="selo" aria-hidden="true">${icone('ok', 60)}</div>
        <h1 tabindex="-1">Pedido enviado</h1>
      </div>
      <div class="protocolo"><span>Protocolo</span><strong>${esc(d.protocolo)}</strong></div>
      <p style="font-size:1.1rem">A escola vai conferir e confirmar a matrícula. Leve os documentos à secretaria da escola em até 5 dias úteis.</p>
      <div style="display:grid;gap:.8rem">
        ${botaoOuvir(`Pedido de matrícula enviado. O protocolo é ${d.protocolo.split('').join(' ')}. Leve os documentos à secretaria da escola em até 5 dias úteis.`)}
        <a class="botao botao-secundario botao-grande" href="${link('familia/documentos.html')}">${icone('documento', 22)}Ver lista de documentos</a>
      </div>
      <div class="barra-acoes" style="flex-direction:column;gap:.2rem"><a class="botao botao-grande" href="${link('familia/index.html')}">Voltar ao início</a><p class="nota-rodape">Você acompanha o pedido na tela inicial.</p></div>`;
    main.querySelector('.botao-ouvir')?.classList.add('botao-grande');
    main.querySelector('h1').focus();
    return;
  }

  acoes.innerHTML = botaoOuvir(narracao(), '');
  const topo = `<p class="passo">Passo ${passo} de ${TOTAL}</p><div class="progresso" role="progressbar" aria-valuenow="${passo}" aria-valuemin="1" aria-valuemax="${TOTAL}" aria-label="Progresso da matrícula"><span style="width:${(passo / TOTAL) * 100}%"></span></div>`;
  const marcado = `<span class="marcado" aria-hidden="true">${icone('ok', 24)}</span>`;
  let corpo = '';
  if (passo === 1) {
    corpo = `<h1>Quem vai estudar?</h1>
      <div class="campo"><label for="f-estudante">Nome do estudante</label><input id="f-estudante" class="entrada" type="text" autocomplete="off" value="${esc(d.estudante)}"></div>
      <div class="campo"><label for="f-nascimento">Data de nascimento</label><input id="f-nascimento" class="entrada" type="date" value="${esc(d.nascimento)}"></div>
      <div class="campo"><label for="f-responsavel">Seu nome (responsável)</label><input id="f-responsavel" class="entrada" type="text" autocomplete="name" value="${esc(d.responsavel)}"></div>
      <div class="campo"><label for="f-telefone">Telefone para contato <span class="dica">com DDD</span></label><input id="f-telefone" class="entrada" type="tel" inputmode="tel" autocomplete="tel" value="${esc(d.telefone)}"></div>
      <fieldset class="campo"><legend style="font-weight:700;font-size:1rem">O estudante…</legend><div class="opcoes">
        <button type="button" class="opcao" data-tipo="nova" aria-pressed="${d.tipo === 'nova'}">${icone('usuario', 26)}<span>Vai estudar pela primeira vez nesta rede<small>Matrícula nova ou rematrícula</small></span>${d.tipo === 'nova' ? marcado : ''}</button>
        <button type="button" class="opcao" data-tipo="transferencia" aria-pressed="${d.tipo === 'transferencia'}">${icone('escola', 26)}<span>Vem de outra escola<small>Transferência</small></span>${d.tipo === 'transferencia' ? marcado : ''}</button>
      </div></fieldset>`;
  }
  if (passo === 2) {
    const transf = d.tipo === 'transferencia';
    corpo = `<h1>${transf ? 'Em que série o estudante está hoje?' : 'Em qual série o estudante vai estudar?'}</h1>
      ${transf ? '<p class="texto-suave">Na transferência, o estudante continua na mesma série. Ele só passa para a próxima se for aprovado.</p>' : ''}
      <div class="opcoes">${SERIES.map((s) => `<button type="button" class="opcao" data-serie="${s}" aria-pressed="${d.serie === s}"><span>${s}<small>${etapaDaSerie(s)}</small></span>${d.serie === s ? marcado : ''}</button>`).join('')}</div>`;
  }
  if (passo === 3) {
    const cidades = [...new Set(base.escolas.map((e) => e.municipio))];
    d.cidade = d.cidade || cidades[0];
    const lista = base.escolas.filter((e) => e.municipio === d.cidade).map((e) => {
      const motivo = motivoBloqueio({ atos: base.atos, vagas: base.vagas, escolaId: e.id, serie: d.serie });
      const n = base.vagas[e.id]?.[d.serie] || 0;
      const sel = d.escolaId === e.id;
      return `<button type="button" class="opcao" data-escola="${e.id}" aria-pressed="${sel}" ${motivo ? 'disabled' : ''}>${icone('escola', 26)}<span>${esc(nomeCurto(e.nome))}<small>${motivo || `${n} vaga${n > 1 ? 's' : ''} disponíve${n > 1 ? 'is' : 'l'}`}</small></span>${sel ? marcado : ''}</button>`;
    }).join('');
    corpo = `<h1>Escolha a escola</h1>
      <p style="font-size:1.1rem"><span class="texto-suave">Série:</span> <strong>${esc(serieCompleta(d.serie))}</strong></p>
      <div class="campo"><label for="f-cidade">Cidade</label><select id="f-cidade" class="entrada">${cidades.map((c) => `<option ${c === d.cidade ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="opcoes">${lista}</div>`;
  }
  if (passo === 4) {
    const docs = documentos();
    corpo = `<h1>Separe estes documentos</h1>
      <ul class="opcoes" style="list-style:none;padding:0">${docs.map((x) => `<li class="opcao" style="cursor:default;font-weight:400">${icone('documento', 26)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <label style="display:flex;gap:.8rem;align-items:center;margin-top:1.2rem;font-size:1.1rem;font-weight:700"><input type="checkbox" id="f-documentos" ${d.documentos ? 'checked' : ''} style="width:30px;height:30px;accent-color:var(--tinta)"> Tenho estes documentos ou vou conseguir</label>`;
  }
  if (passo === 5) {
    const escola = base.escolas.find((e) => e.id === d.escolaId);
    corpo = `<h1>Confira antes de enviar</h1>
      <dl class="cartao" style="font-size:1.05rem">
        <dt class="texto-suave">Estudante</dt><dd><strong>${esc(d.estudante)}</strong></dd>
        <dt class="texto-suave">Tipo</dt><dd><strong>${d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova'}</strong></dd>
        <dt class="texto-suave">Série</dt><dd><strong>${esc(serieCompleta(d.serie))}</strong></dd>
        <dt class="texto-suave">Escola</dt><dd><strong>${esc(escola.nome)}</strong></dd>
        <dt class="texto-suave">Responsável</dt><dd style="margin:0"><strong>${esc(d.responsavel)} · ${esc(d.telefone)}</strong></dd>
      </dl>`;
  }
  const rotulo = passo === 5 ? 'Enviar pedido' : 'Continuar';
  main.innerHTML = `${topo}${corpo}
    <p class="erro" role="alert" id="erro-passo">${esc(erro)}</p>
    <div class="barra-acoes">${passo > 1 ? '<button type="button" class="botao botao-secundario botao-grande" data-voltar>Voltar</button>' : ''}<button type="button" class="botao botao-grande" data-avancar>${rotulo}</button></div>`;
  const h1 = main.querySelector('h1');
  h1.tabIndex = -1;
  if (erro) main.querySelector('#erro-passo').scrollIntoView({ block: 'center' }); else h1.focus();
}


function guardarCampos() {
  const v = (id) => main.querySelector(id)?.value?.trim();
  if (passo === 1) Object.assign(d, { estudante: v('#f-estudante'), nascimento: v('#f-nascimento'), responsavel: v('#f-responsavel'), telefone: v('#f-telefone') });
  if (passo === 4) d.documentos = main.querySelector('#f-documentos')?.checked;
}

function validar() {
  if (passo === 1) {
    if (!d.estudante || d.estudante.length < 3) return 'Escreva o nome do estudante.';
    if (!d.nascimento) return 'Informe a data de nascimento.';
    if (!d.responsavel) return 'Escreva o seu nome.';
    if ((d.telefone || '').replace(/\D/g, '').length < 10) return 'Escreva um telefone com DDD.';
    if (!d.tipo) return 'Escolha se é a primeira vez na rede ou se vem de outra escola.';
  }
  if (passo === 2 && !d.serie) return 'Escolha a série.';
  if (passo === 3 && !d.escolaId) return 'Escolha uma escola que tenha vaga.';
  if (passo === 4 && !d.documentos) return 'Marque a caixa quando tiver os documentos.';
  return '';
}

async function enviarPedido() {
  const pedidos = await matriculas();
  d.protocolo = await novoProtocolo('MAT');
  pedidos.unshift({ protocolo: d.protocolo, estudante: d.estudante, responsavel: d.responsavel, serie: d.serie, tipo: d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova', escolaId: d.escolaId, situacao: 'Aguardando confirmação', data: hojeBR(), meu: true });
  await salvar('matriculas', pedidos);
  base.vagas[d.escolaId][d.serie] -= 1; // reserva a vaga até a escola confirmar ou recusar
  await salvar('vagas', base.vagas);
}

main.addEventListener('click', async (e) => {
  const alvo = e.target.closest('button');
  if (!alvo) return;
  if (alvo.dataset.tipo) { guardarCampos(); d.tipo = alvo.dataset.tipo; desenhar(); }
  if (alvo.dataset.serie) { d.serie = alvo.dataset.serie; d.escolaId = null; desenhar(); }
  if (alvo.dataset.escola) { d.escolaId = alvo.dataset.escola; desenhar(); }
  if ('voltar' in alvo.dataset) { guardarCampos(); passo -= 1; desenhar(); }
  if ('avancar' in alvo.dataset) {
    guardarCampos();
    const erro = validar();
    if (erro) { desenhar(erro); return; }
    if (passo === 5) {
      alvo.disabled = true;
      try { await enviarPedido(); } catch { desenhar('Não foi possível enviar o pedido agora. Tente de novo.'); return; }
    }
    passo += 1;
    desenhar();
    window.scrollTo(0, 0);
  }
});
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-cidade') { d.cidade = e.target.value; d.escolaId = null; desenhar(); }
});
preparar();
