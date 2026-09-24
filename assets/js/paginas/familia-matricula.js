// Matrícula em 5 passos (HU04, HU07). Uma decisão por tela; regras de ato e vaga aplicadas na escolha da escola.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, icone, hojeBR } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, matriculas, vagas as lerVagas } from '../dados.js';
import { definir, proximoProtocolo } from '../estado.js';
import { SERIES, etapaDaSerie, motivoBloqueio } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
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

function desenhar(erro = '') {
  const topo = `<a class="voltar" href="${link('familia/index.html')}">${icone('voltar', 20)}Voltar ao início</a>
    ${passo <= TOTAL ? `<p style="margin:.5rem 0 0;font-weight:700" class="texto-suave">Passo ${passo} de ${TOTAL}</p><div class="progresso" role="progressbar" aria-valuenow="${passo}" aria-valuemin="1" aria-valuemax="${TOTAL}" aria-label="Progresso da matrícula"><span style="width:${(passo / TOTAL) * 100}%"></span></div>` : ''}`;
  const navegacao = (rotulo = 'Continuar') => `
    <p class="erro" role="alert" id="erro-passo">${esc(erro)}</p>
    <div class="linha-botoes" style="margin-top:1rem">${passo > 1 ? '<button type="button" class="botao botao-secundario botao-grande" data-voltar>Voltar</button>' : ''}<button type="button" class="botao botao-grande" data-avancar style="flex:1">${rotulo}</button></div>`;
  let corpo = '';
  if (passo === 1) {
    corpo = `<h1>Quem vai estudar?</h1>${botaoOuvir('Quem vai estudar? Escreva o nome do estudante, a data de nascimento, o seu nome e um telefone. Depois diga se é a primeira vez na rede ou se vem de outra escola.')}
      <div class="campo" style="margin-top:1rem"><label for="f-estudante">Nome do estudante</label><input id="f-estudante" class="entrada" type="text" autocomplete="off" value="${esc(d.estudante)}"></div>
      <div class="campo"><label for="f-nascimento">Data de nascimento</label><input id="f-nascimento" class="entrada" type="date" value="${esc(d.nascimento)}"></div>
      <div class="campo"><label for="f-responsavel">Seu nome (responsável)</label><input id="f-responsavel" class="entrada" type="text" autocomplete="name" value="${esc(d.responsavel)}"></div>
      <div class="campo"><label for="f-telefone">Telefone para contato <span class="dica">com DDD</span></label><input id="f-telefone" class="entrada" type="tel" autocomplete="tel" value="${esc(d.telefone)}"></div>
      <fieldset class="campo"><legend style="font-weight:700;font-size:1rem">O estudante…</legend><div class="opcoes">
        <button type="button" class="opcao" data-tipo="nova" aria-pressed="${d.tipo === 'nova'}">${icone('usuario', 26)}<span>Vai estudar pela primeira vez nesta rede<small>Matrícula nova ou rematrícula</small></span></button>
        <button type="button" class="opcao" data-tipo="transferencia" aria-pressed="${d.tipo === 'transferencia'}">${icone('escola', 26)}<span>Vem de outra escola<small>Transferência</small></span></button>
      </div></fieldset>`;
  }
  if (passo === 2) {
    const transf = d.tipo === 'transferencia';
    corpo = `<h1>${transf ? 'Em que série o estudante está hoje?' : 'Em qual série o estudante vai estudar?'}</h1>
      ${botaoOuvir(transf ? 'Na transferência, o estudante continua na mesma série em que está hoje. Escolha a série atual.' : 'Escolha a série em que o estudante vai estudar.')}
      ${transf ? '<p class="texto-suave" style="margin-top:.6rem">Na transferência, o estudante continua na mesma série. Ele só passa para a próxima se for aprovado.</p>' : ''}
      <div class="opcoes" style="margin-top:1rem">${SERIES.map((s) => `<button type="button" class="opcao" data-serie="${s}" aria-pressed="${d.serie === s}">${s}<small>${etapaDaSerie(s)}</small></button>`).join('')}</div>`;
  }
  if (passo === 3) {
    const cidades = [...new Set(base.escolas.map((e) => e.municipio))];
    d.cidade = d.cidade || cidades[0];
    const lista = base.escolas.filter((e) => e.municipio === d.cidade).map((e) => {
      const motivo = motivoBloqueio({ atos: base.atos, vagas: base.vagas, escolaId: e.id, serie: d.serie });
      const n = base.vagas[e.id]?.[d.serie] || 0;
      return `<button type="button" class="opcao" data-escola="${e.id}" aria-pressed="${d.escolaId === e.id}" ${motivo ? 'disabled' : ''}>${icone('escola', 26)}<span>${esc(e.nome)}<small>${motivo || `${n} vaga${n > 1 ? 's' : ''} disponíve${n > 1 ? 'is' : 'l'}`}</small></span></button>`;
    }).join('');
    corpo = `<h1>Escolha a escola</h1>${botaoOuvir('Escolha a cidade e depois a escola. Só dá para escolher escolas com vaga e com autorização para esta série.')}
      <p class="texto-suave" style="margin-top:.6rem">Série: <strong style="color:var(--tinta)">${esc(d.serie)}</strong></p>
      <div class="campo"><label for="f-cidade">Cidade</label><select id="f-cidade" class="entrada">${cidades.map((c) => `<option ${c === d.cidade ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="opcoes">${lista}</div>`;
  }
  if (passo === 4) {
    const docs = documentos();
    corpo = `<h1>Separe estes documentos</h1>${botaoOuvir(`Separe estes documentos para levar à escola: ${docs.join('. ')}.`, 'Ouvir a lista')}
      <ul class="opcoes" style="list-style:none;padding:0;margin-top:1rem">${docs.map((x) => `<li class="opcao" style="cursor:default">${icone('documento', 26)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <label style="display:flex;gap:.7rem;align-items:center;margin-top:1rem;font-size:1.05rem;font-weight:700"><input type="checkbox" id="f-documentos" ${d.documentos ? 'checked' : ''} style="width:28px;height:28px"> Tenho estes documentos ou vou conseguir</label>`;
  }
  if (passo === 5) {
    const escola = base.escolas.find((e) => e.id === d.escolaId);
    corpo = `<h1>Confira antes de enviar</h1>${botaoOuvir(`Confira: ${d.estudante}, ${d.serie}, na escola ${escola.nome}. Responsável: ${d.responsavel}.`)}
      <dl class="cartao" style="margin-top:1rem;font-size:1.05rem">
        <dt class="texto-suave">Estudante</dt><dd><strong>${esc(d.estudante)}</strong></dd>
        <dt class="texto-suave">Tipo</dt><dd><strong>${d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova'}</strong></dd>
        <dt class="texto-suave">Série</dt><dd><strong>${esc(d.serie)}</strong></dd>
        <dt class="texto-suave">Escola</dt><dd><strong>${esc(escola.nome)}</strong></dd>
        <dt class="texto-suave">Responsável</dt><dd style="margin:0"><strong>${esc(d.responsavel)} · ${esc(d.telefone)}</strong></dd>
      </dl>`;
  }
  if (passo === 6) {
    main.innerHTML = `${topo}<div class="cartao" style="border:2px solid var(--verde);margin-top:1rem" role="status">
      <h1>Pedido enviado</h1><p style="font-size:1.1rem">Protocolo <strong>${esc(d.protocolo)}</strong></p>
      <p>A escola vai conferir e confirmar a matrícula. Leve os documentos à secretaria da escola em até 5 dias úteis. Você acompanha o pedido na tela inicial.</p>
      ${botaoOuvir(`Pedido de matrícula enviado. O protocolo é ${d.protocolo.split('').join(' ')}. Leve os documentos à secretaria da escola em até 5 dias úteis.`)}</div>
      <div class="linha-botoes"><a class="botao botao-secundario botao-grande" href="${link('familia/documentos.html')}">Ver lista de documentos</a><a class="botao botao-grande" href="${link('familia/index.html')}">Voltar ao início</a></div>`;
    const h1 = main.querySelector('h1');
    h1.tabIndex = -1;
    h1.focus();
    return;
  }
  main.innerHTML = `${topo}${corpo}${navegacao(passo === 5 ? 'Enviar pedido de matrícula' : 'Continuar')}`;
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
  d.protocolo = proximoProtocolo('MAT');
  pedidos.unshift({ protocolo: d.protocolo, estudante: d.estudante, responsavel: d.responsavel, serie: d.serie, tipo: d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova', escolaId: d.escolaId, situacao: 'Aguardando confirmação', data: hojeBR(), meu: true });
  definir('matriculas', pedidos);
  base.vagas[d.escolaId][d.serie] -= 1; // reserva a vaga até a escola confirmar ou recusar
  definir('vagas', base.vagas);
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
    if (passo === 5) await enviarPedido();
    passo += 1;
    desenhar();
    window.scrollTo(0, 0);
  }
});
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-cidade') { d.cidade = e.target.value; d.escolaId = null; desenhar(); }
});
preparar();
