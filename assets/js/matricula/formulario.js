// Matrícula em 5 passos (HU04, HU07; wireframes W3 e W4). Uma decisão por tela;
// regras de ato e vaga aplicadas na escolha da escola.
// Com ?rematricula=<id>, é a rematrícula em um toque: dados preenchidos, só confirmar.
// Um único formulário para os dois modos: <body data-modo="online"> (portal da família) e
// <body data-modo="presencial"> (atendimento no balcão da secretaria, layout ampliado).
// O modo só troca o perfil da página, o layout e a origem gravada no pedido.
import { iniciar, link, falhaDados, acoesDoTopo } from '../app.js';
import { RAIZ } from '../dados.js';
import { sessao } from '../auth.js';
import { esc, icone, hojeBR } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { abrirJanela } from '../ui.js';
import { qrParaElemento } from '../qr.js';
import { codificarRascunho, decodificarRascunho, codigoNoEndereco } from './rascunho-link.js';
import { carregar, matriculas, vagas as lerVagas, salvar, novoProtocolo, estudantes, registrarAcao } from '../dados.js';
import { SERIES, etapaDaSerie, serieCompleta, nomeCurto, motivoBloqueio, proximaSerie, atoDaEtapa, situacaoAto } from '../regras.js';

const MODO = document.body.dataset.modo === 'presencial' ? 'presencial' : 'online';
const BALCAO = MODO === 'presencial';
const main = await iniciar(BALCAO
  ? { perfil: 'escola', assistente: false, titulo: 'Atendimento presencial', estreito: true }
  : { perfil: 'familia', assistente: true, titulo: 'Matrícula', estreito: true });
if (BALCAO) main.classList.add('modo-balcao');
const TOTAL = 5;
const logado = sessao()?.perfil === 'aluno'; // com login de aluno, os atalhos levam à área do aluno; sem login, à entrada
let passo = 1;
const d = {};
let base;
let avisoRascunho = ''; // "Você está continuando uma matrícula iniciada por ...", mostrado até a pessoa avançar
const idRematricula = BALCAO ? null : new URLSearchParams(location.search).get('rematricula');

async function preparar() {
  try {
    const [escolas, atos, vagas, { lista }] = await Promise.all([carregar('escolas'), carregar('atos'), lerVagas(), estudantes()]);
    base = { escolas, atos, vagas };
    const codigo = codigoNoEndereco();
    if (codigo && !BALCAO) {
      const r = await decodificarRascunho(codigo);
      if (r) {
        Object.assign(d, r.dados);
        passo = r.passo;
        history.replaceState(null, '', location.pathname + location.search); // o link já foi usado; recarregar não refaz
        avisoRascunho = `Você está continuando uma matrícula iniciada por ${r.dados.responsavel || 'outra pessoa'}${r.em ? ` em ${new Date(r.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}. Confira os dados de cada passo antes de enviar.`;
      } else avisoRascunho = 'Este link de matrícula está incompleto ou foi alterado, então não foi possível restaurar os dados. Comece a matrícula do início.';
    }
    const est = idRematricula && lista.find((e) => e.id === idRematricula);
    if (est && proximaSerie(est.serie)) {
      Object.assign(d, { tipo: 'rematricula', estudanteId: est.id, estudante: est.nome, nascimento: est.nascimento, responsavel: est.responsavel, serie: proximaSerie(est.serie), escolaId: est.escolaId, turno: est.turno });
      desenharRematricula();
    } else desenhar();
  } catch { falhaDados(main, preparar); }
}

// Rematrícula em um toque: uma tela de conferência com os dados que a rede já tem.
function desenharRematricula(erro = '') {
  const escola = base.escolas.find((e) => e.id === d.escolaId);
  const ato = atoDaEtapa(base.atos, d.escolaId, d.serie);
  const bloqueio = !ato || !situacaoAto(ato).vigente;
  const nome = d.estudante.split(' ')[0];
  acoesDoTopo().innerHTML = botaoOuvir(`Rematrícula de ${d.estudante} para 2027, na ${serieCompleta(d.serie)}, em ${escola.nome}. Se estiver tudo certo, toque em Confirmar rematrícula.`, '');
  main.innerHTML = `
    <h1 tabindex="-1">Rematrícula de ${esc(nome)} para 2027</h1>
    <p class="texto-medio">Os dados já estão preenchidos. Se estiver tudo certo, é só confirmar.</p>
    <dl class="cartao texto-medio">
      <dt class="texto-suave">Estudante</dt><dd><strong>${esc(d.estudante)}</strong></dd>
      <dt class="texto-suave">Série em 2027</dt><dd><strong>${esc(serieCompleta(d.serie))}</strong></dd>
      <dt class="texto-suave">Escola</dt><dd><strong>${esc(escola.nome)}</strong></dd>
      <dt class="texto-suave">Turno</dt><dd><strong>${esc(d.turno)}</strong></dd>
      <dt class="texto-suave">Responsável</dt><dd class="esp-t-0 esp-b-0"><strong>${esc(d.responsavel)}</strong></dd>
    </dl>
    ${bloqueio ? `<p class="alerta-erro">${icone('alerta', 20)}<span>Esta escola não tem autorização vigente para a ${esc(serieCompleta(d.serie))}. Faça a matrícula completa para escolher outra escola.</span></p>` : '<p class="texto-suave">A vaga de quem já estuda na escola fica reservada. Não é preciso levar documentos, a menos que a secretaria peça.</p>'}
    <p class="erro" role="alert" id="erro-passo">${esc(erro)}</p>
    <div class="barra-acoes"><a class="botao botao-secundario botao-grande" href="${link('familia/matricula.html')}">Alterar dados</a>${bloqueio ? '' : `<button type="button" class="botao botao-grande" data-rematricular>Confirmar rematrícula</button>`}</div>`;
  main.querySelector('h1').focus();
}
async function enviarRematricula() {
  const pedidos = await matriculas();
  d.protocolo = await novoProtocolo('MAT');
  pedidos.unshift({ protocolo: d.protocolo, estudante: d.estudante, estudanteId: d.estudanteId, responsavel: d.responsavel, serie: d.serie, tipo: 'Rematrícula', escolaId: d.escolaId, situacao: 'Aguardando confirmação', data: hojeBR(), meu: true, origem: 'online' });
  await salvar('matriculas', pedidos);
  await registrarAcao('Família', 'Pediu rematrícula', d.protocolo);
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

function desenhar(erro = '', campoComErro = null) {
  const acoes = acoesDoTopo();
  const voltarTopo = document.querySelector('.topo-voltar');
  if (passo === 6) {
    // W4: sem voltar nem ouvir no cabeçalho; o pedido já foi enviado.
    acoes.innerHTML = '';
    voltarTopo?.remove();
    main.innerHTML = `<div class="sucesso" role="status">
        <div class="selo" aria-hidden="true">${icone('ok', 36)}</div>
        <h1 tabindex="-1">Pedido enviado</h1>
      </div>
      <div class="protocolo"><span>Protocolo</span><strong>${esc(d.protocolo)}</strong></div>
      <p class="texto-medio">${BALCAO ? 'Entregue o número do protocolo à família. Os documentos podem ser conferidos agora ou em até 5 dias úteis.' : d.tipo === 'rematricula' ? 'A escola vai confirmar a rematrícula. Não é preciso levar documentos, a menos que a secretaria peça.' : 'A escola vai conferir e confirmar a matrícula. Leve os documentos à secretaria da escola em até 5 dias úteis.'}</p>
      <div class="grade-acoes">
        ${botaoOuvir(`Pedido de matrícula enviado. O protocolo é ${d.protocolo.split('').join(' ')}. Leve os documentos à secretaria da escola em até 5 dias úteis.`)}
        ${logado && !BALCAO ? `<a class="botao botao-secundario botao-grande" href="${link('aluno/documentos.html')}">${icone('documento', 22)}Ver lista de documentos</a>` : ''}
        ${BALCAO ? `<a class="botao botao-secundario botao-grande" href="${link('escola/atendimento.html')}">Novo atendimento</a>` : ''}
      </div>
      <div class="barra-acoes coluna-curta"><a class="botao botao-grande" href="${link(BALCAO ? 'escola/matriculas.html' : logado ? 'aluno/index.html' : 'index.html')}">${BALCAO ? 'Ver pedidos de matrícula' : 'Voltar à página inicial'}</a><p class="nota-rodape">${BALCAO ? 'O pedido já aparece na lista da secretaria, com origem presencial.' : logado ? 'Você acompanha o pedido na tela inicial.' : 'Guarde o número do protocolo: é com ele que a secretaria localiza o pedido.'}</p></div>`;
    main.querySelector('.botao-ouvir')?.classList.add('botao-grande');
    main.querySelector('h1').focus();
    return;
  }

  acoes.innerHTML = botaoOuvir(narracao(), '');
  const topo = `<p class="passo">Passo ${passo} de ${TOTAL}</p><div class="progresso" role="progressbar" aria-valuenow="${passo}" aria-valuemin="1" aria-valuemax="${TOTAL}" aria-label="Progresso da matrícula"><span style="width:${(passo / TOTAL) * 100}%"></span></div>`;
  const marcado = `<span class="marcado" aria-hidden="true">${icone('ok', 24)}</span>`;
  let corpo = '';
  if (passo === 1) {
    corpo = `<h1>${BALCAO ? 'Atendimento presencial: quem vai estudar?' : 'Quem vai estudar?'}</h1>
      <div class="campo"><label for="f-estudante">Nome do estudante</label><input id="f-estudante" class="entrada" type="text" autocomplete="off" value="${esc(d.estudante)}"></div>
      <div class="campo"><label for="f-nascimento">Data de nascimento</label><input id="f-nascimento" class="entrada" type="date" max="${hoje}" value="${esc(d.nascimento)}"></div>
      <div class="campo"><label for="f-responsavel">${BALCAO ? 'Nome do responsável' : 'Seu nome (responsável)'}</label><input id="f-responsavel" class="entrada" type="text" autocomplete="name" value="${esc(d.responsavel)}"></div>
      <div class="campo"><label for="f-telefone">Telefone para contato <span class="dica">com DDD</span></label><input id="f-telefone" class="entrada" type="tel" inputmode="tel" autocomplete="tel" placeholder="(79) 99999-9999" maxlength="15" value="${esc(d.telefone)}"></div>
      <fieldset class="campo"><legend class="negrito">O estudante…</legend><div class="opcoes">
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
      <p class="texto-medio"><span class="texto-suave">Série:</span> <strong>${esc(serieCompleta(d.serie))}</strong></p>
      <div class="campo"><label for="f-cidade">Cidade</label><select id="f-cidade" class="entrada">${cidades.map((c) => `<option ${c === d.cidade ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="opcoes">${lista}</div>`;
  }
  if (passo === 4) {
    const docs = documentos();
    corpo = `<h1>Separe estes documentos</h1>
      <ul class="opcoes lista-limpa">${docs.map((x) => `<li class="opcao opcao-estatica">${icone('documento', 26)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <label class="caixa-confirmar"><input class="caixa-grande" type="checkbox" id="f-documentos" ${d.documentos ? 'checked' : ''}> Tenho estes documentos ou vou conseguir</label>`;
  }
  if (passo === 5) {
    const escola = base.escolas.find((e) => e.id === d.escolaId);
    corpo = `<h1>Confira antes de enviar</h1>
      <dl class="cartao texto-medio">
        <dt class="texto-suave">Estudante</dt><dd><strong>${esc(d.estudante)}</strong></dd>
        <dt class="texto-suave">Tipo</dt><dd><strong>${d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova'}</strong></dd>
        <dt class="texto-suave">Série</dt><dd><strong>${esc(serieCompleta(d.serie))}</strong></dd>
        <dt class="texto-suave">Escola</dt><dd><strong>${esc(escola.nome)}</strong></dd>
        <dt class="texto-suave">Responsável</dt><dd class="esp-t-0 esp-b-0"><strong>${esc(d.responsavel)} · ${esc(d.telefone)}</strong></dd>
      </dl>`;
  }
  const rotulo = ['Ir para a série', 'Ir para a escolha da escola', 'Ir para os documentos', 'Ir para a conferência', 'Enviar pedido de matrícula'][passo - 1];
  main.innerHTML = `${topo}${avisoRascunho ? `<div class="alerta-info" role="status">${icone('info', 20)}<span>${esc(avisoRascunho)}</span></div>` : ''}${corpo}
    <p class="erro" role="alert" id="erro-passo">${esc(erro)}</p>
    <div class="barra-acoes">${passo > 1 ? '<button type="button" class="botao botao-secundario botao-grande" data-voltar>Voltar ao passo anterior</button>' : ''}<button type="button" class="botao botao-grande" data-avancar>${rotulo}</button></div>
    ${BALCAO ? '' : `<p class="esp-t-3"><button type="button" class="botao botao-texto" data-outro-aparelho>${icone('celular', 20)}Continuar em outro aparelho</button></p>`}`;
  const h1 = main.querySelector('h1');
  h1.tabIndex = -1;
  if (erro) {
    // Foco no primeiro campo com erro; sem campo, a mensagem é lida pelo leitor de tela (role=alert) e rolada para a vista.
    const campo = campoComErro && main.querySelector(`#${campoComErro}`);
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.setAttribute('aria-describedby', 'erro-passo'); main.querySelector('#erro-passo').dataset.campo = campoComErro; campo.focus(); } else main.querySelector('#erro-passo').scrollIntoView({ block: 'center' });
  } else h1.focus();
}


function guardarCampos() {
  const v = (id) => main.querySelector(id)?.value?.trim();
  if (passo === 1) Object.assign(d, { estudante: v('#f-estudante'), nascimento: v('#f-nascimento'), responsavel: v('#f-responsavel'), telefone: v('#f-telefone') });
  if (passo === 4) d.documentos = main.querySelector('#f-documentos')?.checked;
}

// Máscara de telefone brasileiro: (79) 99999-9999 ou (79) 3999-9999.
const mascararTelefone = (texto) => {
  const n = texto.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  const corte = n.length > 10 ? 7 : 6;
  return `(${n.slice(0, 2)}) ${n.slice(2, corte)}-${n.slice(corte)}`;
};

// Regras de cada campo do passo 1. Devolvem a mensagem de erro ou ''.
const hoje = new Date().toISOString().slice(0, 10);
const REGRAS = {
  'f-estudante': (v) => (!v || v.length < 3 ? 'Escreva o nome do estudante.' : ''),
  'f-nascimento': (v) => (!v ? 'Informe a data de nascimento.' : v > hoje ? 'A data de nascimento não pode ser no futuro.' : v < '1990-01-01' ? 'Confira a data de nascimento.' : ''),
  'f-responsavel': (v) => (!v ? 'Escreva o seu nome.' : ''),
  'f-telefone': (v) => ((v || '').replace(/\D/g, '').length < 10 ? 'Escreva um telefone com DDD, por exemplo (79) 99999-9999.' : '')
};
const mostrarErroCampo = (campo, mensagem) => {
  const erro = main.querySelector('#erro-passo');
  if (mensagem) { campo.setAttribute('aria-invalid', 'true'); campo.setAttribute('aria-describedby', 'erro-passo'); erro.textContent = mensagem; } else {
    campo.removeAttribute('aria-invalid');
    if (erro.dataset.campo === campo.id || !erro.dataset.campo) erro.textContent = '';
  }
  erro.dataset.campo = mensagem ? campo.id : '';
};

// Devolve { erro, campo }: a primeira mensagem do passo e o id do campo com problema (para receber o foco).
function validar() {
  if (passo === 1) {
    const dados = { 'f-estudante': d.estudante, 'f-nascimento': d.nascimento, 'f-responsavel': d.responsavel, 'f-telefone': d.telefone };
    for (const [id, regra] of Object.entries(REGRAS)) { const erro = regra(dados[id]); if (erro) return { erro, campo: id }; }
    if (!d.tipo) return { erro: 'Escolha se é a primeira vez na rede ou se vem de outra escola.', campo: null };
  }
  if (passo === 2 && !d.serie) return { erro: 'Escolha a série.', campo: null };
  if (passo === 3 && !d.escolaId) return { erro: 'Escolha uma escola que tenha vaga.', campo: null };
  if (passo === 4 && !d.documentos) return { erro: 'Marque a caixa quando tiver os documentos.', campo: 'f-documentos' };
  return { erro: '', campo: null };
}

async function enviarPedido() {
  const pedidos = await matriculas();
  d.protocolo = await novoProtocolo('MAT');
  pedidos.unshift({ protocolo: d.protocolo, estudante: d.estudante, responsavel: d.responsavel, serie: d.serie, tipo: d.tipo === 'transferencia' ? 'Transferência' : 'Matrícula nova', escolaId: d.escolaId, situacao: 'Aguardando confirmação', data: hojeBR(), meu: !BALCAO, origem: MODO });
  await salvar('matriculas', pedidos);
  base.vagas[d.escolaId][d.serie] -= 1; // reserva a vaga até a escola confirmar ou recusar
  await salvar('vagas', base.vagas);
  await registrarAcao(BALCAO ? 'Secretaria escolar' : 'Família', BALCAO ? 'Registrou matrícula no atendimento presencial' : 'Pediu matrícula', d.protocolo);
}

main.addEventListener('click', async (e) => {
  const alvo = e.target.closest('button');
  if (!alvo) return;
  if ('rematricular' in alvo.dataset) {
    alvo.disabled = true; alvo.setAttribute('aria-busy', 'true');
    try { await enviarRematricula(); } catch { desenharRematricula('A rematrícula não foi enviada e nenhuma vaga foi reservada. Confira a conexão e confirme de novo.'); return; }
    passo = 6;
    desenhar();
    window.scrollTo(0, 0);
    return;
  }
  if (alvo.dataset.tipo) { guardarCampos(); d.tipo = alvo.dataset.tipo; desenhar(); }
  if (alvo.dataset.serie) { d.serie = alvo.dataset.serie; d.escolaId = null; desenhar(); }
  if (alvo.dataset.escola) { d.escolaId = alvo.dataset.escola; desenhar(); }
  if ('outroAparelho' in alvo.dataset) { guardarCampos(); compartilharRascunho(); return; }
  if ('voltar' in alvo.dataset) { guardarCampos(); avisoRascunho = ''; passo -= 1; desenhar(); }
  if ('avancar' in alvo.dataset) {
    guardarCampos();
    const { erro, campo } = validar();
    if (erro) { desenhar(erro, campo); return; }
    if (passo === 5) {
      alvo.disabled = true; alvo.setAttribute('aria-busy', 'true');
      try { await enviarPedido(); } catch { desenhar('O pedido não foi enviado e nenhuma vaga foi reservada. Confira a conexão e clique em Enviar pedido de novo.'); return; }
    }
    passo += 1;
    avisoRascunho = '';
    desenhar();
    window.scrollTo(0, 0);
  }
});

// "Continuar em outro aparelho": link e QR Code com o rascunho no fragmento do endereço.
async function compartilharRascunho() {
  const codigo = await codificarRascunho(d, passo);
  const endereco = `${new URL('familia/matricula.html', RAIZ).href}#rascunho=${codigo}`;
  const html = `
    <h2 id="janela-titulo" class="esp-t-0">Continuar em outro aparelho</h2>
    <p>Envie este link ou mostre o QR Code para a pessoa que vai ajudar. A matrícula abre no mesmo passo, com o que já foi preenchido.</p>
    <div class="qr-rascunho" data-qr></div>
    <div class="campo"><label for="rascunho-link">Link da matrícula</label><input id="rascunho-link" class="entrada" type="text" readonly value="${esc(endereco)}"></div>
    <p class="texto-suave texto-pequeno">O link leva os dados do estudante e do responsável. Envie só para quem vai ajudar. Documentos anexados não vão no link.</p>
    <p id="rascunho-aviso" class="texto-pequeno" role="status"></p>
    <div class="linha-botoes fim">
      ${navigator.share ? '<button type="button" class="botao botao-secundario" data-acao="compartilhar">Compartilhar</button>' : ''}
      <button type="button" class="botao botao-secundario" data-acao="copiar">Copiar link</button>
      <button type="button" class="botao" data-acao="fechar">Fechar</button>
    </div>`;
  const fim = abrirJanela(html, {
    foco: '#rascunho-link',
    aoClicar(e, fechar) {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      const aviso = e.currentTarget.querySelector('#rascunho-aviso');
      if (acao === 'fechar') fechar(true);
      if (acao === 'copiar') {
        navigator.clipboard?.writeText(endereco).then(() => { aviso.textContent = 'Link copiado.'; }, () => { aviso.textContent = 'Não foi possível copiar. Selecione o link e copie manualmente.'; });
        if (!navigator.clipboard) { e.currentTarget.querySelector('#rascunho-link').select(); aviso.textContent = 'Link selecionado. Use Copiar do seu aparelho.'; }
      }
      if (acao === 'compartilhar') navigator.share({ title: 'Matrícula na rede estadual de Sergipe', url: endereco }).catch(() => {});
    }
  });
  const caixa = document.querySelector('dialog.janela [data-qr]');
  const ok = endereco.length < 1800 && (await qrParaElemento(caixa, endereco));
  if (!ok) { caixa.textContent = ''; document.querySelector('#rascunho-aviso').textContent = endereco.length >= 1800 ? 'O link é longo demais para um QR Code. Envie o link em texto.' : 'O QR Code não carregou. Envie o link em texto.'; }
  await fim;
}
// Validação enquanto a pessoa preenche: máscara do telefone, erro ao sair do campo e limpeza ao corrigir.
main.addEventListener('input', (e) => {
  const campo = e.target;
  if (campo.id === 'f-telefone') campo.value = mascararTelefone(campo.value);
  if (REGRAS[campo.id] && campo.getAttribute('aria-invalid') && !REGRAS[campo.id](campo.value.trim())) mostrarErroCampo(campo, '');
});
main.addEventListener('focusout', (e) => {
  const campo = e.target;
  if (REGRAS[campo.id]) mostrarErroCampo(campo, REGRAS[campo.id](campo.value.trim()));
});
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-cidade') { d.cidade = e.target.value; d.escolaId = null; desenhar(); }
});
preparar();
