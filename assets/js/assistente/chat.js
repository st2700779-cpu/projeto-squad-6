// Interface do assistente (wireframes W6–W12; fluxo W17): botão flutuante, painel, estados e mensagens.
// No celular o painel ocupa a tela inteira; no desktop fica como coluna à direita.
import { esc, icone, $ } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { link } from '../app.js';
import { MSG, SUGESTOES, ACOES, SEGUIMENTOS } from './mensagens.js';
import { perguntar, modoSemIA, segundosDeCota } from './servicoIA.js';
import { responderSemIA } from './faqLocal.js';
import { pareceDadoPessoal } from './dadosPessoais.js';
import { podeOuvir, ouvir, pararDeOuvir, estaOuvindo } from './voz.js';

const LIMITE = 300;
const SIMULACAO = new URLSearchParams(location.search).get('simular') || window.APP_CONFIG?.simular || '';

export function montarAssistente({ perfil }) {
  const historico = [];
  let enviando = false;
  let ultimaPergunta = '';
  const comuns = SUGESTOES[perfil] || SUGESTOES.familia;

  const abrirBotao = document.createElement('button');
  abrirBotao.type = 'button';
  abrirBotao.className = 'assistente-botao';
  abrirBotao.setAttribute('aria-controls', 'assistente');
  abrirBotao.setAttribute('aria-expanded', 'false');
  abrirBotao.innerHTML = `${icone('conversa', 24)}<span>Tirar dúvida</span>`;

  const painel = document.createElement('aside');
  painel.id = 'assistente';
  painel.className = 'assistente-painel';
  painel.hidden = true;
  painel.setAttribute('aria-labelledby', 'assistente-titulo');
  const avisoModo = modoSemIA() ? MSG.modoSemIA : (SIMULACAO ? `Modo de simulação ativo: “${SIMULACAO}”. Nenhuma pergunta vai para a IA.` : '');
  painel.innerHTML = `
    <div class="assistente-topo">
      <span class="assistente-logo" aria-hidden="true">${icone('conversa', 22)}</span>
      <strong id="assistente-titulo">Assistente</strong>
      <button type="button" class="icone-botao fechar" data-fechar aria-label="Fechar assistente">${icone('fechar', 26)}</button>
    </div>
    ${avisoModo ? `<p class="modo-aviso">${esc(avisoModo)}</p>` : ''}
    <div class="assistente-mensagens" aria-live="polite"></div>
    <p class="erro" id="assistente-erro" role="alert"></p>
    <form class="assistente-rodape">
      <label for="assistente-pergunta" class="sr-only">Sua pergunta</label>
      <input id="assistente-pergunta" class="entrada" type="text" maxlength="${LIMITE + 50}" autocomplete="off" enterkeyhint="send" placeholder="Escreva sua dúvida" aria-describedby="assistente-erro">
      ${podeOuvir() ? `<button type="button" class="icone-botao" data-microfone aria-label="Falar a pergunta">${icone('microfone', 24)}</button>` : ''}
      <button type="submit" class="icone-botao enviar" aria-label="Enviar pergunta">${icone('enviar', 24)}</button>
    </form>`;
  document.body.append(abrirBotao, painel);

  const lista = $('.assistente-mensagens', painel);
  const campo = $('#assistente-pergunta', painel);
  const erroCampo = $('#assistente-erro', painel);

  // W7: saudação com Ouvir, perguntas comuns e aviso de dados pessoais.
  function boasVindas() {
    adicionarAssistente(MSG.saudacao, { fonte: false });
    const bloco = document.createElement('div');
    bloco.className = 'boas-vindas';
    bloco.innerHTML = `<strong>Perguntas comuns</strong>${chips(comuns, 'coluna')}
      <p class="aviso-dados">${icone('info', 22)}<span>${esc(MSG.avisoDados)}</span></p>`;
    lista.appendChild(bloco);
  }
  const chips = (perguntas, forma = '') => `<div class="sugestoes ${forma}">${perguntas.map((s) => `<button type="button" data-sugestao="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  function limparSugestoes() { lista.querySelectorAll('.boas-vindas, .sugestoes-soltas').forEach((el) => el.remove()); }
  function mostrarSugestoes(perguntas) {
    if (!perguntas?.length) return;
    const el = document.createElement('div');
    el.className = 'sugestoes-soltas';
    el.innerHTML = chips(perguntas);
    lista.appendChild(el);
    rolar();
  }

  function abrir() {
    painel.hidden = false;
    abrirBotao.hidden = true;
    abrirBotao.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('assistente-aberto');
    if (!lista.children.length) boasVindas();
    campo.focus();
  }
  function fechar() {
    pararDeOuvir();
    painel.hidden = true;
    abrirBotao.hidden = false;
    abrirBotao.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('assistente-aberto');
    abrirBotao.focus();
  }
  function rolar() { lista.scrollTop = lista.scrollHeight; }
  function bolha(classe, html) {
    const el = document.createElement('div');
    el.className = `msg ${classe}`;
    el.innerHTML = html;
    lista.appendChild(el);
    rolar();
    return el;
  }
  function adicionarUsuario(texto) { bolha('msg-usuario', `<span>${esc(texto)}</span>`); }
  function adicionarAssistente(texto, { acao = null, fonte = true, semIA = false } = {}) {
    const destino = acao && ACOES[acao];
    // "Contato da escola" é um encaminhamento, não a ação principal: botão contornado (W10).
    const classe = acao === 'contato' ? 'botao botao-secundario' : 'botao botao-ia';
    bolha('msg-assistente', `
      ${semIA ? `<span class="rotulo-sem-ia">${esc(MSG.semIA)}</span>` : ''}
      <span>${esc(texto)}</span>
      <div class="linha-botoes">${botaoOuvir(texto)}${destino ? `<a class="${classe}" href="${link(destino[0])}">${acao === 'contato' ? '' : icone('seta', 20)}${esc(destino[1])}</a>` : ''}</div>
      ${fonte ? `<span class="fonte">${esc(MSG.fonte)}</span>` : ''}`);
  }
  // Perguntas frequentes locais: mesma base, sem IA (saída de todas as falhas no fluxo W17).
  async function responderPelasFrequentes(pergunta) {
    try {
      const item = await responderSemIA(pergunta);
      adicionarAssistente(item ? item.resposta : MSG.semResposta, { semIA: true, acao: item ? null : 'contato' });
    } catch {
      adicionarAssistente(MSG.semResposta, { semIA: true, acao: 'contato' });
    }
  }
  function bloquear(sim) {
    enviando = sim;
    campo.disabled = sim;
    painel.querySelectorAll('.assistente-rodape button, .sugestoes button').forEach((b) => { b.disabled = sim; });
    campo.placeholder = sim ? 'Aguarde a resposta…' : 'Escreva sua dúvida';
  }

  async function enviar(texto, { reenvio = false } = {}) {
    if (enviando) return;
    const pergunta = texto.trim();
    erroCampo.textContent = '';
    if (!pergunta) { erroCampo.textContent = MSG.erros.ENTRADA_VAZIA; campo.focus(); return; }
    if (pergunta.length > LIMITE) { erroCampo.textContent = MSG.erros.ENTRADA_LONGA; campo.focus(); return; }
    if (pareceDadoPessoal(pergunta)) {
      campo.value = '';
      bolha('msg-falha', `<span>${esc(MSG.erros.DADO_PESSOAL)}</span>`);
      return;
    }
    campo.value = '';
    ultimaPergunta = pergunta;
    limparSugestoes();
    if (!reenvio) adicionarUsuario(pergunta);
    bloquear(true);
    const controle = new AbortController();
    const espera = bolha('msg-assistente', `<span><span class="pontos"><i></i><i></i><i></i></span>${esc(MSG.carregando)}</span>
      <div><button type="button" class="botao botao-secundario" data-cancelar>Cancelar</button></div>`);
    const dica = document.createElement('p');
    dica.className = 'dica-espera';
    dica.textContent = MSG.esperaMaxima;
    espera.after(dica);
    espera.querySelector('[data-cancelar]').addEventListener('click', () => controle.abort());

    const tentar = async (vez) => {
      try {
        return await perguntar(pergunta, perfil, historico, controle.signal);
      } catch (e) {
        if (vez === 1 && ['SEM_CONEXAO', 'SERVICO_INDISPONIVEL'].includes(e.codigo) && !controle.signal.aborted) {
          await new Promise((ok) => setTimeout(ok, 2000));
          if (controle.signal.aborted) throw Object.assign(new Error('CANCELADO'), { codigo: 'CANCELADO' });
          return tentar(2);
        }
        throw e;
      }
    };

    try {
      const r = await tentar(1);
      espera.remove(); dica.remove();
      adicionarAssistente(r.resposta, { acao: r.acao });
      historico.push({ papel: 'usuario', texto: pergunta }, { papel: 'assistente', texto: r.resposta });
      mostrarSugestoes(SEGUIMENTOS[r.acao]);
    } catch (e) {
      espera.remove(); dica.remove();
      if (e.codigo === 'CANCELADO') { /* o usuário desistiu: volta ao estado inicial sem mensagem de erro */ }
      else if (e.codigo === 'NAO_CONFIGURADO') await responderPelasFrequentes(pergunta);
      else { mostrarFalha(e.codigo); await responderPelasFrequentes(pergunta); }
    } finally {
      bloquear(false);
      campo.focus();
    }
  }

  // W11: falha com "Tentar de novo" e "Perguntas frequentes"; na cota, o botão espera 60 s.
  function mostrarFalha(codigo) {
    const podeTentar = codigo !== 'PAUSADO';
    const el = bolha('msg-falha', `
      <span class="falha-titulo">${icone('alerta', 24)}<strong>${esc(MSG.erros[codigo] || MSG.erros.SERVICO_INDISPONIVEL)}</strong></span>
      <span>${esc(MSG.dica)}</span>
      <div class="linha-botoes">${podeTentar ? '<button type="button" class="botao" data-tentar>Tentar de novo</button>' : ''}<button type="button" class="botao botao-secundario" data-frequentes>Perguntas frequentes</button></div>`);
    el.querySelector('[data-frequentes]').addEventListener('click', () => mostrarSugestoes(comuns));
    const b = el.querySelector('[data-tentar]');
    if (!b) return;
    b.addEventListener('click', () => enviar(ultimaPergunta, { reenvio: true }));
    if (codigo === 'LIMITE_COTA') {
      const atualizar = () => {
        const s = segundosDeCota();
        b.disabled = s > 0;
        b.textContent = s > 0 ? `Tentar de novo (${s} s)` : 'Tentar de novo';
        if (s > 0) setTimeout(atualizar, 1000);
      };
      atualizar();
    }
  }

  // W12: escuta com microfone grande e confirmação "Entendi assim… Está certo?".
  function iniciarVoz() {
    // Segundo toque no microfone para a escuta em vez de abrir outra tela "Estou ouvindo…".
    if (estaOuvindo()) { pararDeOuvir(); return; }
    const mic = painel.querySelector('[data-microfone]');
    erroCampo.textContent = '';
    const escuta = bolha('escuta', `<span class="escuta-mic" aria-hidden="true">${icone('microfone', 56)}</span>
      <strong class="escuta-titulo">Estou ouvindo…</strong><span class="texto-suave">Fale sua pergunta devagar.</span>
      <button type="button" class="botao botao-secundario" data-parar>Parar</button>`);
    escuta.querySelector('[data-parar]').addEventListener('click', pararDeOuvir);
    mic?.classList.add('ouvindo');
    ouvir({
      aoEntender: (texto) => {
        escuta.className = 'msg confirmacao-voz';
        escuta.innerHTML = `<span class="texto-suave negrito">Entendi assim:</span><strong class="escuta-titulo">“${esc(texto)}”</strong><span>Está certo?</span>
          <div class="linha-botoes"><button type="button" class="botao" data-sim>Sim, enviar</button><button type="button" class="botao botao-secundario" data-de-novo>Falar de novo</button></div>`;
        escuta.querySelector('[data-sim]').addEventListener('click', () => { escuta.remove(); enviar(texto); });
        escuta.querySelector('[data-de-novo]').addEventListener('click', () => { escuta.remove(); iniciarVoz(); });
        rolar();
      },
      aoFalhar: (codigo) => { escuta.remove(); erroCampo.textContent = MSG.erros[codigo] || MSG.erros.VOZ_NAO_ENTENDIDA; },
      aoTerminar: () => { mic?.classList.remove('ouvindo'); if (escuta.querySelector('[data-parar]')) escuta.remove(); }
    });
  }

  abrirBotao.addEventListener('click', abrir);
  painel.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fechar();
    const s = e.target.closest('[data-sugestao]');
    if (s) enviar(s.dataset.sugestao);
    if (e.target.closest('[data-microfone]')) iniciarVoz();
  });
  painel.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  $('.assistente-rodape', painel).addEventListener('submit', (e) => { e.preventDefault(); enviar(campo.value); });
  if (new URLSearchParams(location.search).has('assistente')) abrir();
}
